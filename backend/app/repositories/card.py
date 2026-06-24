import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.card import Card
from app.domain.card import CardDomain


class CardRepository:
    def __init__(self, db: AsyncSession):
        self._db = db

    async def find_by_id(self, card_id: uuid.UUID) -> Optional[CardDomain]:
        result = await self._db.execute(select(Card).where(Card.id == card_id))
        card = result.scalar_one_or_none()
        return CardDomain.from_orm(card) if card else None

    async def find_by_game(self, game_id: uuid.UUID) -> list[CardDomain]:
        result = await self._db.execute(select(Card).where(Card.game_id == game_id))
        return [CardDomain.from_orm(c) for c in result.scalars().all()]

    async def find_by_game_and_id(self, game_id: uuid.UUID, card_id: uuid.UUID) -> Optional[CardDomain]:
        result = await self._db.execute(
            select(Card).where(Card.id == card_id, Card.game_id == game_id)
        )
        card = result.scalar_one_or_none()
        return CardDomain.from_orm(card) if card else None

    async def add(self, domain: CardDomain) -> CardDomain:
        card = Card(
            id=domain.id,
            game_id=domain.game_id,
            name=domain.name,
            image_url=domain.image_url,
            card_type=domain.card_type,
            has_minigame=domain.has_minigame,
            trigger_condition=domain.trigger_condition,
            counter_condition=domain.counter_condition,
            counters_action=domain.counters_action,
            counters_trap=domain.counters_trap,
            effect_text=domain.effect_text,
            effect_type=domain.effect_type,
            effect_value=domain.effect_value,
            effect_target=domain.effect_target,
        )
        self._db.add(card)
        await self._db.commit()
        await self._db.refresh(card)
        return CardDomain.from_orm(card)

    async def update(self, domain: CardDomain) -> CardDomain:
        result = await self._db.execute(select(Card).where(Card.id == domain.id))
        card = result.scalar_one()
        card.name = domain.name
        card.image_url = domain.image_url
        card.card_type = domain.card_type
        card.has_minigame = domain.has_minigame
        card.trigger_condition = domain.trigger_condition
        card.counter_condition = domain.counter_condition
        card.counters_action = domain.counters_action
        card.counters_trap = domain.counters_trap
        card.effect_text = domain.effect_text
        card.effect_type = domain.effect_type
        card.effect_value = domain.effect_value
        card.effect_target = domain.effect_target
        await self._db.commit()
        await self._db.refresh(card)
        return CardDomain.from_orm(card)

    async def delete(self, card_id: uuid.UUID) -> None:
        result = await self._db.execute(select(Card).where(Card.id == card_id))
        card = result.scalar_one()
        await self._db.delete(card)
        await self._db.commit()
