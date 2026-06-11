# CardCard Backend Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** FastAPI 백엔드 기반 구축 — Auth, Game/Card/Deck CRUD, PostgreSQL 모델. Battle Engine (Plan 2)과 Frontend (Plan 3)의 의존성.

**Architecture:** Async FastAPI + SQLAlchemy 2.0 (asyncpg) + PostgreSQL. JWT 인증. JSONB 컬럼으로 카드 효과/속성과 게임 룰셋 저장. Docker Compose 로컬 개발.

**Tech Stack:** Python 3.11, FastAPI 0.110, SQLAlchemy 2.0 async, asyncpg, Alembic, Pydantic v2, python-jose[cryptography], bcrypt, pytest-asyncio, httpx

---

## File Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app, router 등록
│   ├── config.py            # 환경 변수 (Settings)
│   ├── database.py          # SQLAlchemy engine + session
│   ├── dependencies.py      # get_db, get_current_user
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── game.py
│   │   ├── card.py
│   │   ├── deck.py
│   │   └── battle.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── game.py
│   │   ├── card.py
│   │   └── deck.py
│   └── routers/
│       ├── __init__.py
│       ├── auth.py
│       ├── games.py
│       ├── cards.py
│       └── decks.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_games.py
│   ├── test_cards.py
│   └── test_decks.py
├── alembic/
│   ├── env.py
│   └── versions/
├── alembic.ini
├── requirements.txt
├── .env.example
├── Dockerfile
└── docker-compose.yml
```

---

## Task 1: 프로젝트 설정

**Files:**
- Create: `backend/docker-compose.yml`
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/app/__init__.py` (empty)
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`
- Create: `backend/app/database.py`

- [ ] **Step 1: docker-compose.yml 작성**

```yaml
# backend/docker-compose.yml
version: "3.9"
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: cardcard
      POSTGRES_PASSWORD: cardcard
      POSTGRES_DB: cardcard
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init-test-db.sql:/docker-entrypoint-initdb.d/init-test-db.sql

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

- [ ] **Step 2: 테스트 DB 초기화 스크립트 작성**

```sql
-- backend/init-test-db.sql
CREATE DATABASE cardcard_test;
GRANT ALL PRIVILEGES ON DATABASE cardcard_test TO cardcard;
```

- [ ] **Step 3: requirements.txt 작성**

```
fastapi==0.110.0
uvicorn[standard]==0.29.0
sqlalchemy[asyncio]==2.0.29
asyncpg==0.29.0
psycopg2-binary==2.9.9
alembic==1.13.1
pydantic[email]==2.6.4
pydantic-settings==2.2.1
python-jose[cryptography]==3.3.0
bcrypt==4.1.2
python-multipart==0.0.9
pytest==8.1.1
pytest-asyncio==0.23.6
httpx==0.27.0
```

- [ ] **Step 4: .env.example 작성**

```
DATABASE_URL=postgresql+asyncpg://cardcard:cardcard@localhost:5432/cardcard
TEST_DATABASE_URL=postgresql+asyncpg://cardcard:cardcard@localhost:5432/cardcard_test
SECRET_KEY=changeme-use-openssl-rand-hex-32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

- [ ] **Step 5: app/config.py 작성**

```python
# backend/app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    TEST_DATABASE_URL: str = ""
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    model_config = {"env_file": ".env"}

settings = Settings()
```

- [ ] **Step 6: app/database.py 작성**

```python
# backend/app/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass
```

- [ ] **Step 7: app/main.py 작성**

```python
# backend/app/main.py
from fastapi import FastAPI

app = FastAPI(title="CardCard API")

@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 8: Docker 기동 확인**

```bash
cd backend
cp .env.example .env
docker compose up -d
pip install -r requirements.txt
uvicorn app.main:app --reload
```

`http://localhost:8000/health` → `{"status":"ok"}` 확인

- [ ] **Step 9: 커밋**

```bash
git init
git add backend/
git commit -m "chore: initial project setup with FastAPI + Docker"
```

---

## Task 2: SQLAlchemy 모델 + Alembic

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/game.py`
- Create: `backend/app/models/card.py`
- Create: `backend/app/models/deck.py`
- Create: `backend/app/models/battle.py`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`

- [ ] **Step 1: app/models/user.py 작성**

```python
# backend/app/models/user.py
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 2: app/models/game.py 작성**

```python
# backend/app/models/game.py
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Game(Base):
    __tablename__ = "games"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    creator_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(String(1000), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    invite_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=True)
    ruleset: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

**ruleset JSONB 스키마 (런타임 참조용):**
```json
{
  "deck_size": 20,
  "hand_limit": 5,
  "swap_interval": 3,
  "win_condition": "hp_zero",
  "turn_phases": ["draw", "main", "battle", "end"],
  "resource_system": "mana",
  "initial_resource": 1,
  "resource_per_turn": 1
}
```

- [ ] **Step 3: app/models/card.py 작성**

```python
# backend/app/models/card.py
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Card(Base):
    __tablename__ = "cards"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    game_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    image_url: Mapped[str] = mapped_column(String(500), nullable=True)
    attributes: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    effects: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

**effects JSONB 구조:**
```json
[{
  "trigger": "on_attack",
  "conditions": [{"stat": "self.hp", "op": "<", "value": 30}],
  "actions": [
    {"type": "deal_damage", "target": "opponent", "value": 40},
    {"type": "heal", "target": "self", "value": 10}
  ]
}]
```

- [ ] **Step 4: app/models/deck.py 작성**

```python
# backend/app/models/deck.py
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Deck(Base):
    __tablename__ = "decks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    game_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    card_ids: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 5: app/models/battle.py 작성**

```python
# backend/app/models/battle.py
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
import enum

class BattleStatus(str, enum.Enum):
    waiting = "waiting"
    playing = "playing"
    done = "done"

class Battle(Base):
    __tablename__ = "battles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    game_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("games.id"), nullable=False)
    player_a_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    player_b_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=True)
    deck_a_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("decks.id"), nullable=False)
    deck_b_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("decks.id"), nullable=True)
    status: Mapped[BattleStatus] = mapped_column(default=BattleStatus.waiting)
    winner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 6: app/models/__init__.py 작성 (모든 모델 임포트)**

```python
# backend/app/models/__init__.py
from app.models.user import User
from app.models.game import Game
from app.models.card import Card
from app.models.deck import Deck
from app.models.battle import Battle
```

- [ ] **Step 7: Alembic 초기화**

```bash
cd backend
alembic init alembic
```

- [ ] **Step 8: alembic/env.py 수정**

`alembic/env.py` 의 상단 임포트 블록 뒤에 추가:

```python
# alembic/env.py (수정 부분)
import os
from app.database import Base
from app.models import User, Game, Card, Deck, Battle
from app.config import settings

# config 객체에서 sqlalchemy.url 설정
config.set_main_option(
    "sqlalchemy.url",
    settings.DATABASE_URL.replace("+asyncpg", "")  # alembic은 sync URL 사용
)

target_metadata = Base.metadata
```

- [ ] **Step 9: 첫 마이그레이션 생성 및 적용**

```bash
cd backend
alembic revision --autogenerate -m "initial tables"
alembic upgrade head
```

Expected: 5개 테이블 생성 (users, games, cards, decks, battles)

- [ ] **Step 10: 커밋**

```bash
git add backend/app/models/ backend/alembic/ backend/alembic.ini
git commit -m "feat: SQLAlchemy models and initial migration"
```

---

## Task 3: 테스트 인프라

**Files:**
- Create: `backend/tests/__init__.py` (empty)
- Create: `backend/tests/conftest.py`
- Create: `backend/pytest.ini`

- [ ] **Step 1: pytest.ini 작성**

```ini
# backend/pytest.ini
[pytest]
asyncio_mode = auto
testpaths = tests
```

- [ ] **Step 2: tests/conftest.py 작성**

```python
# backend/tests/conftest.py
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.database import Base
from app.main import app
from app.dependencies import get_db
from app.config import settings

TEST_DATABASE_URL = settings.TEST_DATABASE_URL

@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest_asyncio.fixture
async def db(test_engine):
    TestSession = async_sessionmaker(test_engine, expire_on_commit=False)
    async with TestSession() as session:
        yield session
        await session.rollback()

@pytest_asyncio.fixture
async def client(db):
    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
```

- [ ] **Step 3: app/dependencies.py 작성**

```python
# backend/app/dependencies.py
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
```

- [ ] **Step 4: 테스트 인프라 동작 확인**

`tests/test_health.py` 임시 파일 생성:
```python
# backend/tests/test_health.py
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
```

```bash
cd backend
pytest tests/test_health.py -v
```

Expected: `PASSED`

- [ ] **Step 5: test_health.py 삭제 + 커밋**

```bash
rm tests/test_health.py
git add backend/tests/ backend/app/dependencies.py backend/pytest.ini
git commit -m "test: add async test infrastructure with PostgreSQL"
```

---

## Task 4: Auth — 회원가입

**Files:**
- Create: `backend/app/schemas/user.py`
- Create: `backend/app/routers/auth.py`
- Create: `backend/app/services/auth.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_auth.py`

- [ ] **Step 1: 실패하는 테스트 작성**

```python
# backend/tests/test_auth.py
import pytest

async def test_register_success(client):
    r = await client.post("/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123"
    })
    assert r.status_code == 201
    data = r.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"
    assert "id" in data
    assert "password_hash" not in data

async def test_register_duplicate_email(client):
    payload = {"username": "user1", "email": "dup@example.com", "password": "pw123456"}
    await client.post("/auth/register", json=payload)
    payload["username"] = "user2"
    r = await client.post("/auth/register", json=payload)
    assert r.status_code == 409

async def test_register_duplicate_username(client):
    payload = {"username": "dupuser", "email": "a@example.com", "password": "pw123456"}
    await client.post("/auth/register", json=payload)
    payload["email"] = "b@example.com"
    r = await client.post("/auth/register", json=payload)
    assert r.status_code == 409
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd backend
pytest tests/test_auth.py -v
```

Expected: `FAILED` — `404 Not Found` (라우터 없음)

- [ ] **Step 3: app/schemas/user.py 작성**

```python
# backend/app/schemas/user.py
import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: app/services/auth.py 작성**

```python
# backend/app/services/auth.py
from datetime import datetime, timedelta
import bcrypt
from jose import jwt
from app.config import settings

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_access_token(token: str) -> str:
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    return payload["sub"]
```

- [ ] **Step 5: app/routers/auth.py 작성 (register만)**

```python
# backend/app/routers/auth.py
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserOut
from app.services.auth import hash_password

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserOut, status_code=201)
async def register(body: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        select(User).where((User.email == body.email) | (User.username == body.username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username or email already exists")

    user = User(
        id=uuid.uuid4(),
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
```

- [ ] **Step 6: main.py에 라우터 등록**

```python
# backend/app/main.py
from fastapi import FastAPI
from app.routers.auth import router as auth_router

app = FastAPI(title="CardCard API")
app.include_router(auth_router)

@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 7: 테스트 통과 확인**

```bash
pytest tests/test_auth.py::test_register_success tests/test_auth.py::test_register_duplicate_email tests/test_auth.py::test_register_duplicate_username -v
```

Expected: 3개 `PASSED`

- [ ] **Step 8: 커밋**

```bash
git add backend/app/schemas/user.py backend/app/services/auth.py backend/app/routers/auth.py backend/app/main.py
git commit -m "feat: user registration endpoint"
```

---

## Task 5: Auth — 로그인 + 인증 미들웨어

**Files:**
- Modify: `backend/app/routers/auth.py`
- Modify: `backend/app/dependencies.py`
- Modify: `backend/tests/test_auth.py`

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/test_auth.py` 에 추가:

```python
async def test_login_success(client):
    await client.post("/auth/register", json={
        "username": "loginuser",
        "email": "login@example.com",
        "password": "password123"
    })
    r = await client.post("/auth/login", json={
        "email": "login@example.com",
        "password": "password123"
    })
    assert r.status_code == 200
    assert "access_token" in r.json()
    assert r.json()["token_type"] == "bearer"

async def test_login_wrong_password(client):
    await client.post("/auth/register", json={
        "username": "loginuser2",
        "email": "login2@example.com",
        "password": "password123"
    })
    r = await client.post("/auth/login", json={
        "email": "login2@example.com",
        "password": "wrongpassword"
    })
    assert r.status_code == 401

async def test_protected_route_without_token(client):
    r = await client.get("/auth/me")
    assert r.status_code == 401

async def test_protected_route_with_token(client):
    await client.post("/auth/register", json={
        "username": "meuser",
        "email": "me@example.com",
        "password": "password123"
    })
    login = await client.post("/auth/login", json={
        "email": "me@example.com",
        "password": "password123"
    })
    token = login.json()["access_token"]
    r = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "me@example.com"
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pytest tests/test_auth.py -v -k "login or protected"
```

Expected: `FAILED`

- [ ] **Step 3: app/schemas/user.py에 LoginRequest, TokenOut 추가**

```python
# backend/app/schemas/user.py 에 추가
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
```

- [ ] **Step 4: app/routers/auth.py에 login + me 추가**

```python
# backend/app/routers/auth.py 전체
import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, LoginRequest, TokenOut
from app.services.auth import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer()

@router.post("/register", response_model=UserOut, status_code=201)
async def register(body: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        select(User).where((User.email == body.email) | (User.username == body.username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username or email already exists")
    user = User(id=uuid.uuid4(), username=body.username, email=body.email, password_hash=hash_password(body.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/login", response_model=TokenOut)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"access_token": create_access_token(str(user.id))}

@router.get("/me", response_model=UserOut)
async def me(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
):
    try:
        user_id = decode_access_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
```

- [ ] **Step 5: app/dependencies.py에 get_current_user 추가**

```python
# backend/app/dependencies.py
import uuid
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.services.auth import decode_access_token

bearer_scheme = HTTPBearer()

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
):
    from app.models.user import User
    try:
        user_id = decode_access_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
```

- [ ] **Step 6: 테스트 통과 확인**

```bash
pytest tests/test_auth.py -v
```

Expected: 전체 `PASSED`

- [ ] **Step 7: 커밋**

```bash
git add backend/app/routers/auth.py backend/app/dependencies.py backend/app/schemas/user.py backend/tests/test_auth.py
git commit -m "feat: login endpoint and JWT auth dependency"
```

---

## Task 6: Games API

**Files:**
- Create: `backend/app/schemas/game.py`
- Create: `backend/app/routers/games.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_games.py`

- [ ] **Step 1: 실패하는 테스트 작성**

```python
# backend/tests/test_games.py
import pytest

async def _register_and_login(client, username="gamer", email="gamer@example.com"):
    await client.post("/auth/register", json={"username": username, "email": email, "password": "pw123456"})
    r = await client.post("/auth/login", json={"email": email, "password": "pw123456"})
    return r.json()["access_token"]

RULESET = {
    "deck_size": 20,
    "hand_limit": 5,
    "swap_interval": 3,
    "win_condition": "hp_zero",
    "turn_phases": ["draw", "main", "battle", "end"],
    "resource_system": "mana",
    "initial_resource": 1,
    "resource_per_turn": 1
}

async def test_create_game(client):
    token = await _register_and_login(client, "creator1", "c1@example.com")
    r = await client.post("/games", json={
        "title": "My Dragon Game",
        "description": "Dragons battle",
        "is_public": True,
        "ruleset": RULESET
    }, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 201
    data = r.json()
    assert data["title"] == "My Dragon Game"
    assert data["ruleset"]["swap_interval"] == 3
    assert "id" in data

async def test_create_game_unauthenticated(client):
    r = await client.post("/games", json={"title": "x", "ruleset": RULESET})
    assert r.status_code == 401

async def test_list_public_games(client):
    token = await _register_and_login(client, "creator2", "c2@example.com")
    await client.post("/games", json={"title": "Public Game", "is_public": True, "ruleset": RULESET},
                      headers={"Authorization": f"Bearer {token}"})
    r = await client.get("/games")
    assert r.status_code == 200
    games = r.json()
    assert isinstance(games, list)
    assert any(g["title"] == "Public Game" for g in games)

async def test_get_game_by_id(client):
    token = await _register_and_login(client, "creator3", "c3@example.com")
    create_r = await client.post("/games", json={"title": "Fetch Me", "is_public": True, "ruleset": RULESET},
                                  headers={"Authorization": f"Bearer {token}"})
    game_id = create_r.json()["id"]
    r = await client.get(f"/games/{game_id}")
    assert r.status_code == 200
    assert r.json()["id"] == game_id

async def test_update_game_by_creator(client):
    token = await _register_and_login(client, "creator4", "c4@example.com")
    create_r = await client.post("/games", json={"title": "Old Title", "is_public": True, "ruleset": RULESET},
                                  headers={"Authorization": f"Bearer {token}"})
    game_id = create_r.json()["id"]
    r = await client.put(f"/games/{game_id}", json={"title": "New Title"},
                          headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["title"] == "New Title"

async def test_update_game_by_non_creator(client):
    token1 = await _register_and_login(client, "creator5", "c5@example.com")
    token2 = await _register_and_login(client, "other5", "o5@example.com")
    create_r = await client.post("/games", json={"title": "Owned", "is_public": True, "ruleset": RULESET},
                                  headers={"Authorization": f"Bearer {token1}"})
    game_id = create_r.json()["id"]
    r = await client.put(f"/games/{game_id}", json={"title": "Stolen"},
                          headers={"Authorization": f"Bearer {token2}"})
    assert r.status_code == 403
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pytest tests/test_games.py -v
```

Expected: `FAILED` — `404`

- [ ] **Step 3: app/schemas/game.py 작성**

```python
# backend/app/schemas/game.py
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class RulesetSchema(BaseModel):
    deck_size: int = 20
    hand_limit: int = 5
    swap_interval: int = 3
    win_condition: str = "hp_zero"
    turn_phases: list[str] = ["draw", "main", "battle", "end"]
    resource_system: str = "mana"
    initial_resource: int = 1
    resource_per_turn: int = 1

class GameCreate(BaseModel):
    title: str
    description: Optional[str] = None
    is_public: bool = True
    invite_code: Optional[str] = None
    ruleset: RulesetSchema

class GameUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    ruleset: Optional[RulesetSchema] = None

class GameOut(BaseModel):
    id: uuid.UUID
    creator_id: uuid.UUID
    title: str
    description: Optional[str]
    is_public: bool
    invite_code: Optional[str]
    ruleset: dict
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: app/routers/games.py 작성**

```python
# backend/app/routers/games.py
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
```

- [ ] **Step 5: main.py에 games 라우터 등록**

```python
# backend/app/main.py
from fastapi import FastAPI
from app.routers.auth import router as auth_router
from app.routers.games import router as games_router

app = FastAPI(title="CardCard API")
app.include_router(auth_router)
app.include_router(games_router)

@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 6: 테스트 통과 확인**

```bash
pytest tests/test_games.py -v
```

Expected: 전체 `PASSED`

- [ ] **Step 7: 커밋**

```bash
git add backend/app/schemas/game.py backend/app/routers/games.py backend/app/main.py backend/tests/test_games.py
git commit -m "feat: games CRUD endpoints"
```

---

## Task 7: Cards API

**Files:**
- Create: `backend/app/schemas/card.py`
- Create: `backend/app/routers/cards.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_cards.py`

- [ ] **Step 1: 실패하는 테스트 작성**

```python
# backend/tests/test_cards.py
import pytest

RULESET = {
    "deck_size": 20, "hand_limit": 5, "swap_interval": 3,
    "win_condition": "hp_zero", "turn_phases": ["draw", "main", "battle", "end"],
    "resource_system": "mana", "initial_resource": 1, "resource_per_turn": 1
}

async def _setup(client, username, email):
    await client.post("/auth/register", json={"username": username, "email": email, "password": "pw123456"})
    r = await client.post("/auth/login", json={"email": email, "password": "pw123456"})
    token = r.json()["access_token"]
    g = await client.post("/games", json={"title": "Card Test Game", "is_public": True, "ruleset": RULESET},
                           headers={"Authorization": f"Bearer {token}"})
    return token, g.json()["id"]

CARD_PAYLOAD = {
    "name": "Fire Dragon",
    "attributes": {"hp": 120, "attack": 80, "element": "fire"},
    "effects": [{
        "trigger": "on_attack",
        "conditions": [{"stat": "self.hp", "op": "<", "value": 30}],
        "actions": [{"type": "deal_damage", "target": "opponent", "value": 40}]
    }]
}

async def test_create_card(client):
    token, game_id = await _setup(client, "cardmaker1", "cm1@example.com")
    r = await client.post(f"/games/{game_id}/cards", json=CARD_PAYLOAD,
                           headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Fire Dragon"
    assert data["attributes"]["hp"] == 120
    assert len(data["effects"]) == 1

async def test_list_cards(client):
    token, game_id = await _setup(client, "cardmaker2", "cm2@example.com")
    await client.post(f"/games/{game_id}/cards", json=CARD_PAYLOAD,
                      headers={"Authorization": f"Bearer {token}"})
    r = await client.get(f"/games/{game_id}/cards")
    assert r.status_code == 200
    assert len(r.json()) >= 1

async def test_update_card(client):
    token, game_id = await _setup(client, "cardmaker3", "cm3@example.com")
    cr = await client.post(f"/games/{game_id}/cards", json=CARD_PAYLOAD,
                            headers={"Authorization": f"Bearer {token}"})
    card_id = cr.json()["id"]
    r = await client.put(f"/games/{game_id}/cards/{card_id}",
                          json={"name": "Updated Dragon"},
                          headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["name"] == "Updated Dragon"

async def test_delete_card(client):
    token, game_id = await _setup(client, "cardmaker4", "cm4@example.com")
    cr = await client.post(f"/games/{game_id}/cards", json=CARD_PAYLOAD,
                            headers={"Authorization": f"Bearer {token}"})
    card_id = cr.json()["id"]
    r = await client.delete(f"/games/{game_id}/cards/{card_id}",
                             headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 204
    r2 = await client.get(f"/games/{game_id}/cards")
    assert all(c["id"] != card_id for c in r2.json())
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pytest tests/test_cards.py -v
```

Expected: `FAILED`

- [ ] **Step 3: app/schemas/card.py 작성**

```python
# backend/app/schemas/card.py
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class CardCreate(BaseModel):
    name: str
    image_url: Optional[str] = None
    attributes: dict = {}
    effects: list = []

class CardUpdate(BaseModel):
    name: Optional[str] = None
    image_url: Optional[str] = None
    attributes: Optional[dict] = None
    effects: Optional[list] = None

class CardOut(BaseModel):
    id: uuid.UUID
    game_id: uuid.UUID
    name: str
    image_url: Optional[str]
    attributes: dict
    effects: list
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: app/routers/cards.py 작성**

```python
# backend/app/routers/cards.py
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies import get_db, get_current_user
from app.models.card import Card
from app.models.game import Game
from app.models.user import User
from app.schemas.card import CardCreate, CardUpdate, CardOut

router = APIRouter(prefix="/games/{game_id}/cards", tags=["cards"])

async def _get_game_as_creator(game_id: uuid.UUID, db: AsyncSession, current_user: User) -> Game:
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if game.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the creator")
    return game

@router.get("", response_model=list[CardOut])
async def list_cards(game_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Card).where(Card.game_id == game_id))
    return result.scalars().all()

@router.post("", response_model=CardOut, status_code=201)
async def create_card(
    game_id: uuid.UUID,
    body: CardCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_game_as_creator(game_id, db, current_user)
    card = Card(
        id=uuid.uuid4(),
        game_id=game_id,
        name=body.name,
        image_url=body.image_url,
        attributes=body.attributes,
        effects=body.effects,
    )
    db.add(card)
    await db.commit()
    await db.refresh(card)
    return card

@router.put("/{card_id}", response_model=CardOut)
async def update_card(
    game_id: uuid.UUID,
    card_id: uuid.UUID,
    body: CardUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_game_as_creator(game_id, db, current_user)
    result = await db.execute(select(Card).where(Card.id == card_id, Card.game_id == game_id))
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    if body.name is not None:
        card.name = body.name
    if body.image_url is not None:
        card.image_url = body.image_url
    if body.attributes is not None:
        card.attributes = body.attributes
    if body.effects is not None:
        card.effects = body.effects
    await db.commit()
    await db.refresh(card)
    return card

@router.delete("/{card_id}", status_code=204)
async def delete_card(
    game_id: uuid.UUID,
    card_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_game_as_creator(game_id, db, current_user)
    result = await db.execute(select(Card).where(Card.id == card_id, Card.game_id == game_id))
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    await db.delete(card)
    await db.commit()
```

- [ ] **Step 5: main.py에 cards 라우터 등록**

```python
# backend/app/main.py
from fastapi import FastAPI
from app.routers.auth import router as auth_router
from app.routers.games import router as games_router
from app.routers.cards import router as cards_router

app = FastAPI(title="CardCard API")
app.include_router(auth_router)
app.include_router(games_router)
app.include_router(cards_router)

@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 6: 테스트 통과 확인**

```bash
pytest tests/test_cards.py -v
```

Expected: 전체 `PASSED`

- [ ] **Step 7: 커밋**

```bash
git add backend/app/schemas/card.py backend/app/routers/cards.py backend/app/main.py backend/tests/test_cards.py
git commit -m "feat: cards CRUD endpoints"
```

---

## Task 8: Decks API

**Files:**
- Create: `backend/app/schemas/deck.py`
- Create: `backend/app/routers/decks.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_decks.py`

- [ ] **Step 1: 실패하는 테스트 작성**

```python
# backend/tests/test_decks.py
import pytest

RULESET = {
    "deck_size": 3, "hand_limit": 5, "swap_interval": 3,
    "win_condition": "hp_zero", "turn_phases": ["draw", "main", "battle", "end"],
    "resource_system": "mana", "initial_resource": 1, "resource_per_turn": 1
}

async def _setup(client, username, email):
    await client.post("/auth/register", json={"username": username, "email": email, "password": "pw123456"})
    r = await client.post("/auth/login", json={"email": email, "password": "pw123456"})
    token = r.json()["access_token"]
    g = await client.post("/games", json={"title": "Deck Test Game", "is_public": True, "ruleset": RULESET},
                           headers={"Authorization": f"Bearer {token}"})
    game_id = g.json()["id"]
    cards = []
    for i in range(3):
        cr = await client.post(f"/games/{game_id}/cards",
                                json={"name": f"Card {i}", "attributes": {"hp": 100}, "effects": []},
                                headers={"Authorization": f"Bearer {token}"})
        cards.append(cr.json()["id"])
    return token, game_id, cards

async def test_create_deck(client):
    token, game_id, card_ids = await _setup(client, "deckbuilder1", "db1@example.com")
    r = await client.post(f"/games/{game_id}/decks", json={
        "name": "My First Deck",
        "card_ids": card_ids
    }, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "My First Deck"
    assert len(data["card_ids"]) == 3

async def test_create_deck_wrong_size(client):
    token, game_id, card_ids = await _setup(client, "deckbuilder2", "db2@example.com")
    r = await client.post(f"/games/{game_id}/decks", json={
        "name": "Too Big",
        "card_ids": card_ids + [card_ids[0]]
    }, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 422

async def test_get_deck(client):
    token, game_id, card_ids = await _setup(client, "deckbuilder3", "db3@example.com")
    cr = await client.post(f"/games/{game_id}/decks", json={"name": "Fetchable", "card_ids": card_ids},
                            headers={"Authorization": f"Bearer {token}"})
    deck_id = cr.json()["id"]
    r = await client.get(f"/decks/{deck_id}", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["id"] == deck_id

async def test_list_my_decks(client):
    token, game_id, card_ids = await _setup(client, "deckbuilder4", "db4@example.com")
    await client.post(f"/games/{game_id}/decks", json={"name": "Deck A", "card_ids": card_ids},
                      headers={"Authorization": f"Bearer {token}"})
    r = await client.get(f"/games/{game_id}/decks/mine", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert any(d["name"] == "Deck A" for d in r.json())
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pytest tests/test_decks.py -v
```

Expected: `FAILED`

- [ ] **Step 3: app/schemas/deck.py 작성**

```python
# backend/app/schemas/deck.py
import uuid
from datetime import datetime
from pydantic import BaseModel

class DeckCreate(BaseModel):
    name: str
    card_ids: list[str]

class DeckOut(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    game_id: uuid.UUID
    name: str
    card_ids: list
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: app/routers/decks.py 작성**

```python
# backend/app/routers/decks.py
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies import get_db, get_current_user
from app.models.deck import Deck
from app.models.game import Game
from app.models.user import User
from app.schemas.deck import DeckCreate, DeckOut

router = APIRouter(tags=["decks"])

@router.post("/games/{game_id}/decks", response_model=DeckOut, status_code=201)
async def create_deck(
    game_id: uuid.UUID,
    body: DeckCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    deck_size = game.ruleset.get("deck_size", 20)
    if len(body.card_ids) != deck_size:
        raise HTTPException(status_code=422, detail=f"Deck must have exactly {deck_size} cards")

    deck = Deck(
        id=uuid.uuid4(),
        owner_id=current_user.id,
        game_id=game_id,
        name=body.name,
        card_ids=body.card_ids,
    )
    db.add(deck)
    await db.commit()
    await db.refresh(deck)
    return deck

@router.get("/games/{game_id}/decks/mine", response_model=list[DeckOut])
async def list_my_decks(
    game_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Deck).where(Deck.game_id == game_id, Deck.owner_id == current_user.id)
    )
    return result.scalars().all()

@router.get("/decks/{deck_id}", response_model=DeckOut)
async def get_deck(
    deck_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Deck).where(Deck.id == deck_id))
    deck = result.scalar_one_or_none()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    if deck.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your deck")
    return deck
```

- [ ] **Step 5: main.py에 decks 라우터 등록**

```python
# backend/app/main.py
from fastapi import FastAPI
from app.routers.auth import router as auth_router
from app.routers.games import router as games_router
from app.routers.cards import router as cards_router
from app.routers.decks import router as decks_router

app = FastAPI(title="CardCard API")
app.include_router(auth_router)
app.include_router(games_router)
app.include_router(cards_router)
app.include_router(decks_router)

@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 6: 전체 테스트 통과 확인**

```bash
cd backend
pytest -v
```

Expected: 전체 `PASSED`

- [ ] **Step 7: 커밋**

```bash
git add backend/app/schemas/deck.py backend/app/routers/decks.py backend/app/main.py backend/tests/test_decks.py
git commit -m "feat: decks CRUD endpoints — Plan 1 complete"
```

---

## 다음 단계

- **Plan 2:** Battle Engine — WebSocket 실시간 대전, JSON 룰 인터프리터, Redis BattleState, 덱 스왑 메카닉
- **Plan 3:** React Native Frontend — 블록 빌더 UI, 배틀 화면, 덱 빌더
