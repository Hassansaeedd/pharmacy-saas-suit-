from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.db import engine, Base

# Import models so SQLAlchemy registers them with Base.metadata
import app.models # noqa

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables if sqlite/dev mode
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS Middleware (allows frontend local dev server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router imports
from app.api.v1 import auth, business, inventory, pos, dashboard, reports, expiry, forecasting, whatsapp, admin

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Auth & Onboarding"])
app.include_router(business.router, prefix=f"{settings.API_V1_STR}/business", tags=["Business & Staff"])
app.include_router(inventory.router, prefix=f"{settings.API_V1_STR}/inventory", tags=["Inventory & Batches"])
app.include_router(pos.router, prefix=f"{settings.API_V1_STR}/pos", tags=["Point of Sale (POS)"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["Dashboard Summary"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["Reports & Analytics"])
app.include_router(expiry.router, prefix=f"{settings.API_V1_STR}/expiry", tags=["Expiry Management & Alerts"])
app.include_router(forecasting.router, prefix=f"{settings.API_V1_STR}/forecasting", tags=["AI/ML Forecasting & POs"])
app.include_router(whatsapp.router, prefix=f"{settings.API_V1_STR}/whatsapp", tags=["WhatsApp Bot & Webhook"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["Super Admin Portal"])

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "PharmaFlow Backend", "currency": "PKR"}
