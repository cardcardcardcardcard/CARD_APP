"""
기본 카드셋 시딩 스크립트.

시스템 유저("system") 1명과, 그 유저가 만든 공개 게임 "기본 카드셋" 1개,
그리고 그 게임에 속한 카드 100장(액션 50 / 카운터 25 / 함정 25)을 생성한다.

이 스크립트는 멱등(idempotent)하다 — 여러 번 실행해도 데이터가 중복 생성되거나
기존 데이터가 삭제되지 않는다. Alembic 마이그레이션이 아니라 독립 실행 스크립트로
유지하는 이유는, 이 프로젝트는 활발한 개발 중 마이그레이션이 자주 수정/리셋되기
때문에 시드 데이터를 마이그레이션과 분리해서 관리하기 위함이다.

실행 방법:
    cd backend && .venv/bin/python -m scripts.seed_default_cardset
"""
import asyncio
import uuid

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.card import Card
from app.models.game import Game
from app.models.user import User
from app.security import hash_password

SYSTEM_USERNAME = "system"
SYSTEM_EMAIL = "system@cardcard.local"
DEFAULT_GAME_TITLE = "기본 카드셋"
DEFAULT_GAME_DESCRIPTION = "처음 시작하는 사람을 위한 기본 카드 100장"

# === 액션 카드 (50장) ===
# (name, has_minigame, effect_type, effect_value, effect_target, effect_text)
ACTION_CARDS = [
    ("질문 폭탄", False, "draw", 2, "self", "상대에게 답하기 곤란한 질문을 던집니다. 카드 2장을 뽑습니다."),
    ("눈치게임", True, "none", 0, "self", "다 같이 숫자를 셉니다. 동시에 같은 숫자를 외치면 안 됩니다."),
    ("1초 정지", False, "draw", 1, "self", "모두 1초간 동작을 멈춥니다. 카드 1장을 뽑습니다."),
    ("손바닥 마주치기", False, "draw", 1, "self", "상대와 하이파이브합니다. 카드 1장을 뽑습니다."),
    ("사진첩 공개", False, "discard", 1, "opponent", "상대는 사진첩의 사진 하나를 공개해야 합니다. 카드 1장을 버립니다."),
    ("결심의 한마디", False, "draw", 1, "self", "오늘의 다짐을 한마디로 말합니다. 카드 1장을 뽑습니다."),
    ("비밀 누설", False, "steal", 1, "self", "상대의 비밀 하나를 듣습니다. 상대 카드 1장을 가져옵니다."),
    ("박수 세 번", False, "draw", 1, "self", "다 같이 박수 세 번을 칩니다. 카드 1장을 뽑습니다."),
    ("거울 따라하기", True, "none", 0, "self", "상대의 행동을 3초간 그대로 따라합니다."),
    ("윙크 신호", True, "draw", 1, "self", "아무도 모르게 누군가에게 윙크합니다. 들키지 않으면 카드 1장을 뽑습니다."),
    ("칭찬 한마디", False, "give", 1, "self", "상대를 진심으로 칭찬합니다. 내 카드 1장을 상대에게 줍니다."),
    ("비밀번호 공개", False, "discard", 2, "opponent", "상대는 자주 쓰는 비밀번호 패턴을 말합니다. 카드 2장을 버립니다."),
    ("손가락 욕 참기", True, "none", 0, "self", "얄미운 상황에서도 표정 변화 없이 1분을 버팁니다."),
    ("폭풍 드로우", False, "draw", 3, "self", "운이 좋은 날입니다. 카드 3장을 뽑습니다."),
    ("도둑질", False, "steal", 1, "self", "상대 손에서 카드 한 장을 슬쩍 가져옵니다."),
    ("정적 깨기", False, "draw", 1, "self", "어색한 침묵을 깨는 아무 말이나 합니다. 카드 1장을 뽑습니다."),
    ("자랑하기", False, "draw", 1, "self", "최근 자랑하고 싶었던 일을 말합니다. 카드 1장을 뽑습니다."),
    ("손들기 게임", True, "discard", 1, "opponent", "\"시작\" 외치면 손을 듭니다. 가장 늦게 든 사람이 카드 1장을 버립니다."),
    ("비밀 공유", False, "draw", 1, "self", "아무에게도 말 안 한 비밀을 하나 공유합니다. 카드 1장을 뽑습니다."),
    ("셀카 찍기", True, "none", 0, "self", "지금 이 순간 다 같이 셀카를 찍습니다."),
    ("무언극", True, "discard", 1, "opponent", "말 없이 단어 하나를 몸으로 표현합니다. 못 맞히면 카드 1장을 버립니다."),
    ("박자 맞추기", True, "none", 0, "self", "다 같이 손으로 같은 박자를 3번 맞춥니다."),
    ("한 입만", False, "give", 1, "self", "내가 가진 것 중 하나를 상대에게 나눠줍니다. 카드 1장을 상대에게 줍니다."),
    ("도장 찍기", False, "draw", 1, "self", "오늘 가장 잘한 일에 스스로 도장을 찍어줍니다. 카드 1장을 뽑습니다."),
    ("거짓말 탐지", False, "discard", 1, "opponent", "상대에게 최근 한 거짓말을 캐묻습니다. 카드 1장을 버립니다."),
    ("손바닥 뒤집기", False, "draw", 1, "self", "마음이 바뀐 일을 하나 이야기합니다. 카드 1장을 뽑습니다."),
    ("별명 부르기", False, "draw", 1, "self", "누군가를 별명으로 부릅니다. 카드 1장을 뽑습니다."),
    ("즉석 인터뷰", False, "draw", 2, "self", "상대를 즉석에서 인터뷰합니다. 카드 2장을 뽑습니다."),
    ("가위바위보", True, "discard", 1, "opponent", "아무나와 가위바위보를 합니다. 진 사람이 카드 1장을 버립니다."),
    ("손가락 접기", False, "draw", 1, "self", "살면서 후회한 일을 하나 말하며 손가락을 접습니다. 카드 1장을 뽑습니다."),
    ("깜짝 질문", False, "draw", 1, "self", "예상치 못한 질문을 즉석에서 던집니다. 카드 1장을 뽑습니다."),
    ("비밀 메모", False, "steal", 1, "self", "상대 휴대폰 메모장 제목 하나를 듣고 카드 1장을 가져옵니다."),
    ("침묵 챌린지", True, "none", 0, "self", "1분간 누구도 먼저 말하지 않습니다."),
    ("자리 바꾸기", False, "draw", 1, "self", "아무나와 자리를 바꿉니다. 카드 1장을 뽑습니다."),
    ("손편지", False, "give", 1, "self", "상대에게 짧은 손편지를 씁니다. 카드 1장을 상대에게 줍니다."),
    ("첫인상 평가", False, "draw", 1, "self", "상대의 첫인상을 솔직하게 말합니다. 카드 1장을 뽑습니다."),
    ("표정 관리", True, "discard", 1, "opponent", "웃긴 이야기를 들어도 무표정을 유지합니다. 웃으면 카드 1장을 버립니다."),
    ("노래 한 소절", True, "none", 0, "self", "좋아하는 노래 한 소절을 부릅니다."),
    ("깐족거리기", False, "discard", 1, "opponent", "상대를 살짝 놀립니다. 카드 1장을 버립니다."),
    ("손목 스냅", False, "draw", 1, "self", "손가락으로 스냅을 튕기며 한마디 외칩니다. 카드 1장을 뽑습니다."),
    ("폭로전", False, "discard", 2, "opponent", "상대에 대해 알고 있던 사실 하나를 폭로합니다. 카드 2장을 버립니다."),
    ("즉석 댄스", True, "none", 0, "self", "3초간 즉석 댄스를 춥니다."),
    ("손바닥 도장", False, "draw", 1, "self", "상대 손바닥에 가상의 도장을 찍어줍니다. 카드 1장을 뽑습니다."),
    ("비밀 거래", False, "give", 1, "self", "상대와 작은 거래를 합니다. 카드 1장을 상대에게 줍니다."),
    ("깜빡임 참기", True, "discard", 1, "opponent", "상대와 눈을 마주친 채 깜빡이지 않습니다. 먼저 깜빡인 사람이 카드 1장을 버립니다."),
    ("추억 소환", False, "draw", 1, "self", "다 같이 있었던 추억 하나를 꺼냅니다. 카드 1장을 뽑습니다."),
    ("도전장", False, "steal", 1, "self", "상대에게 도전장을 던집니다. 카드 1장을 가져옵니다."),
    ("박수갈채", False, "draw", 2, "self", "모두에게 박수를 받습니다. 카드 2장을 뽑습니다."),
    ("폭풍 질문", False, "draw", 1, "self", "연속으로 질문 세 개를 던집니다. 카드 1장을 뽑습니다."),
    ("마지막 한마디", False, "draw", 1, "self", "지금 가장 하고 싶은 한마디를 합니다. 카드 1장을 뽑습니다."),
]

# === 카운터 카드 (25장) ===
# (name, counter_condition, counters_action, counters_trap, effect_type, effect_value, effect_text)
COUNTER_CARDS = [
    ("받아치기", "상대가 행동 카드를 사용했을 때", True, False, "draw", 1, "상대의 행동에 바로 맞받아칩니다. 카드 1장을 뽑습니다."),
    ("못들은 척", "상대가 질문형 카드를 사용했을 때", True, False, "none", 0, "질문을 못 들은 척 넘깁니다."),
    ("반사!", "상대가 카드를 사용했을 때", True, False, "draw", 1, "\"반사!\"를 외치며 효과를 되돌립니다. 카드 1장을 뽑습니다."),
    ("무시하기", "상대 행동에 무반응", True, False, "none", 0, "아무 반응 없이 무시합니다."),
    ("받아넘기기", "상대가 카드를 사용했을 때", True, False, "draw", 1, "능숙하게 받아넘깁니다. 카드 1장을 뽑습니다."),
    ("살짝 피하기", "상대가 카드를 사용했을 때", True, False, "none", 0, "슬쩍 화제를 돌려 피합니다."),
    ("맞받아치기", "상대가 카드를 사용했을 때", True, False, "draw", 1, "똑같이 맞받아칩니다. 카드 1장을 뽑습니다."),
    ("한 발 물러서기", "상대가 카드를 사용했을 때", True, False, "none", 0, "한 발 물러서며 거리를 둡니다."),
    ("눈치 채기", "상대가 카드를 사용했을 때", True, False, "draw", 1, "상대의 의도를 미리 눈치챕니다. 카드 1장을 뽑습니다."),
    ("침착하게 대응", "상대가 카드를 사용했을 때", True, False, "none", 0, "침착하게 받아넘깁니다."),
    ("함정 감지", "상대 함정이 발동됐을 때", False, True, "draw", 1, "함정의 기운을 미리 감지합니다. 카드 1장을 뽑습니다."),
    ("미리 알았다", "상대 함정이 발동됐을 때", False, True, "none", 0, "\"이미 알고 있었다\"며 가볍게 넘깁니다."),
    ("함정 무력화", "상대 함정이 발동됐을 때", False, True, "draw", 1, "함정을 무력화시킵니다. 카드 1장을 뽑습니다."),
    ("직감으로 피하기", "상대 함정이 발동됐을 때", False, True, "none", 0, "직감적으로 함정을 피합니다."),
    ("함정 역이용", "상대 함정이 발동됐을 때", False, True, "draw", 1, "함정을 역으로 이용합니다. 카드 1장을 뽑습니다."),
    ("한 수 앞서기", "상대 함정이 발동됐을 때", False, True, "none", 0, "상대보다 한 수 앞서 대응합니다."),
    ("의심의 눈초리", "상대 함정이 발동됐을 때", False, True, "draw", 1, "미심쩍은 눈초리로 함정을 알아챕니다. 카드 1장을 뽑습니다."),
    ("함정 해체", "상대 함정이 발동됐을 때", False, True, "none", 0, "차분하게 함정을 해체합니다."),
    ("눈치 100%", "상대 함정이 발동됐을 때", False, True, "draw", 1, "눈치 백 퍼센트로 알아챕니다. 카드 1장을 뽑습니다."),
    ("안전 제일", "상대 함정이 발동됐을 때", False, True, "none", 0, "안전을 우선해 한 걸음 물러섭니다."),
    ("만능 방어", "상대가 어떤 카드든 사용했을 때", True, True, "draw", 1, "무엇이든 받아내는 만능 방어막을 펼칩니다. 카드 1장을 뽑습니다."),
    ("완벽 차단", "상대가 어떤 카드든 사용했을 때", True, True, "none", 0, "상대의 어떤 시도도 완벽히 차단합니다."),
    ("든든한 보험", "상대가 어떤 카드든 사용했을 때", True, True, "draw", 1, "든든한 보험처럼 모든 상황에 대응합니다. 카드 1장을 뽑습니다."),
    ("비상 대응", "상대가 어떤 카드든 사용했을 때", True, True, "none", 0, "비상 상황처럼 신속히 대응합니다."),
    ("최후의 방어선", "상대가 어떤 카드든 사용했을 때", True, True, "draw", 1, "최후의 방어선을 지킵니다. 카드 1장을 뽑습니다."),
]

# === 함정 카드 (25장) ===
# (name, trigger_condition, effect_type, effect_value, effect_text)
TRAP_CARDS = [
    # 승리 조건이 "카드를 많이 모으면 이기는" 방식이라, 함정에 걸리는 건 페널티여야 함
    # (discard = 손패 버림, give = 함정 설치자에게 카드 1장 줌) — draw/steal로 보상하면 안 됨
    ("뭐라고?", "\"뭐라고?\"라고 말한 사람", "discard", 3, "걸린 사람은 카드 3장을 버립니다."),
    ("진짜?", "\"진짜?\"라고 말한 사람", "discard", 2, "걸린 사람은 카드 2장을 버립니다."),
    ("헐", "\"헐\"이라고 말한 사람", "discard", 2, "걸린 사람은 카드 2장을 버립니다."),
    ("대박", "\"대박\"이라고 말한 사람", "discard", 2, "걸린 사람은 카드 2장을 버립니다."),
    ("어이없네", "\"어이없다\"고 말한 사람", "discard", 2, "걸린 사람은 카드 2장을 버립니다."),
    ("미안해", "\"미안\"이라고 말한 사람", "discard", 2, "걸린 사람은 카드 2장을 버립니다."),
    ("핸드폰 확인", "핸드폰을 만진 사람", "discard", 2, "걸린 사람은 카드 2장을 버립니다."),
    ("하품", "하품을 한 사람", "discard", 1, "걸린 사람은 카드 1장을 버립니다."),
    ("다리 떨기", "다리를 떤 사람", "discard", 1, "걸린 사람은 카드 1장을 버립니다."),
    ("머리 만지기", "머리를 만진 사람", "discard", 1, "걸린 사람은 카드 1장을 버립니다."),
    ("팔짱 끼기", "팔짱을 낀 사람", "discard", 1, "걸린 사람은 카드 1장을 버립니다."),
    ("시계 확인", "시간을 확인한 사람", "discard", 1, "걸린 사람은 카드 1장을 버립니다."),
    ("딴 생각", "멍 때린 사람", "discard", 2, "걸린 사람은 카드 2장을 버립니다."),
    ("웃음 참기 실패", "먼저 웃은 사람", "discard", 2, "걸린 사람은 카드 2장을 버립니다."),
    ("욕설", "욕을 한 사람", "discard", 2, "걸린 사람은 카드 2장을 버립니다."),
    ("이름 부르기", "다른 사람 이름을 부른 사람", "discard", 1, "걸린 사람은 카드 1장을 버립니다."),
    ("손가락질", "누군가를 가리킨 사람", "give", 1, "걸린 사람이 함정 설치자에게 카드 1장을 줍니다."),
    ("한숨 쉬기", "한숨을 쉰 사람", "discard", 1, "걸린 사람은 카드 1장을 버립니다."),
    ("핑계 대기", "핑계를 댄 사람", "discard", 2, "걸린 사람은 카드 2장을 버립니다."),
    ("칭찬 거부", "칭찬을 거절한 사람", "discard", 1, "걸린 사람은 카드 1장을 버립니다."),
    ("끼어들기", "대화에 끼어든 사람", "give", 1, "걸린 사람이 함정 설치자에게 카드 1장을 줍니다."),
    ("잘난 척", "잘난 척 한 사람", "discard", 2, "걸린 사람은 카드 2장을 버립니다."),
    ("변명하기", "변명을 한 사람", "discard", 1, "걸린 사람은 카드 1장을 버립니다."),
    ("침묵 깨기", "정적을 깬 사람", "discard", 1, "걸린 사람은 카드 1장을 버립니다."),
    ("마지막 외침", "가장 마지막에 말한 사람", "discard", 3, "걸린 사람은 카드 3장을 버립니다."),
]


def _build_cards(game_id: uuid.UUID) -> list[Card]:
    cards: list[Card] = []

    for name, has_minigame, effect_type, effect_value, effect_target, effect_text in ACTION_CARDS:
        cards.append(
            Card(
                id=uuid.uuid4(),
                game_id=game_id,
                name=name,
                image_url=None,
                card_type="action",
                has_minigame=has_minigame,
                trigger_condition=None,
                counter_condition=None,
                counters_action=False,
                counters_trap=False,
                effect_text=effect_text,
                effect_type=effect_type,
                effect_value=effect_value,
                effect_target=effect_target,
            )
        )

    for name, counter_condition, counters_action, counters_trap, effect_type, effect_value, effect_text in COUNTER_CARDS:
        cards.append(
            Card(
                id=uuid.uuid4(),
                game_id=game_id,
                name=name,
                image_url=None,
                card_type="counter",
                has_minigame=False,
                trigger_condition=None,
                counter_condition=counter_condition,
                counters_action=counters_action,
                counters_trap=counters_trap,
                effect_text=effect_text,
                effect_type=effect_type,
                effect_value=effect_value,
                effect_target="self",
            )
        )

    for name, trigger_condition, effect_type, effect_value, effect_text in TRAP_CARDS:
        cards.append(
            Card(
                id=uuid.uuid4(),
                game_id=game_id,
                name=name,
                image_url=None,
                card_type="trap",
                has_minigame=False,
                trigger_condition=trigger_condition,
                counter_condition=None,
                counters_action=False,
                counters_trap=False,
                effect_text=effect_text,
                effect_type=effect_type,
                effect_value=effect_value,
                effect_target="activator",
            )
        )

    return cards


async def main() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == SYSTEM_USERNAME))
        system_user = result.scalar_one_or_none()

        if system_user is None:
            system_user = User(
                id=uuid.uuid4(),
                username=SYSTEM_USERNAME,
                email=SYSTEM_EMAIL,
                password_hash=hash_password(str(uuid.uuid4())),
            )
            db.add(system_user)
            await db.commit()
            await db.refresh(system_user)

        result = await db.execute(
            select(Game).where(
                Game.title == DEFAULT_GAME_TITLE,
                Game.creator_id == system_user.id,
            )
        )
        existing_game = result.scalar_one_or_none()

        if existing_game is not None:
            print("이미 시딩되어 있습니다. 건너뜁니다.")
            return

        game = Game(
            id=uuid.uuid4(),
            creator_id=system_user.id,
            title=DEFAULT_GAME_TITLE,
            description=DEFAULT_GAME_DESCRIPTION,
            is_public=True,
        )
        db.add(game)
        await db.commit()
        await db.refresh(game)

        cards = _build_cards(game.id)
        db.add_all(cards)
        await db.commit()

        print(f"시딩 완료: 게임 1개, 카드 {len(cards)}개 생성")


if __name__ == "__main__":
    asyncio.run(main())
