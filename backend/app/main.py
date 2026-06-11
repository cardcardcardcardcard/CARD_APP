from fastapi import FastAPI

app = FastAPI(title="CardCard API")

@app.get("/health")
async def health():
    return {"status": "ok"}
