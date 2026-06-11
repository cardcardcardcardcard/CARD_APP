import pytest

RULESET = {
    "deck_size": 3, "hand_limit": 5, "swap_interval": 3,
    "win_condition": "hp_zero", "turn_phases": ["draw", "main", "battle", "end"],
    "resource_system": "mana", "initial_resource": 1, "resource_per_turn": 1,
}


async def _make_player(client, username, email):
    await client.post("/auth/register", json={"username": username, "email": email, "password": "pw123456"})
    r = await client.post("/auth/login", json={"email": email, "password": "pw123456"})
    return r.json()["access_token"]


async def _make_game_and_deck(client, token, prefix):
    g = await client.post("/games", json={"title": f"{prefix} Game", "is_public": True, "ruleset": RULESET},
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

    # player_b creates a deck in the same game (needs creator access)
    # use token_a to add cards, then token_b builds their own deck
    cards_b = []
    for i in range(3):
        cr = await client.post(f"/games/{game_id_a}/cards",
                                json={"name": f"B Card {i}", "attributes": {"hp": 100}, "effects": []},
                                headers={"Authorization": f"Bearer {token_a}"})
        cards_b.append(cr.json()["id"])
    d_b = await client.post(f"/games/{game_id_a}/decks",
                              json={"name": "DeckB", "card_ids": cards_b},
                              headers={"Authorization": f"Bearer {token_b}"})
    deck_id_b = d_b.json()["id"]

    cr = await client.post("/battles", json={"game_id": game_id_a, "deck_id": deck_id_a},
                            headers={"Authorization": f"Bearer {token_a}"})
    battle_id = cr.json()["id"]

    r = await client.post(f"/battles/{battle_id}/join", json={"deck_id": deck_id_b},
                           headers={"Authorization": f"Bearer {token_b}"})
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "playing"
    assert data["player_b_id"] is not None
