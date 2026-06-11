import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from app.database import Base
from app.main import app
from app.dependencies import get_db
from app.config import settings

TEST_DATABASE_URL = settings.TEST_DATABASE_URL


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine


@pytest_asyncio.fixture(scope="session")
async def db(test_engine):
    TestSession = async_sessionmaker(test_engine, expire_on_commit=False)
    session = TestSession()
    yield session


@pytest_asyncio.fixture(scope="session")
async def client(db):
    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    c = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
    await c.__aenter__()
    yield c
    app.dependency_overrides.clear()
