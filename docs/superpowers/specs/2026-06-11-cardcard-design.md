# CardCard — Design Spec
Date: 2026-06-11

## Overview

커스텀 카드 게임 제작 + 실시간 대전 플랫폼. 핵심 차별점: **N턴마다 두 플레이어의 덱이 교체**되는 독창적 메카닉.

React Native (Expo) + FastAPI.

---

## 사용자 역할

**Game Creator**
- 룰셋 정의 (턴 구조, 승리 조건, 자원 시스템, 덱 교체 주기 N)
- 카드 속성 스키마 정의 (자유 속성: HP, 공격력, 독성 등 — 이름/타입 직접 설정)
- 카드풀 제작 (블록 빌더 UI로 효과/조건 조립 → JSON 저장)
- 게임 공개 or 초대 코드로 비공개 공유

**Player**
- 게임 탐색/입장
- 크리에이터 카드풀에서 덱 빌딩
- 실시간 대전 (WebSocket)
- N턴마다 두 덱 교체

---

## 핵심 메카닉: 덱 스왑

- 배틀 중 `turn_number % swap_interval == 0` 이면 덱 교체
- `swap_interval`은 룰셋 파라미터 (크리에이터 설정)
- 전략적 의미: 덱을 "내가 쓰기 좋게" + "상대가 쓰기 나쁘게" 동시에 설계해야 함

---

## 아키텍처

### Frontend (React Native + Expo)
- 블록 빌더 UI: 카드 효과를 드래그앤드롭 블록으로 조립
- 룰셋 편집기: 각 파라미터 폼
- 덱 빌더: 카드풀에서 드래그로 구성
- 배틀 화면: 실시간 WebSocket, 덱 교체 애니메이션
- 플랫폼 탐색: 공개 게임 목록, 검색

### Backend (FastAPI)
- REST API: 게임/카드/덱 CRUD, 인증
- WebSocket: 배틀 실시간 상태 동기화
- JSON 룰 인터프리터: 카드 효과 실행 엔진
- PostgreSQL: 영구 데이터
- Redis: 배틀 상태 (인메모리, 빠른 R/W)

---

## 데이터 모델

### User
| field | type |
|-------|------|
| id | UUID |
| username | string |
| email | string |
| password_hash | string |
| created_at | datetime |

### Game
| field | type |
|-------|------|
| id | UUID |
| creator_id | → User |
| title | string |
| description | string |
| is_public | bool |
| invite_code | string (nullable) |
| ruleset | JSONB |

**ruleset JSON 스키마:**
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

### Card
| field | type |
|-------|------|
| id | UUID |
| game_id | → Game |
| name | string |
| image_url | string |
| attributes | JSONB |
| effects | JSONB |

**effects JSON 구조 (블록 빌더 출력):**
```json
[{
  "trigger": "on_attack",
  "conditions": [
    {"stat": "self.hp", "op": "<", "value": 30}
  ],
  "actions": [
    {"type": "deal_damage", "target": "opponent", "value": 40},
    {"type": "heal", "target": "self", "value": 10}
  ]
}]
```

### Deck
| field | type |
|-------|------|
| id | UUID |
| owner_id | → User |
| game_id | → Game |
| name | string |
| card_ids | JSONB (UUID[]) |

### Battle
| field | type |
|-------|------|
| id | UUID |
| game_id | → Game |
| player_a_id | → User |
| player_b_id | → User |
| deck_a_id | → Deck |
| deck_b_id | → Deck |
| status | enum: waiting/playing/done |
| winner_id | → User (nullable) |
| started_at | datetime |
| ended_at | datetime (nullable) |

### BattleState (Redis key: `battle:{id}`)
```json
{
  "turn_number": 5,
  "active_player": "a",
  "deck_for_a": "a",
  "deck_for_b": "b",
  "phase": "main",
  "hp_a": 80,
  "hp_b": 60,
  "hand_a": ["card_id_1", ...],
  "hand_b": ["card_id_2", ...],
  "field_a": [],
  "field_b": [],
  "resources_a": 3,
  "resources_b": 2,
  "deck_remaining_a": [...],
  "deck_remaining_b": [...]
}
```

`deck_for_a`/`deck_for_b` 값은 "a" 또는 "b". 스왑 시 둘 다 반전. 예: turn 3 이후 → `deck_for_a: "b"`, `deck_for_b: "a"`

---

## 룰 인터프리터

FastAPI에서 카드 효과 실행:
1. 액션 발생 시 해당 카드의 `effects` JSON 조회
2. `trigger` 매칭 확인
3. `conditions` 평가 (현재 BattleState 기준)
4. 조건 통과 시 `actions` 순서대로 실행, BattleState 업데이트
5. 변경된 상태를 WebSocket으로 양쪽 클라이언트에 브로드캐스트

지원 trigger: `on_attack`, `on_defend`, `on_play`, `on_turn_start`, `on_turn_end`, `on_swap`
지원 condition op: `<`, `>`, `<=`, `>=`, `==`, `!=`
지원 action type: `deal_damage`, `heal`, `buff_stat`, `debuff_stat`, `draw_card`, `discard_card`, `skip_turn`

---

## 주요 API 엔드포인트

```
POST   /auth/register
POST   /auth/login

GET    /games                    # 공개 게임 목록
POST   /games                    # 게임 생성
GET    /games/{id}
PUT    /games/{id}               # 룰셋 수정

GET    /games/{id}/cards         # 카드풀 조회
POST   /games/{id}/cards         # 카드 추가
PUT    /games/{id}/cards/{cid}
DELETE /games/{id}/cards/{cid}

POST   /games/{id}/decks         # 덱 생성
GET    /decks/{id}

POST   /battles                  # 배틀 생성 (방 만들기)
GET    /battles/{id}
WS     /battles/{id}/ws          # 실시간 배틀
```

---

## 화면 구조 (React Native)

```
TabNavigator
├── 탐색 (Explore)
│   ├── 공개 게임 목록
│   └── 게임 상세 (입장 / 덱 빌딩)
├── 내 게임 (My Games)
│   ├── 내가 만든 게임 목록
│   ├── 게임 편집
│   │   ├── 룰셋 편집기
│   │   ├── 카드풀 관리
│   │   └── 카드 편집 (블록 빌더)
│   └── 게임 생성
├── 배틀 (Battle)
│   ├── 대기 로비
│   └── 배틀 화면
└── 프로필
```

---

## 비고

- 블록 빌더 UI는 `react-native-draggable` 또는 커스텀 구현
- WebSocket 재연결 로직 필요 (모바일 백그라운드 전환 대응)
- 이미지 업로드: S3 or Cloudflare R2 (카드 이미지)
- MVP에서 resource_system은 "mana" 단일 타입만 지원, 이후 확장
