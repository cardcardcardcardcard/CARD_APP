import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Card(Base):
    __tablename__ = "cards"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    game_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    image_url: Mapped[str] = mapped_column(String(500), nullable=True)
    attributes: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    effects: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
