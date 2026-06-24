import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Card(Base):
    __tablename__ = "cards"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    game_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    card_type: Mapped[str] = mapped_column(String(20), nullable=False, default="action")
    has_minigame: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    trigger_condition: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    counter_condition: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    counters_action: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    counters_trap: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    effect_text: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    effect_type: Mapped[str] = mapped_column(String(20), nullable=False, default="none")
    effect_value: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    effect_target: Mapped[str] = mapped_column(String(20), nullable=False, default="self")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
