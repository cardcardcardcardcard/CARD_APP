import pytest

RULESET = {
    "deck_size": 3, "hand_limit": 5, "swap_interval": 3,
    "win_condition": "hp_zero", "turn_phases": ["draw", "main", "battle", "end"],
    "resource_system": "mana", "initial_resource": 1, "resource_per_turn": 1,
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


@pytest.mark.asyncio
async def test_create_deck(client):
    token, game_id, card_ids = await _setup(client, "deckbuilder1", "db1@example.com")
    r = await client.post(f"/games/{game_id}/decks", json={
        "name": "My First Deck",
        "card_ids": card_ids,
    }, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "My First Deck"
    assert len(data["card_ids"]) == 3


@pytest.mark.asyncio
async def test_create_deck_wrong_size(client):
    token, game_id, card_ids = await _setup(client, "deckbuilder2", "db2@example.com")
    r = await client.post(f"/games/{game_id}/decks", json={
        "name": "Too Big",
        "card_ids": card_ids + [card_ids[0]],
    }, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_get_deck(client):
    token, game_id, card_ids = await _setup(client, "deckbuilder3", "db3@example.com")
    cr = await client.post(f"/games/{game_id}/decks", json={"name": "Fetchable", "card_ids": card_ids},
                            headers={"Authorization": f"Bearer {token}"})
    deck_id = cr.json()["id"]
    r = await client.get(f"/decks/{deck_id}", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["id"] == deck_id


@pytest.mark.asyncio
async def test_list_my_decks(client):
    token, game_id, card_ids = await _setup(client, "deckbuilder4", "db4@example.com")
    await client.post(f"/games/{game_id}/decks", json={"name": "Deck A", "card_ids": card_ids},
                      headers={"Authorization": f"Bearer {token}"})
    r = await client.get(f"/games/{game_id}/decks/mine", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert any(d["name"] == "Deck A" for d in r.json())
