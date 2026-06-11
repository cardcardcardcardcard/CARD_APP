import pytest
from app.battle.state import BattleState, init_battle_state


def make_state():
    return BattleState(
        battle_id="test-battle-id",
        turn_number=1,
        active_player="a",
        deck_for_a="a",
        deck_for_b="b",
        phase="main",
        hp_a=100,
        hp_b=100,
        hand_a=["c1", "c2"],
        hand_b=["c3", "c4"],
        field_a=[],
        field_b=[],
        resources_a=1,
        resources_b=1,
        deck_remaining_a=["c5", "c6"],
        deck_remaining_b=["c7", "c8"],
        swap_interval=3,
        initial_hp=100,
    )


def test_battle_state_creation():
    state = make_state()
    assert state.turn_number == 1
    assert state.deck_for_a == "a"
    assert state.deck_for_b == "b"


def test_swap_trigger_false():
    state = make_state()
    assert state.should_swap() is False


def test_swap_trigger_true():
    state = make_state()
    state.turn_number = 3
    assert state.should_swap() is True


def test_perform_swap():
    state = make_state()
    state.turn_number = 3
    state.perform_swap()
    assert state.deck_for_a == "b"
    assert state.deck_for_b == "a"


def test_double_swap_restores():
    state = make_state()
    state.turn_number = 3
    state.perform_swap()
    state.turn_number = 6
    state.perform_swap()
    assert state.deck_for_a == "a"
    assert state.deck_for_b == "b"


# --- engine tests ---

from app.battle.engine import evaluate_conditions, apply_action, run_effects


def test_condition_lt_true():
    state = make_state()
    state.hp_a = 20
    cond = {"stat": "self.hp", "op": "<", "value": 30}
    assert evaluate_conditions([cond], state, actor="a") is True


def test_condition_lt_false():
    state = make_state()
    state.hp_a = 50
    cond = {"stat": "self.hp", "op": "<", "value": 30}
    assert evaluate_conditions([cond], state, actor="a") is False


def test_condition_opponent_hp():
    state = make_state()
    state.hp_b = 40
    cond = {"stat": "opponent.hp", "op": ">=", "value": 40}
    assert evaluate_conditions([cond], state, actor="a") is True


def test_action_deal_damage():
    state = make_state()
    action = {"type": "deal_damage", "target": "opponent", "value": 30}
    apply_action(action, state, actor="a")
    assert state.hp_b == 70


def test_action_heal():
    state = make_state()
    state.hp_a = 60
    action = {"type": "heal", "target": "self", "value": 20}
    apply_action(action, state, actor="a")
    assert state.hp_a == 80


def test_action_heal_capped_at_initial():
    state = make_state()
    state.hp_a = 95
    action = {"type": "heal", "target": "self", "value": 20}
    apply_action(action, state, actor="a")
    assert state.hp_a == 100


def test_run_effects_trigger_match():
    state = make_state()
    state.hp_a = 20
    effects = [{
        "trigger": "on_attack",
        "conditions": [{"stat": "self.hp", "op": "<", "value": 30}],
        "actions": [{"type": "deal_damage", "target": "opponent", "value": 40}],
    }]
    run_effects(effects, trigger="on_attack", state=state, actor="a")
    assert state.hp_b == 60


def test_run_effects_trigger_mismatch():
    state = make_state()
    effects = [{
        "trigger": "on_defend",
        "conditions": [],
        "actions": [{"type": "deal_damage", "target": "opponent", "value": 40}],
    }]
    run_effects(effects, trigger="on_attack", state=state, actor="a")
    assert state.hp_b == 100
