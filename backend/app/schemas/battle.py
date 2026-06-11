import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class BattleCreate(BaseModel):
    game_id: uuid.UUID
    deck_id: uuid.UUID


class BattleJoin(BaseModel):
    deck_id: uuid.UUID


class BattleOut(BaseModel):
    id: uuid.UUID
    game_id: uuid.UUID
    player_a_id: uuid.UUID
    player_b_id: Optional[uuid.UUID]
    deck_a_id: uuid.UUID
    deck_b_id: Optional[uuid.UUID]
    status: str
    winner_id: Optional[uuid.UUID]
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}
