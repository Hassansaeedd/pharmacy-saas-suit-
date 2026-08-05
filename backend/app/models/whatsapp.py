from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base

class WhatsAppOrder(Base):
    __tablename__ = "whatsapp_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    business_id: Mapped[int] = mapped_column(Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_phone: Mapped[str] = mapped_column(String(100), nullable=False)
    raw_message: Mapped[str] = mapped_column(Text, nullable=False)
    parsed_items: Mapped[str] = mapped_column(Text, nullable=False, default="[]") # JSON string of parsed medicines & quantities
    status: Mapped[str] = mapped_column(String(50), default="pending") # pending, confirmed, cancelled
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
