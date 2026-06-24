import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class BattlePlayer(Base):
    __tablename__ = "battle_players"
    __table_args__ = (
        UniqueConstraint("battle_id", "user_id", name="uq_battle_players_battle_user"),
        UniqueConstraint("battle_id", "seat_index", name="uq_battle_players_battle_seat"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    battle_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("battles.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    seat_index: Mapped[int] = mapped_column(Integer, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
