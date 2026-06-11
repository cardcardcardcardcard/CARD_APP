import pytest

RULESET = {
    "deck_size": 20, "hand_limit": 5, "swap_interval": 3,
    "win_condition": "hp_zero", "turn_phases": ["draw", "main", "battle", "end"],
    "resource_system": "mana", "initial_resource": 1, "resource_per_turn": 1,
}

CARD_PAYLOAD = {
    "name": "Fire Dragon",
    "attributes": {"hp": 120, "attack": 80, "element": "fire"},
    "effects": [{
        "trigger": "on_attack",
        "conditions": [{"stat": "self.hp", "op": "<", "value": 30}],
        "actions": [{"type": "deal_damage", "target": "opponent", "value": 40}],
    }],
}


async def _setup(client, username, email):
    await client.post("/auth/register", json={"username": username, "email": email, "password": "pw123456"})
    r = await client.post("/auth/login", json={"email": email, "password": "pw123456"})
    token = r.json()["access_token"]
    g = await client.post("/games", json={"title": "Card Test Game", "is_public": True, "ruleset": RULESET},
                           headers={"Authorization": f"Bearer {token}"})
    return token, g.json()["id"]


@pytest.mark.asyncio
async def test_create_card(client):
    token, game_id = await _setup(client, "cardmaker1", "cm1@example.com")
    r = await client.post(f"/games/{game_id}/cards", json=CARD_PAYLOAD,
                           headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Fire Dragon"
    assert data["attributes"]["hp"] == 120
    assert len(data["effects"]) == 1


@pytest.mark.asyncio
async def test_list_cards(client):
    token, game_id = await _setup(client, "cardmaker2", "cm2@example.com")
    await client.post(f"/games/{game_id}/cards", json=CARD_PAYLOAD,
                      headers={"Authorization": f"Bearer {token}"})
    r = await client.get(f"/games/{game_id}/cards")
    assert r.status_code == 200
    assert len(r.json()) >= 1


@pytest.mark.asyncio
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


@pytest.mark.asyncio
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
