from typing import Optional
from app.battle.state import BattleState

DiscardObligation = tuple[int, int]  # (seat, count)


def _draw_one(state: BattleState, seat: int) -> None:
    if not state.shared_deck:
        return
    state.hands[seat].append(state.shared_deck.pop(0))


def resolve_effect(
    effect_type: str,
    effect_value: int,
    effect_target: str,
    actor: int,
    state: BattleState,
    activator: Optional[int] = None,
    target_seat: Optional[int] = None,
) -> list[DiscardObligation]:
    """카드 효과를 적용한다. 'discard' 효과는 손패 주인이 직접 고를 카드이므로 즉시 처리하지 않고
    (seat, count) 의무 목록으로 반환한다 — 호출부가 state.pending_discards에 쌓고 선택을 기다려야 한다."""
    if effect_type == "none" or effect_value <= 0:
        return []

    if effect_target == "all":
        all_seats = list(range(state.num_players))
        other_seats = [s for s in all_seats if s != actor]
        if effect_type == "draw":
            for _ in range(effect_value):
                for seat in all_seats:
                    _draw_one(state, seat)
        elif effect_type == "discard":
            return [(seat, min(effect_value, len(state.hands[seat]))) for seat in all_seats if state.hands[seat]]
        elif effect_type == "steal":
            for seat in other_seats:
                for _ in range(effect_value):
                    src = state.hands[seat]
                    if not src:
                        break
                    state.hands[actor].append(src.pop())
        elif effect_type == "give":
            for seat in other_seats:
                for _ in range(effect_value):
                    src = state.hands[actor]
                    if not src:
                        break
                    state.hands[seat].append(src.pop())
        return []

    if effect_target == "activator":
        target = activator if activator is not None else actor
    elif effect_target == "opponent":
        target = target_seat if target_seat is not None else actor
    else:
        target = actor

    if effect_type == "draw":
        for _ in range(effect_value):
            _draw_one(state, target)

    elif effect_type == "discard":
        owed = min(effect_value, len(state.hands[target]))
        return [(target, owed)] if owed > 0 else []

    elif effect_type == "steal":
        counterparty = target_seat if target_seat is not None else target
        src = state.hands[counterparty]
        dst = state.hands[target]
        for _ in range(effect_value):
            if not src:
                break
            dst.append(src.pop())

    elif effect_type == "give":
        counterparty = target_seat if target_seat is not None else target
        src = state.hands[target]
        dst = state.hands[counterparty]
        for _ in range(effect_value):
            if not src:
                break
            dst.append(src.pop())

    return []


def needs_target_seat(card, num_players: int) -> bool:
    """2명 초과이고 효과 대상이 'all'이 아닐 때, 상대(2번째 플레이어)를 명시적으로 지정해야 하는지 여부."""
    if num_players <= 2 or card.effect_target == "all":
        return False
    return card.effect_target == "opponent" or card.effect_type in ("steal", "give")
