import json
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.rooms: dict[str, list[tuple[WebSocket, int]]] = {}

    async def connect(self, battle_id: str, ws: WebSocket, actor: int):
        await ws.accept()
        self.rooms.setdefault(battle_id, []).append((ws, actor))

    def disconnect(self, battle_id: str, ws: WebSocket):
        if battle_id in self.rooms:
            self.rooms[battle_id] = [(w, a) for (w, a) in self.rooms[battle_id] if w is not ws]

    async def broadcast(self, battle_id: str, message: dict):
        for ws, _ in list(self.rooms.get(battle_id, [])):
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                pass
