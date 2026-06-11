import json
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies import get_db, get_current_user
from app.models.battle import Battle, BattleStatus
from app.models.card import Card
from app.models.deck import Deck
from app.models.game import Game
from app.models.user import User
from app.schemas.battle import BattleCreate, BattleJoin, BattleOut
from app.redis import get_redis
from app.battle.state import init_battle_state, save_state, load_state
from app.battle.engine import run_effects
from app.battle.manager import ConnectionManager

router = APIRouter(prefix="/battles", tags=["battles"])
manager = ConnectionManager()


@router.post("", response_model=BattleOut, status_code=201)
async def create_battle(
    body: BattleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    game_r = await db.execute(select(Game).where(Game.id == body.game_id))
    game = game_r.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    deck_r = await db.execute(select(Deck).where(Deck.id == body.deck_id))
    deck = deck_r.scalar_one_or_none()
    if not deck or deck.owner_id != current_user.id or deck.game_id != body.game_id:
        raise HTTPException(status_code=400, detail="Invalid deck")

    battle = Battle(
        id=uuid.uuid4(),
        game_id=body.game_id,
        player_a_id=current_user.id,
        deck_a_id=body.deck_id,
        status=BattleStatus.waiting,
    )
    db.add(battle)
    await db.commit()
    await db.refresh(battle)
    return battle


@router.get("/{battle_id}", response_model=BattleOut)
async def get_battle(
    battle_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = await db.execute(select(Battle).where(Battle.id == battle_id))
    battle = r.scalar_one_or_none()
    if not battle:
        raise HTTPException(status_code=404, detail="Battle not found")
    return battle


@router.post("/{battle_id}/join", response_model=BattleOut)
async def join_battle(
    battle_id: uuid.UUID,
    body: BattleJoin,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = await db.execute(select(Battle).where(Battle.id == battle_id))
    battle = r.scalar_one_or_none()
    if not battle:
        raise HTTPException(status_code=404, detail="Battle not found")
    if battle.status != BattleStatus.waiting:
        raise HTTPException(status_code=400, detail="Battle not in waiting state")
    if battle.player_a_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot join your own battle")

    deck_r = await db.execute(select(Deck).where(Deck.id == body.deck_id))
    deck = deck_r.scalar_one_or_none()
    if not deck or deck.owner_id != current_user.id or deck.game_id != battle.game_id:
        raise HTTPException(status_code=400, detail="Invalid deck")

    deck_a_r = await db.execute(select(Deck).where(Deck.id == battle.deck_a_id))
    deck_a = deck_a_r.scalar_one()
    game_r = await db.execute(select(Game).where(Game.id == battle.game_id))
    game = game_r.scalar_one()

    battle.player_b_id = current_user.id
    battle.deck_b_id = body.deck_id
    battle.status = BattleStatus.playing
    battle.started_at = datetime.utcnow()
    await db.commit()
    await db.refresh(battle)

    redis = await get_redis()
    ruleset = game.ruleset
    state = init_battle_state(
        battle_id=str(battle.id),
        deck_a_card_ids=[str(c) for c in deck_a.card_ids],
        deck_b_card_ids=[str(c) for c in deck.card_ids],
        swap_interval=ruleset.get("swap_interval", 3),
        initial_hp=100,
        initial_resource=ruleset.get("initial_resource", 1),
    )
    await save_state(redis, state)
    return battle


@router.websocket("/{battle_id}/ws")
async def battle_ws(
    battle_id: uuid.UUID,
    ws: WebSocket,
    token: str,
    db: AsyncSession = Depends(get_db),
):
    from app.services.auth import decode_access_token

    try:
        user_id = decode_access_token(token)
    except Exception:
        await ws.close(code=4001)
        return

    user_r = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = user_r.scalar_one_or_none()
    if not user:
        await ws.close(code=4001)
        return

    battle_r = await db.execute(select(Battle).where(Battle.id == battle_id))
    battle = battle_r.scalar_one_or_none()
    if not battle or battle.status != BattleStatus.playing:
        await ws.close(code=4002)
        return

    if user.id not in (battle.player_a_id, battle.player_b_id):
        await ws.close(code=4003)
        return

    actor = "a" if user.id == battle.player_a_id else "b"
    await manager.connect(str(battle_id), ws)
    redis = await get_redis()

    try:
        state = await load_state(redis, str(battle_id))
        if state:
            await ws.send_text(json.dumps({"type": "state", "data": state.model_dump()}))

        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            action = msg.get("action")

            state = await load_state(redis, str(battle_id))
            if not state:
                break

            if state.active_player != actor:
                await ws.send_text(json.dumps({"type": "error", "detail": "Not your turn"}))
                continue

            opponent = "b" if actor == "a" else "a"

            if action == "attack":
                value = msg.get("value", 10)
                cur_hp = getattr(state, f"hp_{opponent}")
                setattr(state, f"hp_{opponent}", max(0, cur_hp - value))

                card_id = msg.get("card_id")
                if card_id:
                    card_r = await db.execute(select(Card).where(Card.id == uuid.UUID(card_id)))
                    card = card_r.scalar_one_or_none()
                    if card:
                        run_effects(card.effects or [], trigger="on_attack", state=state, actor=actor)

                state.turn_number += 1
                state.active_player = opponent

                if state.should_swap():
                    state.perform_swap()
                    await save_state(redis, state)
                    await manager.broadcast(str(battle_id), {
                        "type": "swap",
                        "data": {"deck_for_a": state.deck_for_a, "deck_for_b": state.deck_for_b},
                    })

                if getattr(state, f"hp_{opponent}") <= 0:
                    battle.status = BattleStatus.done
                    battle.winner_id = user.id
                    battle.ended_at = datetime.utcnow()
                    await db.commit()
                    await save_state(redis, state)
                    await manager.broadcast(str(battle_id), {
                        "type": "game_over",
                        "data": {"winner": actor},
                    })
                    break

                await save_state(redis, state)
                await manager.broadcast(str(battle_id), {"type": "state", "data": state.model_dump()})

            elif action == "end_turn":
                state.turn_number += 1
                state.active_player = opponent
                if state.should_swap():
                    state.perform_swap()
                    await manager.broadcast(str(battle_id), {
                        "type": "swap",
                        "data": {"deck_for_a": state.deck_for_a, "deck_for_b": state.deck_for_b},
                    })
                await save_state(redis, state)
                await manager.broadcast(str(battle_id), {"type": "state", "data": state.model_dump()})

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(str(battle_id), ws)
