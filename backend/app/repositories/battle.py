import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.battle import Battle
from app.models.battle_player import BattlePlayer
from app.models.user import User
from app.domain.battle import BattleDomain, BattlePlayerDomain


class BattleRepository:
    def __init__(self, db: AsyncSession):
        self._db = db

    async def _load_players(self, battle_id: uuid.UUID) -> list[BattlePlayerDomain]:
        result = await self._db.execute(
            select(BattlePlayer, User.username)
            .join(User, User.id == BattlePlayer.user_id)
            .where(BattlePlayer.battle_id == battle_id)
            .order_by(BattlePlayer.seat_index)
        )
        return [BattlePlayerDomain.from_orm(bp, username) for bp, username in result.all()]

    async def find_by_id(self, battle_id: uuid.UUID) -> Optional[BattleDomain]:
        result = await self._db.execute(select(Battle).where(Battle.id == battle_id))
        battle = result.scalar_one_or_none()
        if not battle:
            return None
        players = await self._load_players(battle_id)
        return BattleDomain.from_orm(battle, players)

    async def add(self, domain: BattleDomain) -> BattleDomain:
        battle = Battle(
            id=domain.id,
            game_id=domain.game_id,
            status=domain.status,
        )
        self._db.add(battle)
        for p in domain.players:
            self._db.add(BattlePlayer(id=p.id, battle_id=domain.id, user_id=p.user_id, seat_index=p.seat_index))
        await self._db.commit()
        return await self.find_by_id(domain.id)

    async def add_player(self, battle_id: uuid.UUID, user_id: uuid.UUID, seat_index: int) -> None:
        self._db.add(BattlePlayer(id=uuid.uuid4(), battle_id=battle_id, user_id=user_id, seat_index=seat_index))
        await self._db.commit()

    async def update(self, domain: BattleDomain) -> BattleDomain:
        result = await self._db.execute(select(Battle).where(Battle.id == domain.id))
        battle = result.scalar_one()
        battle.status = domain.status
        battle.winner_id = domain.winner_id
        battle.started_at = domain.started_at
        battle.ended_at = domain.ended_at
        await self._db.commit()
        return await self.find_by_id(domain.id)
