import json
import uuid

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from app.dependencies import get_battle_service, get_current_user
from app.domain.user import UserDomain
from app.exceptions import UnauthorizedError, ForbiddenError, DomainValidationError
from app.schemas.battle import BattleCreate, BattleJoin, BattleOut
from app.security import decode_access_token
from app.services.battle import BattleService
from app.redis import get_redis
from app.battle.state import save_state, load_state
from app.battle.engine import run_effects
from app.battle.manager import ConnectionManager

router = APIRouter(prefix="/battles", tags=["battles"])
manager = ConnectionManager()


@router.post("", response_model=BattleOut, status_code=201)
async def create_battle(
    body: BattleCreate,
    svc: BattleService = Depends(get_battle_service),
    current_user: UserDomain = Depends(get_current_user),
):
    return await svc.create(current_user.id, body)


@router.get("/{battle_id}", response_model=BattleOut)
async def get_battle(
    battle_id: uuid.UUID,
    svc: BattleService = Depends(get_battle_service),
    current_user: UserDomain = Depends(get_current_user),
):
    return await svc.get_or_404(battle_id)


@router.post("/{battle_id}/join", response_model=BattleOut)
async def join_battle(
    battle_id: uuid.UUID,
    body: BattleJoin,
    svc: BattleService = Depends(get_battle_service),
    current_user: UserDomain = Depends(get_current_user),
):
    return await svc.join(battle_id, current_user.id, body)


@router.websocket("/{battle_id}/ws")
async def battle_ws(
    battle_id: uuid.UUID,
    ws: WebSocket,
    token: str,
    svc: BattleService = Depends(get_battle_service),
):
    try:
        user_id = uuid.UUID(decode_access_token(token))
    except Exception:
        await ws.close(code=4001)
        return

    try:
        battle_domain = await svc.validate_ws_participant(battle_id, user_id)
    except (UnauthorizedError, ForbiddenError, DomainValidationError):
        await ws.close(code=4002)
        return

    actor = battle_domain.get_actor(user_id)
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

            async def _finish_turn():
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
                    await svc.mark_done(battle_id, user_id)
                    await save_state(redis, state)
                    await manager.broadcast(str(battle_id), {
                        "type": "game_over",
                        "data": {"winner": actor},
                    })
                    return True
                await save_state(redis, state)
                await manager.broadcast(str(battle_id), {"type": "state", "data": state.model_dump()})
                return False

            if action == "play_card":
                card_id = msg.get("card_id")
                hand = getattr(state, f"hand_{actor}")
                if not card_id or card_id not in hand:
                    await ws.send_text(json.dumps({"type": "error", "detail": "Card not in hand"}))
                    continue
                hand.remove(card_id)
                effects = await svc.get_card_effects(uuid.UUID(card_id))
                if effects:
                    run_effects(effects, trigger="on_play", state=state, actor=actor)
                if await _finish_turn():
                    break

            elif action == "attack":
                value = msg.get("value", 10)
                cur_hp = getattr(state, f"hp_{opponent}")
                setattr(state, f"hp_{opponent}", max(0, cur_hp - value))
                card_id = msg.get("card_id")
                if card_id:
                    effects = await svc.get_card_effects(uuid.UUID(card_id))
                    if effects:
                        run_effects(effects, trigger="on_attack", state=state, actor=actor)
                if await _finish_turn():
                    break

            elif action == "end_turn":
                if await _finish_turn():
                    break

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(str(battle_id), ws)
