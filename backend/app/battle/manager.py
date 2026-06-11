import json
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.rooms: dict[str, list[WebSocket]] = {}

    async def connect(self, battle_id: str, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(battle_id, []).append(ws)

    def disconnect(self, battle_id: str, ws: WebSocket):
        if battle_id in self.rooms:
            try:
                self.rooms[battle_id].remove(ws)
            except ValueError:
                pass

    async def broadcast(self, battle_id: str, message: dict):
        for ws in list(self.rooms.get(battle_id, [])):
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                pass
