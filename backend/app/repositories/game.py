import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.game import Game
from app.domain.game import GameDomain


class GameRepository:
    def __init__(self, db: AsyncSession):
        self._db = db

    async def find_by_id(self, game_id: uuid.UUID) -> Optional[GameDomain]:
        result = await self._db.execute(select(Game).where(Game.id == game_id))
        game = result.scalar_one_or_none()
        return GameDomain.from_orm(game) if game else None

    async def find_public(self) -> list[GameDomain]:
        result = await self._db.execute(select(Game).where(Game.is_public == True))
        return [GameDomain.from_orm(g) for g in result.scalars().all()]

    async def find_by_creator(self, creator_id: uuid.UUID) -> list[GameDomain]:
        result = await self._db.execute(select(Game).where(Game.creator_id == creator_id))
        return [GameDomain.from_orm(g) for g in result.scalars().all()]

    async def add(self, domain: GameDomain) -> GameDomain:
        game = Game(
            id=domain.id,
            creator_id=domain.creator_id,
            title=domain.title,
            description=domain.description,
            is_public=domain.is_public,
            invite_code=domain.invite_code,
            win_hand_size=domain.win_hand_size,
        )
        self._db.add(game)
        await self._db.commit()
        await self._db.refresh(game)
        return GameDomain.from_orm(game)

    async def update(self, domain: GameDomain) -> GameDomain:
        result = await self._db.execute(select(Game).where(Game.id == domain.id))
        game = result.scalar_one()
        game.title = domain.title
        game.description = domain.description
        game.is_public = domain.is_public
        game.win_hand_size = domain.win_hand_size
        await self._db.commit()
        await self._db.refresh(game)
        return GameDomain.from_orm(game)
