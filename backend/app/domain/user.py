import uuid
from dataclasses import dataclass
from datetime import datetime


@dataclass
class UserDomain:
    id: uuid.UUID
    username: str
    email: str
    created_at: datetime

    @classmethod
    def from_orm(cls, user) -> "UserDomain":
        return cls(
            id=user.id,
            username=user.username,
            email=user.email,
            created_at=user.created_at,
        )
