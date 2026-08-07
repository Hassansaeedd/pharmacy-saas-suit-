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
    
    # Auto-seed Super Admin account if missing
    from app.core.db import AsyncSessionLocal
    from app.models.business import Business
    from app.models.user import User
    from app.core.security import get_password_hash
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.email == "admin@pharmaflow.pk"))
        if not res.scalar_one_or_none():
            biz = Business(
                name="PharmaFlow Admin HQ",
                license_number="ADMIN-0001",
                address="Headquarters, Lahore",
                contact="0300-0000000",
                subscription_tier="pro",
                subscription_status="active"
            )
            db.add(biz)
            await db.flush()
            user = User(
                business_id=biz.id,
                full_name="Super Admin",
                email="admin@pharmaflow.pk",
                password_hash=get_password_hash("Admin123!"),
                role="super_admin"
            )
            db.add(user)
            await db.commit()

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
