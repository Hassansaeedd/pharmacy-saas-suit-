from datetime import date, datetime, timedelta
from typing import List, Dict, Any
import numpy as np
from sklearn.linear_model import Ridge
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.inventory import Medicine, Batch, Supplier
from app.models.sales import Sale, SaleItem

async def calculate_medicine_forecasts(db: AsyncSession, business_id: int) -> List[Dict[str, Any]]:
    """
    ML Sales Velocity & Reorder Forecasting using Scikit-Learn Ridge Regression.
    Predicts:
    - Daily sales velocity (units / day)
    - Days until stockout (based on current stock & sales velocity)
    - Projected expiry loss (stock left at expiry date based on sales velocity)
    - Suggested reorder quantity
    """
    today = date.today()
    start_30_days = today - timedelta(days=30)
    start_dt = datetime.combine(start_30_days, datetime.min.time())

    # Fetch all medicines with active batches
    meds_res = await db.execute(
        select(Medicine)
        .options(selectinload(Medicine.batches).selectinload(Batch.supplier))
        .where(Medicine.business_id == business_id)
        .order_by(Medicine.brand_name)
    )
    medicines = meds_res.scalars().all()

    forecast_results = []

    for med in medicines:
        total_stock = sum(b.quantity_in_stock for b in med.batches)
        active_batches = [b for b in med.batches if b.quantity_in_stock > 0]
        earliest_expiry = min((b.expiry_date for b in active_batches), default=None)

        # Fetch daily sales history over past 30 days
        sales_res = await db.execute(
            select(
                func.date(Sale.created_at).label("sale_date"),
                func.sum(SaleItem.quantity).label("daily_qty")
            )
            .join(Sale, Sale.id == SaleItem.sale_id)
            .where(
                Sale.business_id == business_id,
                SaleItem.medicine_id == med.id,
                Sale.created_at >= start_dt
            )
            .group_by(func.date(Sale.created_at))
        )
        daily_sales_dict = {str(row[0]): int(row[1]) for row in sales_res.tuples().all()}

        # Build feature matrix X (days 0..29) and target y (units sold per day)
        X = np.arange(30).reshape(-1, 1)
        y = np.zeros(30)
        for i in range(30):
            d_str = (start_30_days + timedelta(days=i)).isoformat()
            y[i] = daily_sales_dict.get(d_str, 0)

        total_30d_sold = int(np.sum(y))

        # Train Scikit-Learn Ridge Regression Model
        model = Ridge(alpha=1.0)
        model.fit(X, y)
        
        # Predicted daily sales velocity (clip negative slopes to 0.05 min if sales exist)
        predicted_velocity = float(np.mean(model.predict(np.arange(30, 60).reshape(-1, 1))))
        avg_velocity = max(float(np.mean(y)), 0.0)
        
        # Hybrid velocity: 70% 30-day average + 30% ML trend
        daily_velocity = round(max(0.7 * avg_velocity + 0.3 * predicted_velocity, 0.01 if total_30d_sold > 0 else 0.0), 2)

        # Days until stockout calculation
        if daily_velocity > 0:
            days_until_stockout = int(np.ceil(total_stock / daily_velocity))
        else:
            days_until_stockout = 999 # Unlimited / no recent velocity

        estimated_stockout_date = (today + timedelta(days=days_until_stockout)).isoformat() if days_until_stockout < 365 else "N/A (> 1 Year)"

        # Projected Expiry Risk calculation (Stock remaining when earliest batch expires)
        projected_expiry_loss_units = 0
        projected_expiry_loss_pkr = 0.0

        if earliest_expiry and daily_velocity > 0:
            days_to_expiry = (earliest_expiry - today).days
            if days_to_expiry > 0:
                expected_sales_before_expiry = int(days_to_expiry * daily_velocity)
                if expected_sales_before_expiry < total_stock:
                    projected_expiry_loss_units = total_stock - expected_sales_before_expiry
                    projected_expiry_loss_pkr = projected_expiry_loss_units * med.sale_price

        # Reorder Recommendation logic
        needs_reorder = total_stock <= med.reorder_threshold or (days_until_stockout <= 14 and total_stock > 0)
        suggested_reorder_qty = max((med.reorder_threshold * 2) - total_stock, 20) if needs_reorder else 0

        # Primary supplier
        primary_supplier = active_batches[0].supplier.name if (active_batches and active_batches[0].supplier) else "Unassigned"

        forecast_results.append({
            "medicine_id": med.id,
            "brand_name": med.brand_name,
            "generic_name": med.generic_name,
            "category": med.category,
            "total_stock": total_stock,
            "reorder_threshold": med.reorder_threshold,
            "daily_sales_velocity": daily_velocity,
            "total_30d_sold": total_30d_sold,
            "days_until_stockout": days_until_stockout,
            "estimated_stockout_date": estimated_stockout_date,
            "earliest_expiry": earliest_expiry.isoformat() if earliest_expiry else None,
            "projected_expiry_loss_units": projected_expiry_loss_units,
            "projected_expiry_loss_pkr": round(projected_expiry_loss_pkr, 2),
            "needs_reorder": needs_reorder,
            "suggested_reorder_qty": suggested_reorder_qty,
            "primary_supplier": primary_supplier
        })

    return forecast_results
