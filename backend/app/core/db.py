from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

# Engine configuration — handles SQLite (local) and PostgreSQL (Neon/Supabase/Render)
db_url = settings.DATABASE_URL

# Normalize postgres:// → postgresql+asyncpg://
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Strip ?sslmode=require from URL — asyncpg handles SSL via connect_args instead
if "?sslmode=require" in db_url:
    db_url = db_url.replace("?sslmode=require", "")

connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
elif db_url.startswith("postgresql+asyncpg"):
    # Required for Neon, Supabase, and any cloud PostgreSQL over SSL
    connect_args = {"ssl": "require"}

engine = create_async_engine(
    db_url,
    echo=False,
    connect_args=connect_args,
    pool_pre_ping=True,   # reconnect if connection dropped (important for serverless DBs)
    pool_size=5,
    max_overflow=10,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
