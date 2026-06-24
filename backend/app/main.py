from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from redis.exceptions import ConnectionError as RedisConnectionError

from app.routers.auth import router as auth_router
from app.routers.games import router as games_router
from app.routers.cards import router as cards_router
from app.routers.battles import router as battles_router
from app.exceptions import (
    NotFoundError,
    ForbiddenError,
    ConflictError,
    DomainValidationError,
    UnauthorizedError,
)

app = FastAPI(title="CardCard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8082", "http://localhost:19006", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(UnauthorizedError)
async def unauthorized_handler(request: Request, exc: UnauthorizedError):
    return JSONResponse(status_code=401, content={"detail": str(exc)})


@app.exception_handler(ForbiddenError)
async def forbidden_handler(request: Request, exc: ForbiddenError):
    return JSONResponse(status_code=403, content={"detail": str(exc)})


@app.exception_handler(NotFoundError)
async def not_found_handler(request: Request, exc: NotFoundError):
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(ConflictError)
async def conflict_handler(request: Request, exc: ConflictError):
    return JSONResponse(status_code=409, content={"detail": str(exc)})


@app.exception_handler(DomainValidationError)
async def domain_validation_handler(request: Request, exc: DomainValidationError):
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.exception_handler(RedisConnectionError)
async def redis_connection_handler(request: Request, exc: RedisConnectionError):
    return JSONResponse(status_code=503, content={"detail": "배틀 서버에 연결할 수 없습니다"})


app.include_router(auth_router)
app.include_router(games_router)
app.include_router(cards_router)
app.include_router(battles_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
