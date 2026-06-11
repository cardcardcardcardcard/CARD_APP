import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class RulesetSchema(BaseModel):
    deck_size: int = 20
    hand_limit: int = 5
    swap_interval: int = 3
    win_condition: str = "hp_zero"
    turn_phases: list[str] = ["draw", "main", "battle", "end"]
    resource_system: str = "mana"
    initial_resource: int = 1
    resource_per_turn: int = 1


class GameCreate(BaseModel):
    title: str
    description: Optional[str] = None
    is_public: bool = True
    invite_code: Optional[str] = None
    ruleset: RulesetSchema


class GameUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    ruleset: Optional[RulesetSchema] = None


class GameOut(BaseModel):
    id: uuid.UUID
    creator_id: uuid.UUID
    title: str
    description: Optional[str]
    is_public: bool
    invite_code: Optional[str]
    ruleset: dict
    created_at: datetime

    model_config = {"from_attributes": True}
