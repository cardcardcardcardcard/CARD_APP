import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class GameCreate(BaseModel):
    title: str
    description: Optional[str] = None
    is_public: bool = True
    invite_code: Optional[str] = None
    win_hand_size: int = 10


class GameUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    win_hand_size: Optional[int] = None


class GameOut(BaseModel):
    id: uuid.UUID
    creator_id: uuid.UUID
    title: str
    description: Optional[str]
    is_public: bool
    invite_code: Optional[str]
    win_hand_size: int
    created_at: datetime

    model_config = {"from_attributes": True}
