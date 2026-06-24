import uuid
from datetime import datetime

from app.domain.battle import BattleDomain, BattleStatus
from app.domain.deck import DeckDomain
from app.exceptions import NotFoundError, DomainValidationError
from app.repositories.battle import BattleRepository
from app.repositories.card import CardRepository
from app.repositories.deck import DeckRepository
from app.repositories.game import GameRepository
from app.schemas.battle import BattleCreate, BattleJoin
from app.battle.state import init_battle_state, save_state
from app.redis import get_redis


class BattleService:
    def __init__(
        self,
        battle_repo: BattleRepository,
        deck_repo: DeckRepository,
        game_repo: GameRepository,
        card_repo: CardRepository,
    ):
        self._battle_repo = battle_repo
        self._deck_repo = deck_repo
        self._game_repo = game_repo
        self._card_repo = card_repo

    async def get_or_404(self, battle_id: uuid.UUID) -> BattleDomain:
        domain = await self._battle_repo.find_by_id(battle_id)
        if not domain:
            raise NotFoundError("Battle")
        return domain

    async def create(self, user_id: uuid.UUID, body: BattleCreate) -> BattleDomain:
        game = await self._game_repo.find_by_id(body.game_id)
        if not game:
            raise NotFoundError("Game")
        deck = await self._deck_repo.find_by_id(body.deck_id)
        if not deck:
            raise NotFoundError("Deck")
        deck.assert_valid_for_battle(user_id, body.game_id)
        domain = BattleDomain(
            id=uuid.uuid4(),
            game_id=body.game_id,
            player_a_id=user_id,
            player_b_id=None,
            deck_a_id=body.deck_id,
            deck_b_id=None,
            status=BattleStatus.waiting,
            winner_id=None,
            started_at=None,
            ended_at=None,
            created_at=datetime.utcnow(),
        )
        return await self._battle_repo.add(domain)

    async def join(self, battle_id: uuid.UUID, user_id: uuid.UUID, body: BattleJoin) -> BattleDomain:
        domain = await self.get_or_404(battle_id)
        domain.assert_waiting()
        domain.assert_not_self_join(user_id)

        deck_b = await self._deck_repo.find_by_id(body.deck_id)
        if not deck_b:
            raise NotFoundError("Deck")
        deck_b.assert_valid_for_battle(user_id, domain.game_id)

        deck_a = await self._deck_repo.find_by_id(domain.deck_a_id)
        game = await self._game_repo.find_by_id(domain.game_id)
        ruleset = game.ruleset

        domain.player_b_id = user_id
        domain.deck_b_id = body.deck_id
        domain.status = BattleStatus.playing
        domain.started_at = datetime.utcnow()
        saved = await self._battle_repo.update(domain)

        redis = await get_redis()
        state = init_battle_state(
            battle_id=str(saved.id),
            deck_a_card_ids=[str(c) for c in deck_a.card_ids],
            deck_b_card_ids=[str(c) for c in deck_b.card_ids],
            swap_interval=ruleset.get("swap_interval", 3),
            initial_hp=100,
            initial_resource=ruleset.get("initial_resource", 1),
        )
        await save_state(redis, state)
        return saved

    async def mark_done(self, battle_id: uuid.UUID, winner_id: uuid.UUID) -> None:
        domain = await self.get_or_404(battle_id)
        domain.status = BattleStatus.done
        domain.winner_id = winner_id
        domain.ended_at = datetime.utcnow()
        await self._battle_repo.update(domain)

    async def validate_ws_participant(self, battle_id: uuid.UUID, user_id: uuid.UUID) -> BattleDomain:
        domain = await self.get_or_404(battle_id)
        if domain.status != BattleStatus.playing:
            raise DomainValidationError("Battle not in playing state")
        domain.assert_is_player(user_id)
        return domain

    async def get_card(self, card_id: uuid.UUID):
        return await self._card_repo.find_by_id(card_id)

    async def get_card_effects(self, card_id: uuid.UUID) -> list:
        card = await self._card_repo.find_by_id(card_id)
        return card.effects if card else []
