import pytest


@pytest.mark.asyncio
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


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    payload = {"username": "user1", "email": "dup@example.com", "password": "pw123456"}
    await client.post("/auth/register", json=payload)
    payload["username"] = "user2"
    r = await client.post("/auth/register", json=payload)
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_register_duplicate_username(client):
    payload = {"username": "dupuser", "email": "a@example.com", "password": "pw123456"}
    await client.post("/auth/register", json=payload)
    payload["email"] = "b@example.com"
    r = await client.post("/auth/register", json=payload)
    assert r.status_code == 409
