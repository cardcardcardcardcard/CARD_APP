import uuid
from datetime import datetime

from app.domain.battle import BattleDomain, BattlePlayerDomain, BattleStatus
from app.exceptions import NotFoundError, DomainValidationError
from app.repositories.battle import BattleRepository
from app.repositories.card import CardRepository
from app.repositories.game import GameRepository
from app.schemas.battle import BattleCreate
from app.battle.state import init_battle_state, save_state, STARTING_HAND_SIZE
from app.redis import get_redis


class BattleService:
    def __init__(
        self,
        battle_repo: BattleRepository,
        game_repo: GameRepository,
        card_repo: CardRepository,
    ):
        self._battle_repo = battle_repo
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
        battle_id = uuid.uuid4()
        domain = BattleDomain(
            id=battle_id,
            game_id=body.game_id,
            status=BattleStatus.waiting,
            winner_id=None,
            started_at=None,
            ended_at=None,
            created_at=datetime.utcnow(),
            players=[BattlePlayerDomain(id=uuid.uuid4(), battle_id=battle_id, user_id=user_id, username="", seat_index=0)],
        )
        return await self._battle_repo.add(domain)

    async def join(self, battle_id: uuid.UUID, user_id: uuid.UUID) -> BattleDomain:
        domain = await self.get_or_404(battle_id)
        domain.assert_waiting()
        domain.assert_not_already_joined(user_id)
        await self._battle_repo.add_player(battle_id, user_id, domain.num_players())
        return await self.get_or_404(battle_id)

    async def start(self, battle_id: uuid.UUID, user_id: uuid.UUID) -> BattleDomain:
        domain = await self.get_or_404(battle_id)
        domain.assert_waiting()
        domain.assert_is_host(user_id)
        n = domain.num_players()
        if n < 2:
            raise DomainValidationError("최소 2명이 모여야 시작할 수 있습니다")

        cards = await self._card_repo.find_by_game(domain.game_id)
        if len(cards) < STARTING_HAND_SIZE * n:
            raise DomainValidationError(f"카드가 최소 {STARTING_HAND_SIZE * n}장 필요합니다")

        game = await self._game_repo.find_by_id(domain.game_id)
        if not game:
            raise NotFoundError("Game")

        domain.status = BattleStatus.playing
        domain.started_at = datetime.utcnow()
        saved = await self._battle_repo.update(domain)

        redis = await get_redis()
        state = init_battle_state(
            battle_id=str(saved.id),
            all_card_ids=[str(c.id) for c in cards],
            num_players=n,
            win_hand_size=game.win_hand_size,
        )
        await save_state(redis, state)
        return saved

    async def mark_done(self, battle_id: uuid.UUID, winner_id: uuid.UUID | None) -> None:
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
