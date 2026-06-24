import uuid
from datetime import datetime

from app.domain.user import UserDomain
from app.exceptions import ConflictError, UnauthorizedError, NotFoundError
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, LoginRequest
from app.security import create_access_token


class AuthService:
    def __init__(self, repo: UserRepository):
        self._repo = repo

    async def register(self, body: UserCreate) -> UserDomain:
        if await self._repo.exists_by_email_or_username(body.email, body.username):
            raise ConflictError("Username or email already exists")
        domain = UserDomain(
            id=uuid.uuid4(),
            username=body.username,
            email=body.email,
            created_at=datetime.utcnow(),
        )
        return await self._repo.add(domain, body.password)

    async def login(self, body: LoginRequest) -> str:
        user = await self._repo.authenticate(body.email, body.password)
        if not user:
            raise UnauthorizedError("Invalid credentials")
        return create_access_token(str(user.id))

    async def get_by_id(self, user_id: uuid.UUID) -> UserDomain:
        user = await self._repo.find_by_id(user_id)
        if not user:
            raise NotFoundError("User")
        return user
