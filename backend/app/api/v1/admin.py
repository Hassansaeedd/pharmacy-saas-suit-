from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.deps import get_current_user, require_roles
from app.core.security import get_password_hash
from app.models.user import User
from app.models.business import Business
from app.models.inventory import Medicine, Batch
from app.models.sales import Sale
from app.schemas.auth import BusinessOnboard, BusinessResponse
from app.core.seed_data import seed_pharmacy_catalog

router = APIRouter()

@router.get("/pharmacies")
async def list_all_pharmacies(
    current_user: User = Depends(require_roles(["super_admin", "owner_pharmacist"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Super Admin endpoint listing all registered pharmacy tenants.
    """
    stmt = (
        select(Business)
        .options(selectinload(Business.users), selectinload(Business.medicines), selectinload(Business.sales))
        .order_by(Business.created_at.desc())
    )
    result = await db.execute(stmt)
    businesses = result.scalars().all()

    response = []
    for b in businesses:
        owner = next((u for u in b.users if u.role == "owner_pharmacist"), None)
        total_revenue = sum(s.total_amount for s in b.sales)
        
        response.append({
            "id": b.id,
            "name": b.name,
            "license_number": b.license_number,
            "address": b.address,
            "contact": b.contact,
            "subscription_tier": b.subscription_tier,
            "subscription_status": b.subscription_status,
            "trial_ends_at": b.trial_ends_at.isoformat(),
            "created_at": b.created_at.isoformat(),
            "owner_full_name": owner.full_name if owner else "Unassigned",
            "owner_email": owner.email if owner else "N/A",
            "total_users": len(b.users),
            "total_medicines": len(b.medicines),
            "total_sales_count": len(b.sales),
            "total_revenue_pkr": float(total_revenue)
        })

    return response

@router.post("/pharmacies", status_code=status.HTTP_201_CREATED)
async def admin_create_pharmacy(
    data: BusinessOnboard,
    current_user: User = Depends(require_roles(["super_admin", "owner_pharmacist"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Super Admin endpoint to manually create a new pharmacy tenant.
    """
    existing = await db.execute(select(User).where(User.email == data.owner_email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User email already exists")

    new_biz = Business(
        name=data.name,
        license_number=data.license_number,
        address=data.address,
        contact=data.contact,
        subscription_tier="pro",
        subscription_status="active"
    )
    db.add(new_biz)
    await db.flush()

    owner = User(
        business_id=new_biz.id,
        full_name=data.owner_full_name,
        email=data.owner_email,
        password_hash=get_password_hash(data.owner_password),
        role="owner_pharmacist"
    )
    db.add(owner)
    await db.commit()

    # Seed 100 essential Pakistani medicines
    await seed_pharmacy_catalog(db, new_biz.id)

    return {"message": f"Pharmacy '{new_biz.name}' registered successfully with 100 seeded medicines", "business_id": new_biz.id}

@router.delete("/pharmacies/{business_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_pharmacy(
    business_id: int,
    current_user: User = Depends(require_roles(["super_admin", "owner_pharmacist"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Super Admin endpoint to manually delete a pharmacy tenant and all cascade data.
    """
    res = await db.execute(select(Business).where(Business.id == business_id))
    biz = res.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Pharmacy not found")

    if biz.id == current_user.business_id:
        raise HTTPException(status_code=400, detail="Cannot delete Super Admin System HQ tenant")

    await db.delete(biz)
    await db.commit()
