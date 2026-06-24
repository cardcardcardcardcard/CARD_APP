import uuid
from datetime import datetime

from app.domain.game import GameDomain
from app.exceptions import NotFoundError
from app.repositories.game import GameRepository
from app.schemas.game import GameCreate, GameUpdate


class GameService:
    def __init__(self, repo: GameRepository):
        self._repo = repo

    async def get_or_404(self, game_id: uuid.UUID) -> GameDomain:
        game = await self._repo.find_by_id(game_id)
        if not game:
            raise NotFoundError("Game")
        return game

    async def list_public(self) -> list[GameDomain]:
        return await self._repo.find_public()

    async def list_by_creator(self, creator_id: uuid.UUID) -> list[GameDomain]:
        return await self._repo.find_by_creator(creator_id)

    async def create(self, creator_id: uuid.UUID, body: GameCreate) -> GameDomain:
        domain = GameDomain(
            id=uuid.uuid4(),
            creator_id=creator_id,
            title=body.title,
            description=body.description,
            is_public=body.is_public,
            invite_code=body.invite_code,
            win_hand_size=body.win_hand_size,
            created_at=datetime.utcnow(),
        )
        return await self._repo.add(domain)

    async def update(self, game_id: uuid.UUID, user_id: uuid.UUID, body: GameUpdate) -> GameDomain:
        domain = await self.get_or_404(game_id)
        domain.assert_creator(user_id)
        domain.apply_update(body)
        return await self._repo.update(domain)
