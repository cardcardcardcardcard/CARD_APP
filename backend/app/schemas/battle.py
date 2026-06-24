import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class BattleCreate(BaseModel):
    game_id: uuid.UUID


class BattlePlayerOut(BaseModel):
    user_id: uuid.UUID
    username: str
    seat_index: int

    model_config = {"from_attributes": True}


class BattleOut(BaseModel):
    id: uuid.UUID
    game_id: uuid.UUID
    status: str
    winner_id: Optional[uuid.UUID]
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    created_at: datetime
    players: list[BattlePlayerOut]

    model_config = {"from_attributes": True}
