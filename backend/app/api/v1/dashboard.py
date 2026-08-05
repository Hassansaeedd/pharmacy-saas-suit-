from datetime import datetime, date, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User
from app.models.inventory import Medicine, Batch
from app.models.sales import Sale, SaleItem

router = APIRouter()

@router.get("/summary")
async def get_dashboard_summary(
    current_user: User = Depends(require_roles(["owner_pharmacist"])),
    db: AsyncSession = Depends(get_db)
):
    business_id = current_user.business_id
    today = date.today()
    start_of_today = datetime.combine(today, datetime.min.time())
    end_of_today = datetime.combine(today, datetime.max.time())

    # 1. Today's Sales Total & Count
    today_sales_res = await db.execute(
        select(
            func.coalesce(func.sum(Sale.total_amount), 0.0),
            func.count(Sale.id)
        ).where(
            Sale.business_id == business_id,
            Sale.created_at >= start_of_today,
            Sale.created_at <= end_of_today
        )
    )
    today_total, today_count = today_sales_res.tuples().first()

    # 2. Top-Selling Medicines (by quantity sold)
    top_selling_res = await db.execute(
        select(
            Medicine.brand_name,
            Medicine.generic_name,
            func.sum(SaleItem.quantity).label("total_qty_sold"),
            func.sum(SaleItem.subtotal).label("total_revenue")
        )
        .join(SaleItem, SaleItem.medicine_id == Medicine.id)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(Sale.business_id == business_id)
        .group_by(Medicine.id, Medicine.brand_name, Medicine.generic_name)
        .order_by(func.sum(SaleItem.quantity).desc())
        .limit(5)
    )
    top_sellers = [
        {
            "brand_name": row[0],
            "generic_name": row[1],
            "quantity_sold": int(row[2]),
            "revenue": float(row[3])
        }
        for row in top_selling_res.tuples().all()
    ]

    # 3. Expiring Soon Widget (Within 30, 60, 90 days)
    cutoff_90 = today + timedelta(days=90)
    expiring_res = await db.execute(
        select(Batch)
        .options(selectinload(Batch.medicine), selectinload(Batch.supplier))
        .where(
            Batch.business_id == business_id,
            Batch.quantity_in_stock > 0,
            Batch.expiry_date <= cutoff_90
        )
        .order_by(Batch.expiry_date.asc())
        .limit(10)
    )
    expiring_batches = []
    expiring_30_count = 0
    expiring_60_count = 0
    expiring_90_count = 0

    for b in expiring_res.scalars().all():
        days_left = (b.expiry_date - today).days
        if days_left <= 30:
            expiring_30_count += 1
        elif days_left <= 60:
            expiring_60_count += 1
        else:
            expiring_90_count += 1

        expiring_batches.append({
            "batch_number": b.batch_number,
            "medicine_name": b.medicine.brand_name if b.medicine else "Unknown",
            "quantity": b.quantity_in_stock,
            "expiry_date": b.expiry_date.isoformat(),
            "days_until_expiry": days_left,
            "supplier_name": b.supplier.name if b.supplier else None
        })

    # 4. Low-Stock Widget (Stock < reorder_threshold)
    meds_res = await db.execute(
        select(Medicine)
        .options(selectinload(Medicine.batches))
        .where(Medicine.business_id == business_id)
    )
    low_stock_medicines = []
    for med in meds_res.scalars().all():
        tot_stock = sum(b.quantity_in_stock for b in med.batches)
        if tot_stock < med.reorder_threshold:
            low_stock_medicines.append({
                "id": med.id,
                "brand_name": med.brand_name,
                "generic_name": med.generic_name,
                "total_stock": tot_stock,
                "reorder_threshold": med.reorder_threshold
            })

    # 5. Revenue Chart Data (Daily revenue for last 30 days)
    start_30_days = today - timedelta(days=29)
    start_dt = datetime.combine(start_30_days, datetime.min.time())

    sales_period_res = await db.execute(
        select(
            func.date(Sale.created_at).label("sale_date"),
            func.sum(Sale.total_amount).label("daily_total")
        )
        .where(
            Sale.business_id == business_id,
            Sale.created_at >= start_dt
        )
        .group_by(func.date(Sale.created_at))
        .order_by(func.date(Sale.created_at).asc())
    )

    revenue_by_date = {str(row[0]): float(row[1]) for row in sales_period_res.tuples().all()}

    chart_data = []
    for i in range(30):
        d = start_30_days + timedelta(days=i)
        d_str = d.isoformat()
        chart_data.append({
            "date": d.strftime("%b %d"),
            "revenue": revenue_by_date.get(d_str, 0.0)
        })

    return {
        "today_sales_total": float(today_total),
        "today_sales_count": int(today_count),
        "top_selling_medicines": top_sellers,
        "expiring_summary": {
            "expiring_30_days": expiring_30_count,
            "expiring_60_days": expiring_60_count,
            "expiring_90_days": expiring_90_count,
            "batches": expiring_batches
        },
        "low_stock_summary": {
            "total_low_stock_count": len(low_stock_medicines),
            "medicines": low_stock_medicines
        },
        "revenue_chart": chart_data
    }
