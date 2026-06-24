import uuid

from fastapi import APIRouter, Depends

from app.dependencies import get_game_service, get_current_user
from app.domain.user import UserDomain
from app.schemas.game import GameCreate, GameUpdate, GameOut
from app.services.game import GameService

router = APIRouter(prefix="/games", tags=["games"])


@router.get("", response_model=list[GameOut])
async def list_games(svc: GameService = Depends(get_game_service)):
    return await svc.list_public()


@router.get("/mine", response_model=list[GameOut])
async def list_my_games(
    svc: GameService = Depends(get_game_service),
    current_user: UserDomain = Depends(get_current_user),
):
    return await svc.list_by_creator(current_user.id)


@router.post("", response_model=GameOut, status_code=201)
async def create_game(
    body: GameCreate,
    svc: GameService = Depends(get_game_service),
    current_user: UserDomain = Depends(get_current_user),
):
    return await svc.create(current_user.id, body)


@router.get("/{game_id}", response_model=GameOut)
async def get_game(game_id: uuid.UUID, svc: GameService = Depends(get_game_service)):
    return await svc.get_or_404(game_id)


@router.put("/{game_id}", response_model=GameOut)
async def update_game(
    game_id: uuid.UUID,
    body: GameUpdate,
    svc: GameService = Depends(get_game_service),
    current_user: UserDomain = Depends(get_current_user),
):
    return await svc.update(game_id, current_user.id, body)
