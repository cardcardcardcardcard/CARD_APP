# CardCard

직접 만든 카드로 즐기는 N인 파티 카드 게임. "말로 하는" 미니게임(누가 먼저 말했는지, 눈치게임 등)을
행동/카운터/함정 카드로 표현하고, 디지털 클라이언트가 손패 수·턴·승패만 추적하면서 실제 판정은
플레이어들이 직접 한다.

## 게임 규칙

- 게임마다 카드풀(카드셋)을 공유하고, 배틀에는 2명 이상이 좌석을 잡고 참가한다.
- 카드 타입은 세 가지: **행동**(턴에 내는 효과), **카운터**(행동/함정을 무효화), **함정**(설치해두고 조건이 맞으면 발동).
- 자기 턴이 시작될 때 손패가 게임에서 정한 `win_hand_size`장 이상이면 그 자리에서 승리.
- 카드 효과의 대상은 `self`/`opponent`/`all`/`activator` 중 하나이며, 3인 이상 배틀에서 상대가 여럿이면
  클라이언트가 `target_seat`으로 직접 지정한다.
- 카드를 잃는 효과(함정에 걸렸을 때 등)는 자동으로 버려지지 않고, 어떤 카드를 버릴지 직접 골라야 진행된다.

## 구조

```
backend/   FastAPI + SQLAlchemy(async) + Alembic + Redis(배틀 실시간 상태) + Postgres
frontend/  Expo (React Native + React Native Web), Expo Router 파일 기반 라우팅
```

백엔드는 `models`(ORM) → `domain`(비즈니스 로직 dataclass) → `schemas`(Pydantic) →
`repositories` → `services` → `routers` 순으로 계층화되어 있다. 배틀은 WebSocket으로
진행되며 `app/battle/` 아래에 좌석 기반 상태머신(`state.py`)과 효과 처리(`engine.py`)가 있다.

## 로컬 실행

### 백엔드

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env   # 필요시 SECRET_KEY 등 값 교체

docker compose up -d   # Postgres(5433), Redis(6379)
alembic upgrade head
python -m scripts.seed_default_cardset   # 기본 카드셋 100장 시딩 (선택)

uvicorn app.main:app --reload
```

### 프론트엔드

```bash
cd frontend
npm install
npm run start   # 또는 npm run ios / npm run web
```

### 테스트

```bash
cd backend
pytest
```
