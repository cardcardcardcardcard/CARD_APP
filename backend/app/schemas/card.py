import uuid
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel

CardType = Literal["action", "counter", "trap"]
EffectType = Literal["draw", "discard", "steal", "give", "none"]
EffectTarget = Literal["self", "opponent", "all", "activator"]


class CardCreate(BaseModel):
    name: str
    image_url: Optional[str] = None
    card_type: CardType = "action"
    has_minigame: bool = False
    trigger_condition: Optional[str] = None
    counter_condition: Optional[str] = None
    counters_action: bool = False
    counters_trap: bool = False
    effect_text: Optional[str] = None
    effect_type: EffectType = "none"
    effect_value: int = 0
    effect_target: EffectTarget = "self"


class CardUpdate(BaseModel):
    name: Optional[str] = None
    image_url: Optional[str] = None
    card_type: Optional[CardType] = None
    has_minigame: Optional[bool] = None
    trigger_condition: Optional[str] = None
    counter_condition: Optional[str] = None
    counters_action: Optional[bool] = None
    counters_trap: Optional[bool] = None
    effect_text: Optional[str] = None
    effect_type: Optional[EffectType] = None
    effect_value: Optional[int] = None
    effect_target: Optional[EffectTarget] = None


class CardOut(BaseModel):
    id: uuid.UUID
    game_id: uuid.UUID
    name: str
    image_url: Optional[str]
    card_type: CardType
    has_minigame: bool
    trigger_condition: Optional[str]
    counter_condition: Optional[str]
    counters_action: bool
    counters_trap: bool
    effect_text: Optional[str]
    effect_type: EffectType
    effect_value: int
    effect_target: EffectTarget
    created_at: datetime

    model_config = {"from_attributes": True}
