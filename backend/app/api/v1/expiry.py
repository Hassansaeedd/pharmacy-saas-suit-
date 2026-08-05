from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User
from app.models.inventory import Batch, Medicine, StockMovement

router = APIRouter()

EXPIRY_THRESHOLDS = {
    "critical": 30,   # <= 30 days → red/critical
    "warning":  60,   # <= 60 days → amber/warning
    "monitor":  90,   # <= 90 days → info/monitor
}

@router.get("/alerts")
async def get_expiry_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns three tiers of expiry alerts for the pharmacy:
    - critical:  batches expiring within 30 days (immediate supplier return)
    - warning:   batches expiring within 31–60 days
    - monitor:   batches expiring within 61–90 days
    Also returns a count of already-expired batches with remaining stock.
    """
    business_id = current_user.business_id
    today = date.today()

    stmt = (
        select(Batch)
        .options(selectinload(Batch.medicine), selectinload(Batch.supplier))
        .where(
            Batch.business_id == business_id,
            Batch.quantity_in_stock > 0,
            Batch.expiry_date <= today + timedelta(days=90)
        )
        .order_by(Batch.expiry_date.asc())
    )
    result = await db.execute(stmt)
    batches = result.scalars().all()

    # Also fetch expired stock still in inventory (data quality problem)
    expired_stmt = (
        select(Batch)
        .options(selectinload(Batch.medicine))
        .where(
            Batch.business_id == business_id,
            Batch.quantity_in_stock > 0,
            Batch.expiry_date < today
        )
    )
    expired_result = await db.execute(expired_stmt)
    expired_batches = expired_result.scalars().all()

    def batch_to_dict(b: Batch, days_left: int) -> dict:
        return {
            "id": b.id,
            "batch_number": b.batch_number,
            "medicine_id": b.medicine_id,
            "brand_name": b.medicine.brand_name if b.medicine else "Unknown",
            "generic_name": b.medicine.generic_name if b.medicine else "",
            "quantity_in_stock": b.quantity_in_stock,
            "expiry_date": b.expiry_date.isoformat(),
            "days_until_expiry": days_left,
            "supplier_name": b.supplier.name if b.supplier else None,
            "estimated_loss_pkr": b.quantity_in_stock * (b.medicine.sale_price if b.medicine else 0.0),
        }

    critical = []
    warning = []
    monitor = []

    for b in batches:
        days_left = (b.expiry_date - today).days
        if days_left <= EXPIRY_THRESHOLDS["critical"]:
            critical.append(batch_to_dict(b, days_left))
        elif days_left <= EXPIRY_THRESHOLDS["warning"]:
            warning.append(batch_to_dict(b, days_left))
        else:
            monitor.append(batch_to_dict(b, days_left))

    expired_list = []
    for b in expired_batches:
        days_left = (b.expiry_date - today).days  # negative number
        expired_list.append(batch_to_dict(b, days_left))

    return {
        "summary": {
            "critical_count": len(critical),
            "warning_count": len(warning),
            "monitor_count": len(monitor),
            "expired_with_stock_count": len(expired_list),
            "total_estimated_loss_pkr": sum(b["estimated_loss_pkr"] for b in critical + warning + monitor + expired_list),
        },
        "critical": critical,
        "warning": warning,
        "monitor": monitor,
        "expired_with_stock": expired_list,
    }

@router.post("/batches/{batch_id}/write-off")
async def write_off_expired_batch(
    batch_id: int,
    current_user: User = Depends(require_roles(["owner_pharmacist"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Write-off an expired batch: sets quantity_in_stock to 0
    and records a 'write_off' StockMovement for audit purposes.
    """
    business_id = current_user.business_id

    batch_result = await db.execute(
        select(Batch).where(Batch.id == batch_id, Batch.business_id == business_id)
    )
    batch = batch_result.scalar_one_or_none()
    if not batch:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Batch not found")

    written_off_qty = batch.quantity_in_stock

    # Record audit movement before zeroing out
    movement = StockMovement(
        business_id=business_id,
        batch_id=batch.id,
        type="write_off",
        quantity=written_off_qty,
        reason=f"Expired batch write-off (Expiry: {batch.expiry_date})",
        staff_id=current_user.id
    )
    db.add(movement)

    batch.quantity_in_stock = 0
    await db.commit()

    return {
        "message": f"Batch #{batch.batch_number} written off successfully. {written_off_qty} units removed from inventory.",
        "batch_id": batch_id,
        "written_off_quantity": written_off_qty,
    }
