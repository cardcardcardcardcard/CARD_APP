import uuid
from datetime import datetime
from pydantic import BaseModel


class DeckCreate(BaseModel):
    name: str
    card_ids: list[str]


class DeckOut(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    game_id: uuid.UUID
    name: str
    card_ids: list
    created_at: datetime

    model_config = {"from_attributes": True}
