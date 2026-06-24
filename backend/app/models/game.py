import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Boolean, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Game(Base):
    __tablename__ = "games"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    creator_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    invite_code: Mapped[Optional[str]] = mapped_column(String(20), unique=True, nullable=True)
    win_hand_size: Mapped[int] = mapped_column(Integer, nullable=False, default=10, server_default="10")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
