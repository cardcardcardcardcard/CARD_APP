import uuid

from fastapi import APIRouter, Depends

from app.dependencies import get_card_service, get_current_user
from app.domain.user import UserDomain
from app.schemas.card import CardCreate, CardUpdate, CardOut
from app.services.card import CardService

router = APIRouter(prefix="/games/{game_id}/cards", tags=["cards"])


@router.get("", response_model=list[CardOut])
async def list_cards(game_id: uuid.UUID, svc: CardService = Depends(get_card_service)):
    return await svc.list_by_game(game_id)


@router.post("", response_model=CardOut, status_code=201)
async def create_card(
    game_id: uuid.UUID,
    body: CardCreate,
    svc: CardService = Depends(get_card_service),
    current_user: UserDomain = Depends(get_current_user),
):
    return await svc.create(game_id, current_user.id, body)


@router.put("/{card_id}", response_model=CardOut)
async def update_card(
    game_id: uuid.UUID,
    card_id: uuid.UUID,
    body: CardUpdate,
    svc: CardService = Depends(get_card_service),
    current_user: UserDomain = Depends(get_current_user),
):
    return await svc.update(game_id, card_id, current_user.id, body)


@router.delete("/{card_id}", status_code=204)
async def delete_card(
    game_id: uuid.UUID,
    card_id: uuid.UUID,
    svc: CardService = Depends(get_card_service),
    current_user: UserDomain = Depends(get_current_user),
):
    await svc.delete(game_id, card_id, current_user.id)
