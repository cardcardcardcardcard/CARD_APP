import random
from typing import Literal, Optional
from pydantic import BaseModel
import redis.asyncio as aioredis

REDIS_TTL = 60 * 60 * 24  # 24h

HAND_SIZE_TO_WIN = 10
STARTING_HAND_SIZE = 3


class PendingTrigger(BaseModel):
    source_type: Literal["action", "trap"]
    actor: int
    card_id: str
    has_minigame: bool = False
    activator: Optional[int] = None
    target_seat: Optional[int] = None


class PendingDiscard(BaseModel):
    seat: int
    count: int


class BattleState(BaseModel):
    battle_id: str
    num_players: int = 2
    shared_deck: list[str] = []
    discard_pile: list[str] = []
    hands: list[list[str]] = []
    trap_zones: list[list[str]] = []
    play_direction: Literal["cw", "ccw"] = "cw"
    active_seat: int = 0
    turn_number: int = 1
    has_acted_this_turn: bool = False
    trap_installed_this_turn: bool = False
    pending_trigger: Optional[PendingTrigger] = None
    pending_discards: list[PendingDiscard] = []
    discard_finish_actor: Optional[int] = None
    win_hand_size: int = 10

    def next_seat(self, frm: int) -> int:
        if self.play_direction == "cw":
            return (frm + 1) % self.num_players
        return (frm - 1) % self.num_players


def _key(battle_id: str) -> str:
    return f"battle:{battle_id}"


async def save_state(redis: aioredis.Redis, state: BattleState) -> None:
    await redis.set(_key(state.battle_id), state.model_dump_json(), ex=REDIS_TTL)


async def load_state(redis: aioredis.Redis, battle_id: str) -> BattleState | None:
    raw = await redis.get(_key(battle_id))
    if raw is None:
        return None
    return BattleState.model_validate_json(raw)


def init_battle_state(battle_id: str, all_card_ids: list[str], num_players: int, win_hand_size: int = 10) -> BattleState:
    pool = all_card_ids[:]
    random.shuffle(pool)
    hands = []
    idx = 0
    for _ in range(num_players):
        hands.append(pool[idx:idx + STARTING_HAND_SIZE])
        idx += STARTING_HAND_SIZE
    shared_deck = pool[idx:]
    return BattleState(
        battle_id=battle_id,
        num_players=num_players,
        shared_deck=shared_deck,
        hands=hands,
        trap_zones=[[] for _ in range(num_players)],
        active_seat=0,
        turn_number=1,
        win_hand_size=win_hand_size,
    )
