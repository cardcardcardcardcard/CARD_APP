import random
from typing import Literal
from pydantic import BaseModel
import redis.asyncio as aioredis

REDIS_TTL = 60 * 60 * 24  # 24h


class BattleState(BaseModel):
    battle_id: str
    turn_number: int = 1
    active_player: Literal["a", "b"] = "a"
    deck_for_a: Literal["a", "b"] = "a"
    deck_for_b: Literal["a", "b"] = "b"
    phase: str = "main"
    hp_a: int = 100
    hp_b: int = 100
    hand_a: list[str] = []
    hand_b: list[str] = []
    field_a: list[str] = []
    field_b: list[str] = []
    resources_a: int = 1
    resources_b: int = 1
    deck_remaining_a: list[str] = []
    deck_remaining_b: list[str] = []
    swap_interval: int = 3
    initial_hp: int = 100

    def should_swap(self) -> bool:
        return self.turn_number > 0 and self.turn_number % self.swap_interval == 0

    def perform_swap(self) -> None:
        self.deck_for_a, self.deck_for_b = self.deck_for_b, self.deck_for_a


def _key(battle_id: str) -> str:
    return f"battle:{battle_id}"


async def save_state(redis: aioredis.Redis, state: BattleState) -> None:
    await redis.set(_key(state.battle_id), state.model_dump_json(), ex=REDIS_TTL)


async def load_state(redis: aioredis.Redis, battle_id: str) -> BattleState | None:
    raw = await redis.get(_key(battle_id))
    if raw is None:
        return None
    return BattleState.model_validate_json(raw)


def init_battle_state(
    battle_id: str,
    deck_a_card_ids: list[str],
    deck_b_card_ids: list[str],
    swap_interval: int,
    initial_hp: int,
    initial_resource: int,
) -> BattleState:
    a = deck_a_card_ids[:]
    b = deck_b_card_ids[:]
    random.shuffle(a)
    random.shuffle(b)
    hand_size = min(5, len(a))
    return BattleState(
        battle_id=battle_id,
        turn_number=1,
        active_player="a",
        deck_for_a="a",
        deck_for_b="b",
        phase="draw",
        hp_a=initial_hp,
        hp_b=initial_hp,
        hand_a=a[:hand_size],
        hand_b=b[:hand_size],
        field_a=[],
        field_b=[],
        resources_a=initial_resource,
        resources_b=initial_resource,
        deck_remaining_a=a[hand_size:],
        deck_remaining_b=b[hand_size:],
        swap_interval=swap_interval,
        initial_hp=initial_hp,
    )
