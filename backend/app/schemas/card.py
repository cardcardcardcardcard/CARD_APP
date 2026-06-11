import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class CardCreate(BaseModel):
    name: str
    image_url: Optional[str] = None
    attributes: dict = {}
    effects: list = []


class CardUpdate(BaseModel):
    name: Optional[str] = None
    image_url: Optional[str] = None
    attributes: Optional[dict] = None
    effects: Optional[list] = None


class CardOut(BaseModel):
    id: uuid.UUID
    game_id: uuid.UUID
    name: str
    image_url: Optional[str]
    attributes: dict
    effects: list
    created_at: datetime

    model_config = {"from_attributes": True}
