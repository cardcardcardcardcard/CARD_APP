# CardCard Battle Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실시간 WebSocket 배틀 엔진 — Redis BattleState, JSON 룰 인터프리터, 덱 스왑 메카닉

**Architecture:** FastAPI WebSocket endpoint + Redis (aioredis/redis-py async) for BattleState. Rule interpreter evaluates card effects against BattleState in-memory. Deck swap triggered when `turn_number % swap_interval == 0`. State broadcasts to both players via WebSocket after every action.

**Tech Stack:** FastAPI WebSocket, redis[asyncio] (redis-py 5.x async), Pydantic v2, pytest + pytest-asyncio (existing setup)

---

## File Structure

```
backend/
├── app/
│   ├── redis.py                   # Redis client singleton
│   ├── battle/
│   │   ├── __init__.py
│   │   ├── state.py               # BattleState Pydantic model + Redis R/W
│   │   ├── engine.py              # Rule interpreter (effects, conditions, actions)
│   │   └── manager.py             # WebSocket connection manager
│   ├── routers/
│   │   └── battles.py             # POST /battles, GET /battles/{id}, WS /battles/{id}/ws
│   └── schemas/
│       └── battle.py              # BattleCreate, BattleOut schemas
└── tests/
    ├── test_battles_http.py       # POST /battles, GET /battles/{id}
    └── test_battle_engine.py      # Unit tests for rule interpreter
```

---

## Task 1: Redis 클라이언트 설정

**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/app/redis.py`
- Modify: `backend/app/config.py`
- Modify: `backend/.env.example`

- [ ] **Step 1: requirements.txt에 redis 추가**

```
redis[asyncio]==5.0.8
```

- [ ] **Step 2: .env.example에 REDIS_URL 추가**

```
REDIS_URL=redis://localhost:6379/0
```

- [ ] **Step 3: config.py에 REDIS_URL 추가**

현재 `backend/app/config.py`:
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    TEST_DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REDIS_URL: str = "redis://localhost:6379/0"

    class Config:
        env_file = ".env"

settings = Settings()
```

- [ ] **Step 4: app/redis.py 작성**

```python
# backend/app/redis.py
import redis.asyncio as aioredis
from app.config import settings

_redis: aioredis.Redis | None = None

async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis
```

- [ ] **Step 5: 커밋**

```bash
git add backend/requirements.txt backend/app/redis.py backend/app/config.py backend/.env.example
git commit -m "chore: add Redis async client"
```

---

## Task 2: BattleState 모델 + Redis R/W

**Files:**
- Create: `backend/app/battle/__init__.py`
- Create: `backend/app/battle/state.py`
- Create: `backend/tests/test_battle_engine.py` (state 부분만)

- [ ] **Step 1: 실패하는 테스트 작성**

```python
# backend/tests/test_battle_engine.py
import pytest
from unittest.mock import AsyncMock, patch
from app.battle.state import BattleState, init_battle_state, load_state, save_state

def make_state():
    return BattleState(
        battle_id="test-battle-id",
        turn_number=1,
        active_player="a",
        deck_for_a="a",
        deck_for_b="b",
        phase="main",
        hp_a=100,
        hp_b=100,
        hand_a=["c1", "c2"],
        hand_b=["c3", "c4"],
        field_a=[],
        field_b=[],
        resources_a=1,
        resources_b=1,
        deck_remaining_a=["c5", "c6"],
        deck_remaining_b=["c7", "c8"],
        swap_interval=3,
        initial_hp=100,
    )

def test_battle_state_creation():
    state = make_state()
    assert state.turn_number == 1
    assert state.deck_for_a == "a"
    assert state.deck_for_b == "b"

def test_swap_trigger_false():
    state = make_state()
    assert state.should_swap() is False  # turn 1, swap_interval 3

def test_swap_trigger_true():
    state = make_state()
    state.turn_number = 3
    assert state.should_swap() is True

def test_perform_swap():
    state = make_state()
    state.turn_number = 3
    state.perform_swap()
    assert state.deck_for_a == "b"
    assert state.deck_for_b == "a"

def test_double_swap_restores():
    state = make_state()
    state.turn_number = 3
    state.perform_swap()
    state.turn_number = 6
    state.perform_swap()
    assert state.deck_for_a == "a"
    assert state.deck_for_b == "b"
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pytest tests/test_battle_engine.py -v
```

Expected: `ImportError` or `ModuleNotFoundError`

- [ ] **Step 3: app/battle/__init__.py 생성**

```python
# empty
```

- [ ] **Step 4: app/battle/state.py 작성**

```python
# backend/app/battle/state.py
import json
from typing import Literal
from pydantic import BaseModel
import redis.asyncio as aioredis

REDIS_TTL = 60 * 60 * 24  # 24h


class BattleState(BaseModel):
    battle_id: str
    turn_number: int = 1
    active_player: Literal["a", "b"] = "a"
    deck_for_a: Literal["a", "b"] = "a"
    deck_for_b: Literal["a", "b"] = "b"
    phase: str = "main"
    hp_a: int = 100
    hp_b: int = 100
    hand_a: list[str] = []
    hand_b: list[str] = []
    field_a: list[str] = []
    field_b: list[str] = []
    resources_a: int = 1
    resources_b: int = 1
    deck_remaining_a: list[str] = []
    deck_remaining_b: list[str] = []
    swap_interval: int = 3
    initial_hp: int = 100

    def should_swap(self) -> bool:
        return self.turn_number > 0 and self.turn_number % self.swap_interval == 0

    def perform_swap(self) -> None:
        self.deck_for_a, self.deck_for_b = self.deck_for_b, self.deck_for_a


def _key(battle_id: str) -> str:
    return f"battle:{battle_id}"


async def save_state(redis: aioredis.Redis, state: BattleState) -> None:
    await redis.set(_key(state.battle_id), state.model_dump_json(), ex=REDIS_TTL)


async def load_state(redis: aioredis.Redis, battle_id: str) -> BattleState | None:
    raw = await redis.get(_key(battle_id))
    if raw is None:
        return None
    return BattleState.model_validate_json(raw)


def init_battle_state(
    battle_id: str,
    deck_a_card_ids: list[str],
    deck_b_card_ids: list[str],
    swap_interval: int,
    initial_hp: int,
    initial_resource: int,
) -> BattleState:
    import random
    a = deck_a_card_ids[:]
    b = deck_b_card_ids[:]
    random.shuffle(a)
    random.shuffle(b)
    hand_size = min(5, len(a))
    return BattleState(
        battle_id=battle_id,
        turn_number=1,
        active_player="a",
        deck_for_a="a",
        deck_for_b="b",
        phase="draw",
        hp_a=initial_hp,
        hp_b=initial_hp,
        hand_a=a[:hand_size],
        hand_b=b[:hand_size],
        field_a=[],
        field_b=[],
        resources_a=initial_resource,
        resources_b=initial_resource,
        deck_remaining_a=a[hand_size:],
        deck_remaining_b=b[hand_size:],
        swap_interval=swap_interval,
        initial_hp=initial_hp,
    )
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pytest tests/test_battle_engine.py::test_battle_state_creation tests/test_battle_engine.py::test_swap_trigger_false tests/test_battle_engine.py::test_swap_trigger_true tests/test_battle_engine.py::test_perform_swap tests/test_battle_engine.py::test_double_swap_restores -v
```

Expected: 5 PASSED

- [ ] **Step 6: 커밋**

```bash
git add backend/app/battle/ backend/tests/test_battle_engine.py
git commit -m "feat: BattleState model with deck swap logic"
```

---

## Task 3: 룰 인터프리터

**Files:**
- Create: `backend/app/battle/engine.py`
- Modify: `backend/tests/test_battle_engine.py` (engine 테스트 추가)

- [ ] **Step 1: 실패하는 테스트 추가**

```python
# append to backend/tests/test_battle_engine.py
from app.battle.engine import evaluate_conditions, apply_action, run_effects

def test_condition_lt_true():
    state = make_state()
    state.hp_a = 20
    cond = {"stat": "self.hp", "op": "<", "value": 30}
    assert evaluate_conditions([cond], state, actor="a") is True

def test_condition_lt_false():
    state = make_state()
    state.hp_a = 50
    cond = {"stat": "self.hp", "op": "<", "value": 30}
    assert evaluate_conditions([cond], state, actor="a") is False

def test_condition_opponent_hp():
    state = make_state()
    state.hp_b = 40
    cond = {"stat": "opponent.hp", "op": ">=", "value": 40}
    assert evaluate_conditions([cond], state, actor="a") is True

def test_action_deal_damage():
    state = make_state()
    action = {"type": "deal_damage", "target": "opponent", "value": 30}
    apply_action(action, state, actor="a")
    assert state.hp_b == 70

def test_action_heal():
    state = make_state()
    state.hp_a = 60
    action = {"type": "heal", "target": "self", "value": 20}
    apply_action(action, state, actor="a")
    assert state.hp_a == 80

def test_action_heal_capped_at_initial():
    state = make_state()
    state.hp_a = 95
    action = {"type": "heal", "target": "self", "value": 20}
    apply_action(action, state, actor="a")
    assert state.hp_a == 100  # capped at initial_hp

def test_run_effects_trigger_match():
    state = make_state()
    state.hp_a = 20
    effects = [{
        "trigger": "on_attack",
        "conditions": [{"stat": "self.hp", "op": "<", "value": 30}],
        "actions": [{"type": "deal_damage", "target": "opponent", "value": 40}]
    }]
    run_effects(effects, trigger="on_attack", state=state, actor="a")
    assert state.hp_b == 60

def test_run_effects_trigger_mismatch():
    state = make_state()
    effects = [{
        "trigger": "on_defend",
        "conditions": [],
        "actions": [{"type": "deal_damage", "target": "opponent", "value": 40}]
    }]
    run_effects(effects, trigger="on_attack", state=state, actor="a")
    assert state.hp_b == 100  # no change
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pytest tests/test_battle_engine.py -k "condition or action or effects" -v
```

Expected: `ImportError`

- [ ] **Step 3: app/battle/engine.py 작성**

```python
# backend/app/battle/engine.py
from app.battle.state import BattleState

OPS = {
    "<":  lambda a, b: a < b,
    ">":  lambda a, b: a > b,
    "<=": lambda a, b: a <= b,
    ">=": lambda a, b: a >= b,
    "==": lambda a, b: a == b,
    "!=": lambda a, b: a != b,
}


def _resolve_stat(stat: str, state: BattleState, actor: str) -> int | float:
    opponent = "b" if actor == "a" else "a"
    mapping = {
        "self.hp":       getattr(state, f"hp_{actor}"),
        "self.resources": getattr(state, f"resources_{actor}"),
        "opponent.hp":   getattr(state, f"hp_{opponent}"),
        "opponent.resources": getattr(state, f"resources_{opponent}"),
    }
    if stat not in mapping:
        raise ValueError(f"Unknown stat: {stat}")
    return mapping[stat]


def evaluate_conditions(conditions: list[dict], state: BattleState, actor: str) -> bool:
    for cond in conditions:
        val = _resolve_stat(cond["stat"], state, actor)
        op_fn = OPS.get(cond["op"])
        if op_fn is None:
            raise ValueError(f"Unknown op: {cond['op']}")
        if not op_fn(val, cond["value"]):
            return False
    return True


def apply_action(action: dict, state: BattleState, actor: str) -> None:
    opponent = "b" if actor == "a" else "a"
    t = action["type"]
    v = action.get("value", 0)
    target = action.get("target", "opponent")
    target_player = actor if target == "self" else opponent

    if t == "deal_damage":
        cur = getattr(state, f"hp_{target_player}")
        setattr(state, f"hp_{target_player}", max(0, cur - v))
    elif t == "heal":
        cur = getattr(state, f"hp_{target_player}")
        setattr(state, f"hp_{target_player}", min(state.initial_hp, cur + v))
    elif t == "buff_stat":
        stat = action.get("stat", "resources")
        cur = getattr(state, f"{stat}_{target_player}", 0)
        setattr(state, f"{stat}_{target_player}", cur + v)
    elif t == "debuff_stat":
        stat = action.get("stat", "resources")
        cur = getattr(state, f"{stat}_{target_player}", 0)
        setattr(state, f"{stat}_{target_player}", max(0, cur - v))
    elif t == "draw_card":
        remaining = getattr(state, f"deck_remaining_{target_player}")
        hand = getattr(state, f"hand_{target_player}")
        for _ in range(min(v, len(remaining))):
            hand.append(remaining.pop(0))
    elif t == "discard_card":
        hand = getattr(state, f"hand_{target_player}")
        for _ in range(min(v, len(hand))):
            hand.pop()
    elif t == "skip_turn":
        pass  # handled at turn level


def run_effects(
    effects: list[dict],
    trigger: str,
    state: BattleState,
    actor: str,
) -> None:
    for effect in effects:
        if effect.get("trigger") != trigger:
            continue
        conditions = effect.get("conditions", [])
        if not evaluate_conditions(conditions, state, actor):
            continue
        for action in effect.get("actions", []):
            apply_action(action, state, actor)
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pytest tests/test_battle_engine.py -v
```

Expected: 전체 PASSED

- [ ] **Step 5: 커밋**

```bash
git add backend/app/battle/engine.py backend/tests/test_battle_engine.py
git commit -m "feat: JSON rule interpreter (conditions + actions + triggers)"
```

---

## Task 4: 배틀 HTTP 엔드포인트

**Files:**
- Create: `backend/app/schemas/battle.py`
- Create: `backend/app/routers/battles.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_battles_http.py`

- [ ] **Step 1: 실패하는 테스트 작성**

```python
# backend/tests/test_battles_http.py
import pytest

RULESET = {
    "deck_size": 3, "hand_limit": 5, "swap_interval": 3,
    "win_condition": "hp_zero", "turn_phases": ["draw", "main", "battle", "end"],
    "resource_system": "mana", "initial_resource": 1, "resource_per_turn": 1
}


async def _make_player(client, username, email):
    await client.post("/auth/register", json={"username": username, "email": email, "password": "pw123456"})
    r = await client.post("/auth/login", json={"email": email, "password": "pw123456"})
    return r.json()["access_token"]


async def _make_game_and_deck(client, token, username_prefix):
    g = await client.post("/games", json={"title": f"{username_prefix} Game", "is_public": True, "ruleset": RULESET},
                           headers={"Authorization": f"Bearer {token}"})
    game_id = g.json()["id"]
    cards = []
    for i in range(3):
        cr = await client.post(f"/games/{game_id}/cards",
                                json={"name": f"Card {i}", "attributes": {"hp": 100}, "effects": []},
                                headers={"Authorization": f"Bearer {token}"})
        cards.append(cr.json()["id"])
    d = await client.post(f"/games/{game_id}/decks", json={"name": "Deck", "card_ids": cards},
                           headers={"Authorization": f"Bearer {token}"})
    return game_id, d.json()["id"]


@pytest.mark.asyncio
async def test_create_battle(client):
    token = await _make_player(client, "fighter1", "f1@example.com")
    game_id, deck_id = await _make_game_and_deck(client, token, "f1")
    r = await client.post("/battles", json={"game_id": game_id, "deck_id": deck_id},
                           headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 201
    data = r.json()
    assert data["status"] == "waiting"
    assert data["player_a_id"] is not None
    assert "id" in data


@pytest.mark.asyncio
async def test_get_battle(client):
    token = await _make_player(client, "fighter2", "f2@example.com")
    game_id, deck_id = await _make_game_and_deck(client, token, "f2")
    cr = await client.post("/battles", json={"game_id": game_id, "deck_id": deck_id},
                            headers={"Authorization": f"Bearer {token}"})
    battle_id = cr.json()["id"]
    r = await client.get(f"/battles/{battle_id}", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["id"] == battle_id


@pytest.mark.asyncio
async def test_join_battle(client):
    token_a = await _make_player(client, "fighter3a", "f3a@example.com")
    token_b = await _make_player(client, "fighter3b", "f3b@example.com")
    game_id_a, deck_id_a = await _make_game_and_deck(client, token_a, "f3a")
    _, deck_id_b = await _make_game_and_deck(client, token_b, "f3b")
    # override: player_b uses player_a's game (same game)
    cr = await client.post("/battles", json={"game_id": game_id_a, "deck_id": deck_id_a},
                            headers={"Authorization": f"Bearer {token_a}"})
    battle_id = cr.json()["id"]
    # player_b joins
    r = await client.post(f"/battles/{battle_id}/join", json={"deck_id": deck_id_b},
                           headers={"Authorization": f"Bearer {token_b}"})
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "playing"
    assert data["player_b_id"] is not None
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pytest tests/test_battles_http.py -v
```

Expected: `FAILED` — 404

- [ ] **Step 3: app/schemas/battle.py 작성**

```python
# backend/app/schemas/battle.py
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class BattleCreate(BaseModel):
    game_id: uuid.UUID
    deck_id: uuid.UUID


class BattleJoin(BaseModel):
    deck_id: uuid.UUID


class BattleOut(BaseModel):
    id: uuid.UUID
    game_id: uuid.UUID
    player_a_id: uuid.UUID
    player_b_id: Optional[uuid.UUID]
    deck_a_id: uuid.UUID
    deck_b_id: Optional[uuid.UUID]
    status: str
    winner_id: Optional[uuid.UUID]
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: app/routers/battles.py 작성 (HTTP 부분)**

```python
# backend/app/routers/battles.py
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies import get_db, get_current_user
from app.models.battle import Battle, BattleStatus
from app.models.deck import Deck
from app.models.game import Game
from app.models.user import User
from app.schemas.battle import BattleCreate, BattleJoin, BattleOut
from app.redis import get_redis
from app.battle.state import init_battle_state, save_state, load_state
from app.battle.manager import ConnectionManager

router = APIRouter(prefix="/battles", tags=["battles"])
manager = ConnectionManager()


@router.post("", response_model=BattleOut, status_code=201)
async def create_battle(
    body: BattleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # validate game exists
    game_r = await db.execute(select(Game).where(Game.id == body.game_id))
    game = game_r.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    # validate deck belongs to user and same game
    deck_r = await db.execute(select(Deck).where(Deck.id == body.deck_id))
    deck = deck_r.scalar_one_or_none()
    if not deck or deck.owner_id != current_user.id or deck.game_id != body.game_id:
        raise HTTPException(status_code=400, detail="Invalid deck")

    battle = Battle(
        id=uuid.uuid4(),
        game_id=body.game_id,
        player_a_id=current_user.id,
        deck_a_id=body.deck_id,
        status=BattleStatus.waiting,
    )
    db.add(battle)
    await db.commit()
    await db.refresh(battle)
    return battle


@router.get("/{battle_id}", response_model=BattleOut)
async def get_battle(
    battle_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = await db.execute(select(Battle).where(Battle.id == battle_id))
    battle = r.scalar_one_or_none()
    if not battle:
        raise HTTPException(status_code=404, detail="Battle not found")
    return battle


@router.post("/{battle_id}/join", response_model=BattleOut)
async def join_battle(
    battle_id: uuid.UUID,
    body: BattleJoin,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = await db.execute(select(Battle).where(Battle.id == battle_id))
    battle = r.scalar_one_or_none()
    if not battle:
        raise HTTPException(status_code=404, detail="Battle not found")
    if battle.status != BattleStatus.waiting:
        raise HTTPException(status_code=400, detail="Battle not in waiting state")
    if battle.player_a_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot join your own battle")

    deck_r = await db.execute(select(Deck).where(Deck.id == body.deck_id))
    deck = deck_r.scalar_one_or_none()
    if not deck or deck.owner_id != current_user.id or deck.game_id != battle.game_id:
        raise HTTPException(status_code=400, detail="Invalid deck")

    # load both decks' card_ids
    deck_a_r = await db.execute(select(Deck).where(Deck.id == battle.deck_a_id))
    deck_a = deck_a_r.scalar_one()
    game_r = await db.execute(select(Game).where(Game.id == battle.game_id))
    game = game_r.scalar_one()

    battle.player_b_id = current_user.id
    battle.deck_b_id = body.deck_id
    battle.status = BattleStatus.playing
    battle.started_at = datetime.utcnow()
    await db.commit()
    await db.refresh(battle)

    # init Redis state
    redis = await get_redis()
    ruleset = game.ruleset
    state = init_battle_state(
        battle_id=str(battle.id),
        deck_a_card_ids=[str(c) for c in deck_a.card_ids],
        deck_b_card_ids=[str(c) for c in deck.card_ids],
        swap_interval=ruleset.get("swap_interval", 3),
        initial_hp=100,
        initial_resource=ruleset.get("initial_resource", 1),
    )
    await save_state(redis, state)
    return battle
```

- [ ] **Step 5: ConnectionManager 작성**

```python
# backend/app/battle/manager.py
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.rooms: dict[str, list[WebSocket]] = {}

    async def connect(self, battle_id: str, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(battle_id, []).append(ws)

    def disconnect(self, battle_id: str, ws: WebSocket):
        if battle_id in self.rooms:
            self.rooms[battle_id].discard(ws) if hasattr(self.rooms[battle_id], 'discard') else None
            try:
                self.rooms[battle_id].remove(ws)
            except ValueError:
                pass

    async def broadcast(self, battle_id: str, message: dict):
        import json
        for ws in list(self.rooms.get(battle_id, [])):
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                pass
```

- [ ] **Step 6: main.py에 battles 라우터 등록**

```python
from app.routers.battles import router as battles_router
app.include_router(battles_router)
```

- [ ] **Step 7: 테스트 통과 확인**

```bash
pytest tests/test_battles_http.py -v
```

Expected: 3 PASSED

- [ ] **Step 8: 커밋**

```bash
git add backend/app/schemas/battle.py backend/app/routers/battles.py backend/app/battle/manager.py backend/app/main.py backend/tests/test_battles_http.py
git commit -m "feat: battle HTTP endpoints (create/get/join)"
```

---

## Task 5: WebSocket 배틀 엔진

**Files:**
- Modify: `backend/app/routers/battles.py` (WS endpoint 추가)
- Create: `backend/tests/test_battle_ws.py`

- [ ] **Step 1: 실패하는 테스트 작성**

```python
# backend/tests/test_battle_ws.py
import json
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

RULESET = {
    "deck_size": 3, "hand_limit": 5, "swap_interval": 3,
    "win_condition": "hp_zero", "turn_phases": ["draw", "main", "battle", "end"],
    "resource_system": "mana", "initial_resource": 1, "resource_per_turn": 1
}


async def _full_setup(client):
    """Create two players, a game, decks, a battle, join it. Returns battle_id + tokens."""
    async def make_player(u, e):
        await client.post("/auth/register", json={"username": u, "email": e, "password": "pw"})
        r = await client.post("/auth/login", json={"email": e, "password": "pw"})
        return r.json()["access_token"]

    ta = await make_player("ws_a", "wsa@example.com")
    tb = await make_player("ws_b", "wsb@example.com")

    g = await client.post("/games", json={"title": "WS Game", "is_public": True, "ruleset": RULESET},
                           headers={"Authorization": f"Bearer {ta}"})
    game_id = g.json()["id"]

    async def make_deck(token):
        cards = []
        for i in range(3):
            cr = await client.post(f"/games/{game_id}/cards",
                                    json={"name": f"WC{i}", "attributes": {"hp": 100}, "effects": []},
                                    headers={"Authorization": f"Bearer {token}"})
            cards.append(cr.json()["id"])
        d = await client.post(f"/games/{game_id}/decks", json={"name": "D", "card_ids": cards},
                               headers={"Authorization": f"Bearer {token}"})
        return d.json()["id"]

    deck_a = await make_deck(ta)
    deck_b = await make_deck(tb)

    cr = await client.post("/battles", json={"game_id": game_id, "deck_id": deck_a},
                            headers={"Authorization": f"Bearer {ta}"})
    battle_id = cr.json()["id"]
    await client.post(f"/battles/{battle_id}/join", json={"deck_id": deck_b},
                       headers={"Authorization": f"Bearer {tb}"})
    return battle_id, ta, tb


@pytest.mark.asyncio
async def test_ws_connect_and_get_state(client):
    battle_id, ta, _ = await _full_setup(client)
    from httpx_ws import aconnect_ws
    async with aconnect_ws(f"/battles/{battle_id}/ws?token={ta}", app) as ws:
        msg = await ws.receive_json()
        assert msg["type"] == "state"
        assert "hp_a" in msg["data"]
        assert "deck_for_a" in msg["data"]


@pytest.mark.asyncio
async def test_ws_attack_action(client):
    battle_id, ta, _ = await _full_setup(client)
    from httpx_ws import aconnect_ws
    async with aconnect_ws(f"/battles/{battle_id}/ws?token={ta}", app) as ws:
        await ws.receive_json()  # initial state
        await ws.send_json({"action": "attack", "card_id": None, "value": 20})
        msg = await ws.receive_json()
        assert msg["type"] == "state"
        assert msg["data"]["hp_b"] == 80
```

Note: `httpx-ws` 라이브러리 필요. requirements에 추가.

- [ ] **Step 2: requirements.txt에 httpx-ws 추가**

```
httpx-ws==0.6.0
```

설치:
```bash
pip install httpx-ws==0.6.0
```

- [ ] **Step 3: WS 엔드포인트 추가 (battles.py에 append)**

```python
# append to backend/app/routers/battles.py

@router.websocket("/{battle_id}/ws")
async def battle_ws(
    battle_id: uuid.UUID,
    ws: WebSocket,
    token: str,
    db: AsyncSession = Depends(get_db),
):
    from app.services.auth import decode_access_token
    from app.models.user import User
    from sqlalchemy import select
    import json

    # auth via query param token
    try:
        user_id = decode_access_token(token)
    except Exception:
        await ws.close(code=4001)
        return

    user_r = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = user_r.scalar_one_or_none()
    if not user:
        await ws.close(code=4001)
        return

    # load battle
    battle_r = await db.execute(select(Battle).where(Battle.id == battle_id))
    battle = battle_r.scalar_one_or_none()
    if not battle or battle.status != BattleStatus.playing:
        await ws.close(code=4002)
        return

    if user.id not in (battle.player_a_id, battle.player_b_id):
        await ws.close(code=4003)
        return

    actor = "a" if user.id == battle.player_a_id else "b"

    await manager.connect(str(battle_id), ws)
    redis = await get_redis()

    try:
        # send current state on connect
        state = await load_state(redis, str(battle_id))
        if state:
            await ws.send_text(json.dumps({"type": "state", "data": state.model_dump()}))

        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            action = msg.get("action")

            state = await load_state(redis, str(battle_id))
            if not state:
                break

            if state.active_player != actor:
                await ws.send_text(json.dumps({"type": "error", "detail": "Not your turn"}))
                continue

            if action == "attack":
                from app.battle.engine import run_effects
                value = msg.get("value", 10)
                # base damage
                from app.battle.state import BattleState
                opponent = "b" if actor == "a" else "a"
                cur_hp = getattr(state, f"hp_{opponent}")
                setattr(state, f"hp_{opponent}", max(0, cur_hp - value))

                # card effects if card_id provided
                card_id = msg.get("card_id")
                if card_id:
                    from app.models.card import Card
                    card_r = await db.execute(select(Card).where(Card.id == uuid.UUID(card_id)))
                    card = card_r.scalar_one_or_none()
                    if card:
                        run_effects(card.effects or [], trigger="on_attack", state=state, actor=actor)

                # advance turn
                state.turn_number += 1
                state.active_player = opponent

                # check swap
                if state.should_swap():
                    state.perform_swap()
                    await save_state(redis, state)
                    await manager.broadcast(str(battle_id), {
                        "type": "swap",
                        "data": {"deck_for_a": state.deck_for_a, "deck_for_b": state.deck_for_b}
                    })

                # check win
                if getattr(state, f"hp_{opponent}") <= 0:
                    battle.status = BattleStatus.done
                    battle.winner_id = user.id
                    battle.ended_at = datetime.utcnow()
                    await db.commit()
                    await save_state(redis, state)
                    await manager.broadcast(str(battle_id), {
                        "type": "game_over",
                        "data": {"winner": actor}
                    })
                    break

                await save_state(redis, state)
                await manager.broadcast(str(battle_id), {"type": "state", "data": state.model_dump()})

            elif action == "end_turn":
                opponent = "b" if actor == "a" else "a"
                state.turn_number += 1
                state.active_player = opponent
                if state.should_swap():
                    state.perform_swap()
                    await manager.broadcast(str(battle_id), {
                        "type": "swap",
                        "data": {"deck_for_a": state.deck_for_a, "deck_for_b": state.deck_for_b}
                    })
                await save_state(redis, state)
                await manager.broadcast(str(battle_id), {"type": "state", "data": state.model_dump()})

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(str(battle_id), ws)
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pytest tests/test_battle_ws.py -v
```

Expected: 2 PASSED

- [ ] **Step 5: 전체 테스트 스위트 통과 확인**

```bash
pytest -v
```

Expected: 전체 PASSED

- [ ] **Step 6: 커밋**

```bash
git add backend/app/routers/battles.py backend/tests/test_battle_ws.py backend/requirements.txt
git commit -m "feat: WebSocket battle engine with deck swap and rule interpreter"
```

---

## 다음 단계

- **Plan 3:** React Native Frontend — 블록 빌더 UI, 배틀 화면, 덱 빌더
