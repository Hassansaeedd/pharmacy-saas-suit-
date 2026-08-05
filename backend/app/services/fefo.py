from datetime import date
from typing import List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.inventory import Medicine, Batch

async def select_fefo_batches(
    db: AsyncSession,
    business_id: int,
    medicine_id: int,
    required_qty: int,
    manual_batch_id: int | None = None
) -> List[Tuple[Batch, int]]:
    """
    Selects batches using FEFO (First-Expiry-First-Out) logic.
    Returns a list of tuples: (Batch, quantity_to_take_from_this_batch).
    """
    # Fetch medicine
    med_res = await db.execute(
        select(Medicine).where(Medicine.id == medicine_id, Medicine.business_id == business_id)
    )
    medicine = med_res.scalar_one_or_none()
    if not medicine:
        raise HTTPException(status_code=404, detail=f"Medicine ID {medicine_id} not found")

    # If staff manually selected a batch
    if manual_batch_id:
        batch_res = await db.execute(
            select(Batch).where(
                Batch.id == manual_batch_id,
                Batch.business_id == business_id,
                Batch.medicine_id == medicine_id
            )
        )
        batch = batch_res.scalar_one_or_none()
        if not batch:
            raise HTTPException(status_code=404, detail=f"Selected batch ID {manual_batch_id} not found")
        if batch.expiry_date < date.today():
            raise HTTPException(status_code=400, detail=f"Cannot sell from expired batch #{batch.batch_number} (Expired: {batch.expiry_date})")
        if batch.quantity_in_stock < required_qty:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock in manual batch #{batch.batch_number} (Requested: {required_qty}, Available: {batch.quantity_in_stock})"
            )
        return [(batch, required_qty)]

    # Auto FEFO Selection: sort by earliest non-expired expiry_date
    batches_res = await db.execute(
        select(Batch)
        .where(
            Batch.business_id == business_id,
            Batch.medicine_id == medicine_id,
            Batch.quantity_in_stock > 0,
            Batch.expiry_date >= date.today() # Server-side FEFO: NEVER sell expired stock
        )
        .order_by(Batch.expiry_date.asc())
    )
    available_batches = batches_res.scalars().all()

    total_available = sum(b.quantity_in_stock for b in available_batches)
    if total_available < required_qty:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient active stock for {medicine.brand_name} (Requested: {required_qty}, Available non-expired: {total_available})"
        )

    allocations = []
    remaining = required_qty

    for b in available_batches:
        if remaining <= 0:
            break
        take_qty = min(b.quantity_in_stock, remaining)
        allocations.append((b, take_qty))
        remaining -= take_qty

    return allocations
