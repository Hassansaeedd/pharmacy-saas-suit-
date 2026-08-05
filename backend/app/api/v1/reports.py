import csv
import io
from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Response, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User
from app.models.inventory import Medicine, Batch, Supplier
from app.models.sales import Sale, SaleItem

router = APIRouter()

@router.get("/expiry")
async def get_expiry_report(
    days: Optional[int] = Query(90, description="Include batches expiring within X days"),
    current_user: User = Depends(require_roles(["owner_pharmacist"])),
    db: AsyncSession = Depends(get_db)
):
    business_id = current_user.business_id
    cutoff = date.today() + timedelta(days=days)

    stmt = (
        select(Batch)
        .options(selectinload(Batch.medicine), selectinload(Batch.supplier))
        .where(
            Batch.business_id == business_id,
            Batch.quantity_in_stock > 0,
            Batch.expiry_date <= cutoff
        )
        .order_by(Batch.expiry_date.asc())
    )
    result = await db.execute(stmt)
    batches = result.scalars().all()

    report_items = []
    for b in batches:
        days_left = (b.expiry_date - date.today()).days
        report_items.append({
            "id": b.id,
            "batch_number": b.batch_number,
            "medicine_id": b.medicine_id,
            "brand_name": b.medicine.brand_name if b.medicine else "Unknown",
            "generic_name": b.medicine.generic_name if b.medicine else "",
            "category": b.medicine.category if b.medicine else "tablet",
            "quantity_in_stock": b.quantity_in_stock,
            "expiry_date": b.expiry_date.isoformat(),
            "days_until_expiry": days_left,
            "supplier_name": b.supplier.name if b.supplier else "N/A",
            "estimated_loss_value": b.quantity_in_stock * (b.medicine.sale_price if b.medicine else 0.0)
        })

    return report_items

@router.get("/expiry/csv")
async def export_expiry_csv(
    days: Optional[int] = Query(90),
    current_user: User = Depends(require_roles(["owner_pharmacist"])),
    db: AsyncSession = Depends(get_db)
):
    items = await get_expiry_report(days=days, current_user=current_user, db=db)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Batch Number", "Brand Name", "Generic Name", "Category", 
        "Stock Qty", "Expiry Date", "Days Until Expiry", "Supplier", "Estimated Value (PKR)"
    ])

    for item in items:
        writer.writerow([
            item["batch_number"],
            item["brand_name"],
            item["generic_name"],
            item["category"],
            item["quantity_in_stock"],
            item["expiry_date"],
            item["days_until_expiry"],
            item["supplier_name"],
            f"{item['estimated_loss_value']:.2f}"
        ])

    csv_data = output.getvalue()
    output.close()

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=PharmaFlow-Expiry-Report-{date.today().isoformat()}.csv"}
    )

@router.get("/profit")
async def get_profit_report(
    current_user: User = Depends(require_roles(["owner_pharmacist"])),
    db: AsyncSession = Depends(get_db)
):
    business_id = current_user.business_id

    # Compute Profit per Category
    # Gross Profit = (SaleItem.unit_price - Batch.purchase_price) * SaleItem.quantity
    stmt = (
        select(
            Medicine.category,
            func.sum(SaleItem.quantity).label("total_items_sold"),
            func.sum(SaleItem.subtotal).label("total_revenue"),
            func.sum((SaleItem.unit_price - Batch.purchase_price) * SaleItem.quantity).label("gross_profit")
        )
        .join(SaleItem, SaleItem.medicine_id == Medicine.id)
        .join(Batch, Batch.id == SaleItem.batch_id)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(Sale.business_id == business_id)
        .group_by(Medicine.category)
    )

    result = await db.execute(stmt)
    category_profits = []
    total_revenue = 0.0
    total_profit = 0.0

    for row in result.tuples().all():
        cat, qty, rev, profit = row[0], int(row[1]), float(row[2]), float(row[3])
        total_revenue += rev
        total_profit += profit
        category_profits.append({
            "category": cat,
            "items_sold": qty,
            "revenue": rev,
            "profit": profit,
            "margin_percentage": (profit / rev * 100) if rev > 0 else 0.0
        })

    return {
        "total_revenue": total_revenue,
        "total_gross_profit": total_profit,
        "overall_margin_percentage": (total_profit / total_revenue * 100) if total_revenue > 0 else 0.0,
        "categories": category_profits
    }
