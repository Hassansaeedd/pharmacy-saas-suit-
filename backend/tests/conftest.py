import pytest
import pytest_asyncio
import os
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.db import Base, get_db

TEST_DB_FILE = "./test_pharmaflow_temp.db"
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DB_FILE}"

engine_test = create_async_engine(TEST_DATABASE_URL, echo=False)
AsyncSessionTest = async_sessionmaker(engine_test, class_=AsyncSession, expire_on_commit=False)

@pytest_asyncio.fixture(scope="function")
async def db_engine():
    """Create fresh tables for each test in file-backed SQLite, then cleanup."""
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine_test
    
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine_test.dispose()
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except OSError:
            pass

@pytest_asyncio.fixture(scope="function")
async def client(db_engine):
    """
    HTTP test client. Each DI call gets a new session on the shared file DB engine.
    """
    async def override_get_db():
        async with AsyncSessionTest() as session:
            yield session

    from app.main import app
    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
