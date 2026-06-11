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


@pytest.mark.asyncio
async def test_login_success(client):
    await client.post("/auth/register", json={
        "username": "loginuser", "email": "login@example.com", "password": "pass1234"
    })
    r = await client.post("/auth/login", json={"email": "login@example.com", "password": "pass1234"})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    r = await client.post("/auth/login", json={"email": "login@example.com", "password": "wrongpass"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email(client):
    r = await client.post("/auth/login", json={"email": "nobody@example.com", "password": "pass"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_me_success(client):
    await client.post("/auth/register", json={
        "username": "meuser", "email": "me@example.com", "password": "pass1234"
    })
    login = await client.post("/auth/login", json={"email": "me@example.com", "password": "pass1234"})
    token = login.json()["access_token"]
    r = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "me@example.com"


@pytest.mark.asyncio
async def test_me_invalid_token(client):
    r = await client.get("/auth/me", headers={"Authorization": "Bearer invalidtoken"})
    assert r.status_code == 401
