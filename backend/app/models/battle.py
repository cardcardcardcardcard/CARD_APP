import uuid
from datetime import datetime
import enum
from typing import Optional
from sqlalchemy import DateTime, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class BattleStatus(str, enum.Enum):
    waiting = "waiting"
    playing = "playing"
    done = "done"

class Battle(Base):
    __tablename__ = "battles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    game_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("games.id"), nullable=False)
    player_a_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    player_b_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    deck_a_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("decks.id"), nullable=False)
    deck_b_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("decks.id"), nullable=True)
    status: Mapped[BattleStatus] = mapped_column(Enum(BattleStatus), default=BattleStatus.waiting)
    winner_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
