from app.battle.state import BattleState

OPS = {
    "<":  lambda a, b: a < b,
    ">":  lambda a, b: a > b,
    "<=": lambda a, b: a <= b,
    ">=": lambda a, b: a >= b,
    "==": lambda a, b: a == b,
    "!=": lambda a, b: a != b,
}


def _resolve_stat(stat: str, state: BattleState, actor: str) -> int | float:
    opponent = "b" if actor == "a" else "a"
    mapping = {
        "self.hp":            getattr(state, f"hp_{actor}"),
        "self.resources":     getattr(state, f"resources_{actor}"),
        "opponent.hp":        getattr(state, f"hp_{opponent}"),
        "opponent.resources": getattr(state, f"resources_{opponent}"),
    }
    if stat not in mapping:
        raise ValueError(f"Unknown stat: {stat}")
    return mapping[stat]


def evaluate_conditions(conditions: list[dict], state: BattleState, actor: str) -> bool:
    for cond in conditions:
        val = _resolve_stat(cond["stat"], state, actor)
        op_fn = OPS.get(cond["op"])
        if op_fn is None:
            raise ValueError(f"Unknown op: {cond['op']}")
        if not op_fn(val, cond["value"]):
            return False
    return True


def apply_action(action: dict, state: BattleState, actor: str) -> None:
    opponent = "b" if actor == "a" else "a"
    t = action["type"]
    v = action.get("value", 0)
    target = action.get("target", "opponent")
    target_player = actor if target == "self" else opponent

    if t == "deal_damage":
        cur = getattr(state, f"hp_{target_player}")
        setattr(state, f"hp_{target_player}", max(0, cur - v))
    elif t == "heal":
        cur = getattr(state, f"hp_{target_player}")
        setattr(state, f"hp_{target_player}", min(state.initial_hp, cur + v))
    elif t == "buff_stat":
        stat = action.get("stat", "resources")
        cur = getattr(state, f"{stat}_{target_player}", 0)
        setattr(state, f"{stat}_{target_player}", cur + v)
    elif t == "debuff_stat":
        stat = action.get("stat", "resources")
        cur = getattr(state, f"{stat}_{target_player}", 0)
        setattr(state, f"{stat}_{target_player}", max(0, cur - v))
    elif t == "draw_card":
        remaining = getattr(state, f"deck_remaining_{target_player}")
        hand = getattr(state, f"hand_{target_player}")
        for _ in range(min(v, len(remaining))):
            hand.append(remaining.pop(0))
    elif t == "discard_card":
        hand = getattr(state, f"hand_{target_player}")
        for _ in range(min(v, len(hand))):
            hand.pop()
    elif t == "skip_turn":
        pass


def run_effects(
    effects: list[dict],
    trigger: str,
    state: BattleState,
    actor: str,
) -> None:
    for effect in effects:
        if effect.get("trigger") != trigger:
            continue
        conditions = effect.get("conditions", [])
        if not evaluate_conditions(conditions, state, actor):
            continue
        for action in effect.get("actions", []):
            apply_action(action, state, actor)
