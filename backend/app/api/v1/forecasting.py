from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User
from app.services.forecast import calculate_medicine_forecasts

router = APIRouter()

@router.get("/reorder")
async def get_reorder_forecasts(
    current_user: User = Depends(require_roles(["owner_pharmacist"])),
    db: AsyncSession = Depends(get_db)
):
    forecasts = await calculate_medicine_forecasts(db, current_user.business_id)
    return forecasts

@router.get("/purchase-orders")
async def get_draft_purchase_orders(
    current_user: User = Depends(require_roles(["owner_pharmacist"])),
    db: AsyncSession = Depends(get_db)
):
    forecasts = await calculate_medicine_forecasts(db, current_user.business_id)
    
    # Filter items that need reordering
    reorder_items = [f for f in forecasts if f["needs_reorder"]]

    # Group by supplier
    suppliers_dict: Dict[str, List[Dict[str, Any]]] = {}
    for item in reorder_items:
        sup_name = item["primary_supplier"]
        if sup_name not in suppliers_dict:
            suppliers_dict[sup_name] = []
        suppliers_dict[sup_name].append({
            "medicine_id": item["medicine_id"],
            "brand_name": item["brand_name"],
            "generic_name": item["generic_name"],
            "current_stock": item["total_stock"],
            "suggested_order_qty": item["suggested_reorder_qty"],
            "reason": "Stock below reorder limit" if item["total_stock"] <= item["reorder_threshold"] else f"Stockout predicted in {item['days_until_stockout']} days"
        })

    purchase_orders = []
    for sup_name, items in suppliers_dict.items():
        purchase_orders.append({
            "supplier_name": sup_name,
            "item_count": len(items),
            "items": items
        })

    return {
        "total_purchase_orders": len(purchase_orders),
        "total_items_to_reorder": len(reorder_items),
        "purchase_orders": purchase_orders
    }
