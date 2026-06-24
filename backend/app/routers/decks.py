import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies import get_db, get_current_user
from app.models.deck import Deck
from app.models.game import Game
from app.models.user import User
from app.schemas.deck import DeckCreate, DeckOut

router = APIRouter(tags=["decks"])


@router.post("/games/{game_id}/decks", response_model=DeckOut, status_code=201)
async def create_deck(
    game_id: uuid.UUID,
    body: DeckCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    deck_size = game.ruleset.get("deck_size", 20)
    if len(body.card_ids) == 0:
        raise HTTPException(status_code=422, detail="카드를 최소 1장 선택해주세요")
    if len(body.card_ids) > deck_size:
        raise HTTPException(status_code=422, detail=f"덱은 최대 {deck_size}장까지 가능합니다")

    deck = Deck(
        id=uuid.uuid4(),
        owner_id=current_user.id,
        game_id=game_id,
        name=body.name,
        card_ids=body.card_ids,
    )
    db.add(deck)
    await db.commit()
    await db.refresh(deck)
    return deck


@router.get("/games/{game_id}/decks/mine", response_model=list[DeckOut])
async def list_my_decks(
    game_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Deck).where(Deck.game_id == game_id, Deck.owner_id == current_user.id)
    )
    return result.scalars().all()


@router.get("/decks/{deck_id}", response_model=DeckOut)
async def get_deck(
    deck_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Deck).where(Deck.id == deck_id))
    deck = result.scalar_one_or_none()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    if deck.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your deck")
    return deck
