from datetime import datetime, date, timezone
from sqlalchemy import String, DateTime, Date, Integer, Float, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base

class NarcoticsRegister(Base):
    __tablename__ = "narcotics_register"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    business_id: Mapped[int] = mapped_column(Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    sale_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("sales.id", ondelete="SET NULL"), nullable=True)
    medicine_id: Mapped[int] = mapped_column(Integer, ForeignKey("medicines.id"), nullable=False)
    batch_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("batches.id"), nullable=True)
    
    patient_name: Mapped[str] = mapped_column(String(255), nullable=False)
    patient_cnic: Mapped[str | None] = mapped_column(String(50), nullable=True)
    patient_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    
    doctor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    doctor_pmdc: Mapped[str] = mapped_column(String(100), nullable=False) # Doctor PMDC license number
    clinic_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    quantity_dispensed: Mapped[int] = mapped_column(Integer, nullable=False)
    prescription_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    dispensed_by_staff_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
