from fastapi import APIRouter, Depends

from app.dependencies import get_auth_service, get_current_user
from app.domain.user import UserDomain
from app.schemas.user import UserCreate, UserOut, LoginRequest, TokenOut
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
async def register(body: UserCreate, svc: AuthService = Depends(get_auth_service)):
    return await svc.register(body)


@router.post("/login", response_model=TokenOut)
async def login(body: LoginRequest, svc: AuthService = Depends(get_auth_service)):
    token = await svc.login(body)
    return {"access_token": token}


@router.get("/me", response_model=UserOut)
async def me(current_user: UserDomain = Depends(get_current_user)):
    return current_user
