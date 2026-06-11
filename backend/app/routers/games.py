import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies import get_db, get_current_user
from app.models.game import Game
from app.models.user import User
from app.schemas.game import GameCreate, GameUpdate, GameOut

router = APIRouter(prefix="/games", tags=["games"])


@router.get("", response_model=list[GameOut])
async def list_games(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Game).where(Game.is_public == True))
    return result.scalars().all()


@router.post("", response_model=GameOut, status_code=201)
async def create_game(
    body: GameCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    game = Game(
        id=uuid.uuid4(),
        creator_id=current_user.id,
        title=body.title,
        description=body.description,
        is_public=body.is_public,
        invite_code=body.invite_code,
        ruleset=body.ruleset.model_dump(),
    )
    db.add(game)
    await db.commit()
    await db.refresh(game)
    return game


@router.get("/{game_id}", response_model=GameOut)
async def get_game(game_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return game


@router.put("/{game_id}", response_model=GameOut)
async def update_game(
    game_id: uuid.UUID,
    body: GameUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if game.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the creator")
    if body.title is not None:
        game.title = body.title
    if body.description is not None:
        game.description = body.description
    if body.is_public is not None:
        game.is_public = body.is_public
    if body.ruleset is not None:
        game.ruleset = body.ruleset.model_dump()
    await db.commit()
    await db.refresh(game)
    return game
