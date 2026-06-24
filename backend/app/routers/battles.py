import json
import uuid

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from app.dependencies import get_battle_service, get_current_user
from app.domain.user import UserDomain
from app.exceptions import UnauthorizedError, ForbiddenError, DomainValidationError
from app.schemas.battle import BattleCreate, BattleOut
from app.security import decode_access_token
from app.services.battle import BattleService
from app.redis import get_redis
from app.battle.state import save_state, load_state, BattleState, PendingTrigger, PendingDiscard
from app.battle.engine import resolve_effect, needs_target_seat
from app.battle.manager import ConnectionManager

router = APIRouter(prefix="/battles", tags=["battles"])
manager = ConnectionManager()

EFFECT_LABELS = {
    "draw": lambda v: f"{v}장 드로우",
    "discard": lambda v: f"{v}장 버리기",
    "steal": lambda v: f"{v}장 빼앗기",
    "give": lambda v: f"{v}장 주기",
}


def _effect_summary(card) -> str | None:
    if not card or card.effect_type == "none" or card.effect_value <= 0:
        return None
    label = EFFECT_LABELS.get(card.effect_type)
    return label(card.effect_value) if label else None


def _state_view(state: BattleState, viewer: int) -> dict:
    d = state.model_dump()
    d["hands"] = [hand if i == viewer else [None] * len(hand) for i, hand in enumerate(state.hands)]
    d["trap_zones"] = [tz if i == viewer else [None] * len(tz) for i, tz in enumerate(state.trap_zones)]
    d["shared_deck"] = [None] * len(d["shared_deck"])
    return d


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
    svc: BattleService = Depends(get_battle_service),
    current_user: UserDomain = Depends(get_current_user),
):
    return await svc.join(battle_id, current_user.id)


@router.post("/{battle_id}/start", response_model=BattleOut)
async def start_battle(
    battle_id: uuid.UUID,
    svc: BattleService = Depends(get_battle_service),
    current_user: UserDomain = Depends(get_current_user),
):
    return await svc.start(battle_id, current_user.id)


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
    num_players = battle_domain.num_players()
    await manager.connect(str(battle_id), ws, actor)
    redis = await get_redis()

    async def _err(detail: str):
        await ws.send_text(json.dumps({"type": "error", "detail": detail}))

    async def _broadcast_state(state: BattleState):
        for room_ws, viewer in list(manager.rooms.get(str(battle_id), [])):
            try:
                await room_ws.send_text(json.dumps({"type": "state", "data": _state_view(state, viewer)}))
            except Exception:
                pass

    async def _finish_turn(state: BattleState, acted_by: int) -> bool:
        state.turn_number += 1
        state.active_seat = state.next_seat(acted_by)
        state.has_acted_this_turn = False
        state.trap_installed_this_turn = False

        new_active = state.active_seat
        hand_len = len(state.hands[new_active])
        if hand_len >= state.win_hand_size:
            winner_user_id = next(p.user_id for p in battle_domain.players if p.seat_index == new_active)
            await svc.mark_done(battle_id, winner_user_id)
            await save_state(redis, state)
            await manager.broadcast(str(battle_id), {"type": "game_over", "data": {"winner": new_active}})
            return True

        await save_state(redis, state)
        await _broadcast_state(state)
        return False

    async def _queue_discards(state: BattleState, obligations: list[tuple[int, int]], finish_actor: int | None) -> None:
        state.pending_discards = [PendingDiscard(seat=s, count=c) for s, c in obligations]
        state.discard_finish_actor = finish_actor
        await save_state(redis, state)
        await manager.broadcast(str(battle_id), {
            "type": "discard_required",
            "data": {"obligations": [{"seat": s, "count": c} for s, c in obligations]},
        })
        await _broadcast_state(state)

    def _resolve_counterparty(card, msg_target_seat) -> tuple[bool, int | None, str | None]:
        """반환: (ok, counterparty_seat_or_None, error_message_or_None)"""
        requires = needs_target_seat(card, num_players)
        if msg_target_seat is not None:
            if not isinstance(msg_target_seat, int) or not (0 <= msg_target_seat < num_players):
                return False, None, "잘못된 대상입니다"
            if msg_target_seat == actor:
                return False, None, "자신을 대상으로 지정할 수 없습니다"
            return True, msg_target_seat, None
        if requires:
            return False, None, "대상을 지정해주세요"
        if card.effect_target != "all" and (card.effect_target == "opponent" or card.effect_type in ("steal", "give")):
            # 2인전: 상대가 단 한 명이므로 자동 지정
            return True, (1 - actor) if num_players == 2 else None, None
        return True, None, None

    try:
        state = await load_state(redis, str(battle_id))
        if state:
            await ws.send_text(json.dumps({"type": "state", "data": _state_view(state, actor)}))

        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            action = msg.get("action")

            state = await load_state(redis, str(battle_id))
            if not state:
                break

            if state.pending_discards and action not in ("choose_discard", "forfeit"):
                await _err("버릴 카드를 먼저 선택해주세요")
                continue

            if action == "choose_discard":
                card_ids = msg.get("card_ids") or []
                owed = next((pd for pd in state.pending_discards if pd.seat == actor), None)
                if owed is None:
                    await _err("버릴 카드가 없습니다")
                    continue
                if len(card_ids) != owed.count or len(set(card_ids)) != len(card_ids):
                    await _err(f"정확히 {owed.count}장을 선택해주세요")
                    continue
                hand = state.hands[actor]
                if any(cid not in hand for cid in card_ids):
                    await _err("손패에 없는 카드입니다")
                    continue
                for cid in card_ids:
                    hand.remove(cid)
                    state.discard_pile.append(cid)
                state.pending_discards = [pd for pd in state.pending_discards if pd.seat != actor]
                await manager.broadcast(str(battle_id), {"type": "discard_chosen", "data": {"seat": actor, "count": owed.count}})

                if state.pending_discards:
                    await save_state(redis, state)
                    await _broadcast_state(state)
                    continue

                finish_actor = state.discard_finish_actor
                state.discard_finish_actor = None
                if finish_actor is not None:
                    if await _finish_turn(state, finish_actor):
                        break
                else:
                    await save_state(redis, state)
                    await _broadcast_state(state)
                continue

            if action == "forfeit":
                if num_players == 2:
                    winner_seat = 1 - actor
                    winner_user_id = next(p.user_id for p in battle_domain.players if p.seat_index == winner_seat)
                    await svc.mark_done(battle_id, winner_user_id)
                    await manager.broadcast(str(battle_id), {
                        "type": "game_over",
                        "data": {"winner": winner_seat, "forfeited_by": actor},
                    })
                else:
                    await svc.mark_done(battle_id, None)
                    await manager.broadcast(str(battle_id), {
                        "type": "game_over",
                        "data": {"winner": None, "forfeited_by": actor},
                    })
                break

            if action == "set_direction":
                direction = msg.get("direction")
                if direction not in ("cw", "ccw"):
                    await _err("Invalid direction")
                    continue
                state.play_direction = direction
                await save_state(redis, state)
                await _broadcast_state(state)
                continue

            if action == "draw":
                if actor != state.active_seat:
                    await _err("당신 차례가 아닙니다")
                    continue
                if state.has_acted_this_turn:
                    await _err("이미 행동했습니다")
                    continue
                if state.pending_trigger is not None:
                    await _err("대기 중인 액션이 있습니다")
                    continue
                if not state.shared_deck:
                    await _err("더 이상 뽑을 카드가 없습니다")
                    continue
                drawn = state.shared_deck.pop(0)
                state.hands[actor].append(drawn)
                state.has_acted_this_turn = True
                await manager.broadcast(str(battle_id), {"type": "card_drawn", "data": {"actor": actor}})
                if await _finish_turn(state, actor):
                    break
                continue

            if action == "install_trap":
                card_id = msg.get("card_id")
                if actor != state.active_seat:
                    await _err("당신 차례가 아닙니다")
                    continue
                if state.has_acted_this_turn:
                    await _err("행동 후에는 설치할 수 없습니다")
                    continue
                if state.trap_installed_this_turn:
                    await _err("이번 턴에 이미 함정을 설치했습니다")
                    continue
                hand = state.hands[actor]
                if not card_id or card_id not in hand:
                    await _err("카드가 손패에 없습니다")
                    continue
                card = await svc.get_card(uuid.UUID(card_id))
                if not card or card.card_type != "trap":
                    await _err("함정 카드가 아닙니다")
                    continue
                hand.remove(card_id)
                state.trap_zones[actor].append(card_id)
                state.trap_installed_this_turn = True
                await save_state(redis, state)
                await manager.broadcast(str(battle_id), {"type": "trap_installed", "data": {"actor": actor}})
                await _broadcast_state(state)
                continue

            if action == "play_action":
                card_id = msg.get("card_id")
                if actor != state.active_seat:
                    await _err("당신 차례가 아닙니다")
                    continue
                if state.has_acted_this_turn:
                    await _err("이미 행동했습니다")
                    continue
                if state.pending_trigger is not None:
                    await _err("대기 중인 액션이 있습니다")
                    continue
                hand = state.hands[actor]
                if not card_id or card_id not in hand:
                    await _err("카드가 손패에 없습니다")
                    continue
                card = await svc.get_card(uuid.UUID(card_id))
                if not card or card.card_type != "action":
                    await _err("행동 카드가 아닙니다")
                    continue
                ok, counterparty, err_msg = _resolve_counterparty(card, msg.get("target_seat"))
                if not ok:
                    await _err(err_msg)
                    continue
                hand.remove(card_id)
                state.has_acted_this_turn = True
                state.pending_trigger = PendingTrigger(
                    source_type="action", actor=actor, card_id=card_id,
                    has_minigame=card.has_minigame, target_seat=counterparty,
                )
                await save_state(redis, state)
                await manager.broadcast(str(battle_id), {
                    "type": "action_played",
                    "data": {
                        "actor": actor,
                        "card_id": card_id,
                        "card_name": card.name,
                        "effect_text": card.effect_text,
                        "effect_summary": _effect_summary(card),
                        "has_minigame": card.has_minigame,
                        "target_seat": counterparty,
                    },
                })
                await _broadcast_state(state)
                continue

            if action == "reveal_trap":
                card_id = msg.get("card_id")
                activator = msg.get("activator")
                if state.pending_trigger is not None:
                    await _err("대기 중인 액션이 있습니다")
                    continue
                my_traps = state.trap_zones[actor]
                if not card_id or card_id not in my_traps:
                    await _err("함정이 없습니다")
                    continue
                if not isinstance(activator, int) or not (0 <= activator < num_players):
                    await _err("발동자를 지정해주세요")
                    continue
                card = await svc.get_card(uuid.UUID(card_id))
                if not card or card.card_type != "trap":
                    await _err("함정 카드가 아닙니다")
                    continue
                my_traps.remove(card_id)
                state.pending_trigger = PendingTrigger(
                    source_type="trap", actor=actor, card_id=card_id, activator=activator,
                )
                await save_state(redis, state)
                await manager.broadcast(str(battle_id), {
                    "type": "trap_revealed",
                    "data": {
                        "owner": actor,
                        "activator": activator,
                        "card_name": card.name,
                        "trigger_condition": card.trigger_condition,
                        "effect_text": card.effect_text,
                        "effect_summary": _effect_summary(card),
                    },
                })
                await _broadcast_state(state)
                continue

            if action == "play_counter":
                card_id = msg.get("card_id")
                pt = state.pending_trigger
                if pt is None:
                    await _err("대응할 액션이 없습니다")
                    continue
                if actor == pt.actor:
                    await _err("자신의 행동에는 카운터할 수 없습니다")
                    continue
                if pt.source_type == "action" and pt.has_minigame:
                    await _err("미니게임 카드는 카운터로 막을 수 없습니다")
                    continue
                hand = state.hands[actor]
                if not card_id or card_id not in hand:
                    await _err("카드가 손패에 없습니다")
                    continue
                counter_card = await svc.get_card(uuid.UUID(card_id))
                if not counter_card or counter_card.card_type != "counter":
                    await _err("카운터 카드가 아닙니다")
                    continue
                if pt.source_type == "action" and not counter_card.counters_action:
                    await _err("이 카운터 카드는 행동 카드에 사용할 수 없습니다")
                    continue
                if pt.source_type == "trap" and not counter_card.counters_trap:
                    await _err("이 카운터 카드는 함정 카드에 사용할 수 없습니다")
                    continue
                ok, counterparty, err_msg = _resolve_counterparty(counter_card, msg.get("target_seat"))
                if not ok:
                    await _err(err_msg)
                    continue
                original_card = await svc.get_card(uuid.UUID(pt.card_id))
                hand.remove(card_id)
                state.discard_pile.append(card_id)
                state.discard_pile.append(pt.card_id)
                obligations = resolve_effect(counter_card.effect_type, counter_card.effect_value, "self", actor, state, target_seat=counterparty)
                acted_by, source_type = pt.actor, pt.source_type
                state.pending_trigger = None
                await manager.broadcast(str(battle_id), {
                    "type": "trigger_countered",
                    "data": {
                        "countered_by": actor,
                        "counter_card_name": counter_card.name,
                        "counter_effect_text": counter_card.effect_text,
                        "original_card_name": original_card.name if original_card else "???",
                        "source_type": source_type,
                    },
                })
                if obligations:
                    await _queue_discards(state, obligations, acted_by if source_type == "action" else None)
                    continue
                if source_type == "action":
                    if await _finish_turn(state, acted_by):
                        break
                else:
                    await save_state(redis, state)
                    await _broadcast_state(state)
                continue

            if action == "pass_counter":
                pt = state.pending_trigger
                if pt is None:
                    await _err("대응할 액션이 없습니다")
                    continue
                if actor == pt.actor:
                    await _err("자신의 행동은 패스할 수 없습니다")
                    continue
                original_card = await svc.get_card(uuid.UUID(pt.card_id))
                obligations: list[tuple[int, int]] = []
                if original_card:
                    if pt.source_type == "trap":
                        obligations = resolve_effect(
                            original_card.effect_type, original_card.effect_value, "activator",
                            pt.actor, state, activator=pt.activator, target_seat=pt.actor,
                        )
                    else:
                        obligations = resolve_effect(
                            original_card.effect_type, original_card.effect_value, original_card.effect_target,
                            pt.actor, state, target_seat=pt.target_seat,
                        )
                state.discard_pile.append(pt.card_id)
                acted_by, source_type, trap_activator = pt.actor, pt.source_type, pt.activator
                state.pending_trigger = None

                if source_type == "action":
                    await manager.broadcast(str(battle_id), {
                        "type": "action_resolved",
                        "data": {
                            "actor": acted_by,
                            "card_name": original_card.name if original_card else "???",
                            "effect_text": original_card.effect_text if original_card else None,
                            "effect_summary": _effect_summary(original_card),
                        },
                    })
                    if obligations:
                        await _queue_discards(state, obligations, acted_by)
                        continue
                    if await _finish_turn(state, acted_by):
                        break
                else:
                    await manager.broadcast(str(battle_id), {
                        "type": "trap_resolved",
                        "data": {
                            "owner": acted_by,
                            "activator": trap_activator,
                            "card_name": original_card.name if original_card else "???",
                            "effect_text": original_card.effect_text if original_card else None,
                            "effect_summary": _effect_summary(original_card),
                        },
                    })
                    if obligations:
                        await _queue_discards(state, obligations, None)
                        continue
                    await save_state(redis, state)
                    await _broadcast_state(state)
                continue

            await _err(f"Unknown action: {action}")

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(str(battle_id), ws)
