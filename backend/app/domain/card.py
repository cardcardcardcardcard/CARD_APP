import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

CARD_TYPES = ("action", "counter", "trap")
EFFECT_TYPES = ("draw", "discard", "steal", "give", "none")
EFFECT_TARGETS = ("self", "opponent", "all", "activator")


@dataclass
class CardDomain:
    id: uuid.UUID
    game_id: uuid.UUID
    name: str
    image_url: Optional[str]
    card_type: str
    has_minigame: bool
    trigger_condition: Optional[str]
    counter_condition: Optional[str]
    counters_action: bool
    counters_trap: bool
    effect_text: Optional[str]
    effect_type: str
    effect_value: int
    effect_target: str
    created_at: datetime

    def apply_update(self, body) -> None:
        if body.name is not None:
            self.name = body.name
        if body.image_url is not None:
            self.image_url = body.image_url
        if body.card_type is not None:
            self.card_type = body.card_type
        if body.has_minigame is not None:
            self.has_minigame = body.has_minigame
        if body.trigger_condition is not None:
            self.trigger_condition = body.trigger_condition
        if body.counter_condition is not None:
            self.counter_condition = body.counter_condition
        if body.counters_action is not None:
            self.counters_action = body.counters_action
        if body.counters_trap is not None:
            self.counters_trap = body.counters_trap
        if body.effect_text is not None:
            self.effect_text = body.effect_text
        if body.effect_type is not None:
            self.effect_type = body.effect_type
        if body.effect_value is not None:
            self.effect_value = body.effect_value
        if body.effect_target is not None:
            self.effect_target = body.effect_target

    @classmethod
    def from_orm(cls, card) -> "CardDomain":
        return cls(
            id=card.id,
            game_id=card.game_id,
            name=card.name,
            image_url=card.image_url,
            card_type=card.card_type,
            has_minigame=card.has_minigame,
            trigger_condition=card.trigger_condition,
            counter_condition=card.counter_condition,
            counters_action=card.counters_action,
            counters_trap=card.counters_trap,
            effect_text=card.effect_text,
            effect_type=card.effect_type,
            effect_value=card.effect_value,
            effect_target=card.effect_target,
            created_at=card.created_at,
        )
