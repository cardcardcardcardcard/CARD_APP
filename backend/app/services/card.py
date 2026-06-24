import uuid
from datetime import datetime

from app.domain.card import CardDomain
from app.exceptions import NotFoundError
from app.repositories.card import CardRepository
from app.repositories.game import GameRepository
from app.schemas.card import CardCreate, CardUpdate


class CardService:
    def __init__(self, card_repo: CardRepository, game_repo: GameRepository):
        self._card_repo = card_repo
        self._game_repo = game_repo

    async def list_by_game(self, game_id: uuid.UUID) -> list[CardDomain]:
        return await self._card_repo.find_by_game(game_id)

    async def create(self, game_id: uuid.UUID, user_id: uuid.UUID, body: CardCreate) -> CardDomain:
        game = await self._game_repo.find_by_id(game_id)
        if not game:
            raise NotFoundError("Game")
        game.assert_creator(user_id)
        domain = CardDomain(
            id=uuid.uuid4(),
            game_id=game_id,
            name=body.name,
            image_url=body.image_url,
            card_type=body.card_type,
            has_minigame=body.has_minigame,
            trigger_condition=body.trigger_condition,
            counter_condition=body.counter_condition,
            counters_action=body.counters_action,
            counters_trap=body.counters_trap,
            effect_text=body.effect_text,
            effect_type=body.effect_type,
            effect_value=body.effect_value,
            effect_target=body.effect_target,
            created_at=datetime.utcnow(),
        )
        return await self._card_repo.add(domain)

    async def update(
        self,
        game_id: uuid.UUID,
        card_id: uuid.UUID,
        user_id: uuid.UUID,
        body: CardUpdate,
    ) -> CardDomain:
        game = await self._game_repo.find_by_id(game_id)
        if not game:
            raise NotFoundError("Game")
        game.assert_creator(user_id)
        domain = await self._card_repo.find_by_game_and_id(game_id, card_id)
        if not domain:
            raise NotFoundError("Card")
        domain.apply_update(body)
        return await self._card_repo.update(domain)

    async def delete(self, game_id: uuid.UUID, card_id: uuid.UUID, user_id: uuid.UUID) -> None:
        game = await self._game_repo.find_by_id(game_id)
        if not game:
            raise NotFoundError("Game")
        game.assert_creator(user_id)
        domain = await self._card_repo.find_by_game_and_id(game_id, card_id)
        if not domain:
            raise NotFoundError("Card")
        await self._card_repo.delete(domain.id)
