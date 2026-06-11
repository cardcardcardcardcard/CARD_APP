import itertools
import pytest
import pytest_asyncio
import httpx
from httpx_ws import aconnect_ws
from httpx_ws.transport import ASGIWebSocketTransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from app.main import app as asgi_app
from app.dependencies import get_db
from app.config import settings
import app.redis as redis_module

_ws_engine = create_async_engine(settings.TEST_DATABASE_URL, poolclass=NullPool)
_ws_session_factory = async_sessionmaker(_ws_engine, expire_on_commit=False)

_counter = itertools.count()

RULESET = {
    "deck_size": 3, "hand_limit": 5, "swap_interval": 3,
    "win_condition": "hp_zero", "turn_phases": ["draw", "main", "battle", "end"],
    "resource_system": "mana", "initial_resource": 1, "resource_per_turn": 1,
}


async def _ws_get_db():
    async with _ws_session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def ws_client():
    redis_module._redis = None
    original = asgi_app.dependency_overrides.get(get_db)
    asgi_app.dependency_overrides[get_db] = _ws_get_db
    c = httpx.AsyncClient(
        transport=ASGIWebSocketTransport(app=asgi_app),
        base_url="http://test",
    )
    yield c
    await c.aclose()
    # Reset Redis so subsequent tests don't get a client bound to the
    # now-closed blocking portal event loop.
    redis_module._redis = None
    if original is not None:
        asgi_app.dependency_overrides[get_db] = original
    else:
        asgi_app.dependency_overrides.pop(get_db, None)


async def _full_setup(client):
    n = next(_counter)

    async def make_player(u, e):
        await client.post("/auth/register", json={"username": u, "email": e, "password": "pw123456"})
        r = await client.post("/auth/login", json={"email": e, "password": "pw123456"})
        return r.json()["access_token"]

    ta = await make_player(f"ws_a_{n}", f"wsa_{n}@example.com")
    tb = await make_player(f"ws_b_{n}", f"wsb_{n}@example.com")

    g = await client.post("/games", json={"title": f"WS Game {n}", "is_public": True, "ruleset": RULESET},
                           headers={"Authorization": f"Bearer {ta}"})
    game_id = g.json()["id"]

    async def make_cards_and_deck(token, prefix):
        cards = []
        for i in range(3):
            cr = await client.post(f"/games/{game_id}/cards",
                                    json={"name": f"{prefix}_{i}", "attributes": {"hp": 100}, "effects": []},
                                    headers={"Authorization": f"Bearer {ta}"})
            cards.append(cr.json()["id"])
        d = await client.post(f"/games/{game_id}/decks", json={"name": f"Deck_{prefix}", "card_ids": cards},
                               headers={"Authorization": f"Bearer {token}"})
        return d.json()["id"]

    deck_a = await make_cards_and_deck(ta, f"A_{n}")
    deck_b = await make_cards_and_deck(tb, f"B_{n}")

    cr = await client.post("/battles", json={"game_id": game_id, "deck_id": deck_a},
                            headers={"Authorization": f"Bearer {ta}"})
    battle_id = cr.json()["id"]
    await client.post(f"/battles/{battle_id}/join", json={"deck_id": deck_b},
                       headers={"Authorization": f"Bearer {tb}"})
    # join_battle saved state to Redis in the test loop; reset singleton so
    # WS handler creates a fresh Redis client in ASGIWebSocketTransport's loop
    redis_module._redis = None
    return battle_id, ta, tb


@pytest.mark.asyncio
async def test_ws_connect_and_get_state(client, ws_client):
    battle_id, ta, _ = await _full_setup(client)
    async with aconnect_ws(f"/battles/{battle_id}/ws?token={ta}", ws_client) as ws:
        msg = await ws.receive_json()
        assert msg["type"] == "state"
        assert "hp_a" in msg["data"]
        assert "deck_for_a" in msg["data"]


@pytest.mark.asyncio
async def test_ws_attack_action(client, ws_client):
    battle_id, ta, _ = await _full_setup(client)
    async with aconnect_ws(f"/battles/{battle_id}/ws?token={ta}", ws_client) as ws:
        await ws.receive_json()  # initial state
        await ws.send_json({"action": "attack", "card_id": None, "value": 20})
        msg = await ws.receive_json()
        assert msg["type"] == "state"
        assert msg["data"]["hp_b"] == 80


@pytest.mark.asyncio
async def test_ws_swap_fires_on_interval(client, ws_client):
    battle_id, ta, tb = await _full_setup(client)
    # swap_interval=3: swap fires when turn_number % 3 == 0
    # Sequential connections avoid cross-loop broadcast issues:
    # each aconnect_ws creates its own blocking portal (event loop).

    # turn 1: A attacks (turn 1 → 2, active=B, no swap)
    async with aconnect_ws(f"/battles/{battle_id}/ws?token={ta}", ws_client) as ws_a:
        await ws_a.receive_json()  # initial state
        await ws_a.send_json({"action": "attack", "value": 1})
        state1 = await ws_a.receive_json()
        assert state1["type"] == "state"
        assert state1["data"]["active_player"] == "b"

    # L_a loop is now closed; reset Redis so ws_b gets a fresh client in L_b
    redis_module._redis = None

    # turn 2: B attacks (turn 2 → 3 → swap fires)
    async with aconnect_ws(f"/battles/{battle_id}/ws?token={tb}", ws_client) as ws_b:
        await ws_b.receive_json()  # state after A's attack
        await ws_b.send_json({"action": "attack", "value": 1})
        swap_msg = await ws_b.receive_json()
        assert swap_msg["type"] == "swap"
        assert swap_msg["data"]["deck_for_a"] == "b"
        state2 = await ws_b.receive_json()
        assert state2["type"] == "state"
        assert state2["data"]["deck_for_a"] == "b"
        assert state2["data"]["active_player"] == "a"
