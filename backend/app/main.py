from fastapi import FastAPI
from app.routers.auth import router as auth_router
from app.routers.games import router as games_router

app = FastAPI(title="CardCard API")
app.include_router(auth_router)
app.include_router(games_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
