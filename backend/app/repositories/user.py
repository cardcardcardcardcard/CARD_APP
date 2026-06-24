import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.domain.user import UserDomain
from app.security import hash_password, verify_password


class UserRepository:
    def __init__(self, db: AsyncSession):
        self._db = db

    async def find_by_id(self, user_id: uuid.UUID) -> Optional[UserDomain]:
        result = await self._db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        return UserDomain.from_orm(user) if user else None

    async def exists_by_email_or_username(self, email: str, username: str) -> bool:
        result = await self._db.execute(
            select(User).where((User.email == email) | (User.username == username))
        )
        return result.scalar_one_or_none() is not None

    async def authenticate(self, email: str, password: str) -> Optional[UserDomain]:
        result = await self._db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user or not verify_password(password, user.password_hash):
            return None
        return UserDomain.from_orm(user)

    async def add(self, domain: UserDomain, password: str) -> UserDomain:
        user = User(
            id=domain.id,
            username=domain.username,
            email=domain.email,
            password_hash=hash_password(password),
        )
        self._db.add(user)
        await self._db.commit()
        await self._db.refresh(user)
        return UserDomain.from_orm(user)
