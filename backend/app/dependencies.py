import uuid

from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.domain.user import UserDomain
from app.exceptions import UnauthorizedError
from app.repositories.user import UserRepository
from app.repositories.game import GameRepository
from app.repositories.card import CardRepository
from app.repositories.battle import BattleRepository
from app.security import decode_access_token
from app.services.auth import AuthService
from app.services.game import GameService
from app.services.card import CardService
from app.services.battle import BattleService

bearer_scheme = HTTPBearer()


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> UserDomain:
    try:
        user_id = decode_access_token(credentials.credentials)
    except Exception:
        raise UnauthorizedError("Invalid token")
    return await AuthService(UserRepository(db)).get_by_id(uuid.UUID(user_id))


def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(UserRepository(db))


def get_game_service(db: AsyncSession = Depends(get_db)) -> GameService:
    return GameService(GameRepository(db))


def get_card_service(db: AsyncSession = Depends(get_db)) -> CardService:
    return CardService(CardRepository(db), GameRepository(db))


def get_battle_service(db: AsyncSession = Depends(get_db)) -> BattleService:
    return BattleService(
        BattleRepository(db),
        GameRepository(db),
        CardRepository(db),
    )
