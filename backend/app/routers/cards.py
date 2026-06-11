import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies import get_db, get_current_user
from app.models.card import Card
from app.models.game import Game
from app.models.user import User
from app.schemas.card import CardCreate, CardUpdate, CardOut

router = APIRouter(prefix="/games/{game_id}/cards", tags=["cards"])


async def _get_game_as_creator(game_id: uuid.UUID, db: AsyncSession, current_user: User) -> Game:
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if game.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the creator")
    return game


@router.get("", response_model=list[CardOut])
async def list_cards(game_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Card).where(Card.game_id == game_id))
    return result.scalars().all()


@router.post("", response_model=CardOut, status_code=201)
async def create_card(
    game_id: uuid.UUID,
    body: CardCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_game_as_creator(game_id, db, current_user)
    card = Card(
        id=uuid.uuid4(),
        game_id=game_id,
        name=body.name,
        image_url=body.image_url,
        attributes=body.attributes,
        effects=body.effects,
    )
    db.add(card)
    await db.commit()
    await db.refresh(card)
    return card


@router.put("/{card_id}", response_model=CardOut)
async def update_card(
    game_id: uuid.UUID,
    card_id: uuid.UUID,
    body: CardUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_game_as_creator(game_id, db, current_user)
    result = await db.execute(select(Card).where(Card.id == card_id, Card.game_id == game_id))
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    if body.name is not None:
        card.name = body.name
    if body.image_url is not None:
        card.image_url = body.image_url
    if body.attributes is not None:
        card.attributes = body.attributes
    if body.effects is not None:
        card.effects = body.effects
    await db.commit()
    await db.refresh(card)
    return card


@router.delete("/{card_id}", status_code=204)
async def delete_card(
    game_id: uuid.UUID,
    card_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_game_as_creator(game_id, db, current_user)
    result = await db.execute(select(Card).where(Card.id == card_id, Card.game_id == game_id))
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    await db.delete(card)
    await db.commit()
