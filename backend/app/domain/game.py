import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from app.exceptions import ForbiddenError


@dataclass
class GameDomain:
    id: uuid.UUID
    creator_id: uuid.UUID
    title: str
    description: Optional[str]
    is_public: bool
    invite_code: Optional[str]
    win_hand_size: int
    created_at: datetime

    def assert_creator(self, user_id: uuid.UUID) -> None:
        if self.creator_id != user_id:
            raise ForbiddenError("Not the creator")

    def apply_update(self, body) -> None:
        if body.title is not None:
            self.title = body.title
        if body.description is not None:
            self.description = body.description
        if body.is_public is not None:
            self.is_public = body.is_public
        if body.win_hand_size is not None:
            self.win_hand_size = body.win_hand_size

    @classmethod
    def from_orm(cls, game) -> "GameDomain":
        return cls(
            id=game.id,
            creator_id=game.creator_id,
            title=game.title,
            description=game.description,
            is_public=game.is_public,
            invite_code=game.invite_code,
            win_hand_size=game.win_hand_size,
            created_at=game.created_at,
        )
