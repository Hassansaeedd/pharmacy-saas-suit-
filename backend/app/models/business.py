from datetime import datetime, timezone, timedelta
from sqlalchemy import String, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base

class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    license_number: Mapped[str] = mapped_column(String(100), nullable=False)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    contact: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    # Subscription info
    subscription_tier: Mapped[str] = mapped_column(String(50), default="basic") # 'basic', 'pro'
    subscription_status: Mapped[str] = mapped_column(String(50), default="trial") # 'trial', 'active', 'expired'
    trial_ends_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc) + timedelta(days=14)
    )
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    users: Mapped[list["User"]] = relationship("User", back_populates="business", cascade="all, delete-orphan")
    medicines: Mapped[list["Medicine"]] = relationship("Medicine", back_populates="business", cascade="all, delete-orphan")
    sales: Mapped[list["Sale"]] = relationship("Sale", back_populates="business", cascade="all, delete-orphan")
