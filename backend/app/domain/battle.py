import uuid
import enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from app.exceptions import ForbiddenError, DomainValidationError


class BattleStatus(str, enum.Enum):
    waiting = "waiting"
    playing = "playing"
    done = "done"


@dataclass
class BattlePlayerDomain:
    id: uuid.UUID
    battle_id: uuid.UUID
    user_id: uuid.UUID
    username: str
    seat_index: int

    @classmethod
    def from_orm(cls, bp, username: str) -> "BattlePlayerDomain":
        return cls(
            id=bp.id,
            battle_id=bp.battle_id,
            user_id=bp.user_id,
            username=username,
            seat_index=bp.seat_index,
        )


@dataclass
class BattleDomain:
    id: uuid.UUID
    game_id: uuid.UUID
    status: BattleStatus
    winner_id: Optional[uuid.UUID]
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    created_at: datetime
    players: list[BattlePlayerDomain] = field(default_factory=list)

    def assert_waiting(self) -> None:
        if self.status != BattleStatus.waiting:
            raise DomainValidationError("Battle not in waiting state")

    def seat_of(self, user_id: uuid.UUID) -> Optional[int]:
        for p in self.players:
            if p.user_id == user_id:
                return p.seat_index
        return None

    def assert_not_already_joined(self, user_id: uuid.UUID) -> None:
        if self.seat_of(user_id) is not None:
            raise DomainValidationError("이미 참가한 배틀입니다")

    def assert_is_player(self, user_id: uuid.UUID) -> None:
        if self.seat_of(user_id) is None:
            raise ForbiddenError("Not a player in this battle")

    def assert_is_host(self, user_id: uuid.UUID) -> None:
        if not self.players or self.players[0].user_id != user_id:
            raise ForbiddenError("방장만 시작할 수 있습니다")

    def get_actor(self, user_id: uuid.UUID) -> int:
        seat = self.seat_of(user_id)
        if seat is None:
            raise ForbiddenError("Not a player in this battle")
        return seat

    def num_players(self) -> int:
        return len(self.players)

    @classmethod
    def from_orm(cls, battle, players: list[BattlePlayerDomain]) -> "BattleDomain":
        return cls(
            id=battle.id,
            game_id=battle.game_id,
            status=battle.status,
            winner_id=battle.winner_id,
            started_at=battle.started_at,
            ended_at=battle.ended_at,
            created_at=battle.created_at,
            players=sorted(players, key=lambda p: p.seat_index),
        )
