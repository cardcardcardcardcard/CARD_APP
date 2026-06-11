import pytest

RULESET = {
    "deck_size": 20,
    "hand_limit": 5,
    "swap_interval": 3,
    "win_condition": "hp_zero",
    "turn_phases": ["draw", "main", "battle", "end"],
    "resource_system": "mana",
    "initial_resource": 1,
    "resource_per_turn": 1,
}


async def _register_and_login(client, username, email):
    await client.post("/auth/register", json={"username": username, "email": email, "password": "pw123456"})
    r = await client.post("/auth/login", json={"email": email, "password": "pw123456"})
    return r.json()["access_token"]


@pytest.mark.asyncio
async def test_create_game(client):
    token = await _register_and_login(client, "creator1", "c1@example.com")
    r = await client.post("/games", json={
        "title": "My Dragon Game",
        "description": "Dragons battle",
        "is_public": True,
        "ruleset": RULESET,
    }, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 201
    data = r.json()
    assert data["title"] == "My Dragon Game"
    assert data["ruleset"]["swap_interval"] == 3
    assert "id" in data


@pytest.mark.asyncio
async def test_create_game_unauthenticated(client):
    r = await client.post("/games", json={"title": "x", "ruleset": RULESET})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_list_public_games(client):
    token = await _register_and_login(client, "creator2", "c2@example.com")
    await client.post("/games", json={"title": "Public Game", "is_public": True, "ruleset": RULESET},
                      headers={"Authorization": f"Bearer {token}"})
    r = await client.get("/games")
    assert r.status_code == 200
    games = r.json()
    assert isinstance(games, list)
    assert any(g["title"] == "Public Game" for g in games)


@pytest.mark.asyncio
async def test_get_game_by_id(client):
    token = await _register_and_login(client, "creator3", "c3@example.com")
    create_r = await client.post("/games", json={"title": "Fetch Me", "is_public": True, "ruleset": RULESET},
                                  headers={"Authorization": f"Bearer {token}"})
    game_id = create_r.json()["id"]
    r = await client.get(f"/games/{game_id}")
    assert r.status_code == 200
    assert r.json()["id"] == game_id


@pytest.mark.asyncio
async def test_update_game_by_creator(client):
    token = await _register_and_login(client, "creator4", "c4@example.com")
    create_r = await client.post("/games", json={"title": "Old Title", "is_public": True, "ruleset": RULESET},
                                  headers={"Authorization": f"Bearer {token}"})
    game_id = create_r.json()["id"]
    r = await client.put(f"/games/{game_id}", json={"title": "New Title"},
                          headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["title"] == "New Title"


@pytest.mark.asyncio
async def test_update_game_by_non_creator(client):
    token1 = await _register_and_login(client, "creator5", "c5@example.com")
    token2 = await _register_and_login(client, "other5", "o5@example.com")
    create_r = await client.post("/games", json={"title": "Owned", "is_public": True, "ruleset": RULESET},
                                  headers={"Authorization": f"Bearer {token1}"})
    game_id = create_r.json()["id"]
    r = await client.put(f"/games/{game_id}", json={"title": "Stolen"},
                          headers={"Authorization": f"Bearer {token2}"})
    assert r.status_code == 403
