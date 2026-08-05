import csv
import io
from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.inventory import Supplier, Medicine, Batch, StockMovement
from app.schemas.inventory import (
    SupplierCreate, SupplierResponse,
    MedicineCreate, MedicineUpdate, MedicineResponse,
    BatchCreate, BatchResponse
)

router = APIRouter()

# --- SUPPLIERS ---
@router.post("/suppliers", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    data: SupplierCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    supplier = Supplier(
        business_id=current_user.business_id,
        name=data.name,
        contact=data.contact,
        address=data.address
    )
    db.add(supplier)
    await db.commit()
    await db.refresh(supplier)
    return SupplierResponse.model_validate(supplier)

@router.get("/suppliers", response_model=List[SupplierResponse])
async def list_suppliers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Supplier).where(Supplier.business_id == current_user.business_id).order_by(Supplier.name)
    )
    suppliers = result.scalars().all()
    return [SupplierResponse.model_validate(s) for s in suppliers]

# --- MEDICINES ---
@router.post("/medicines", response_model=MedicineResponse, status_code=status.HTTP_201_CREATED)
async def create_medicine(
    data: MedicineCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    medicine = Medicine(
        business_id=current_user.business_id,
        brand_name=data.brand_name.strip(),
        generic_name=data.generic_name.strip(),
        manufacturer=data.manufacturer,
        category=data.category,
        requires_prescription=data.requires_prescription,
        unit_type=data.unit_type,
        purchase_price=data.purchase_price,
        sale_price=data.sale_price,
        reorder_threshold=data.reorder_threshold
    )
    db.add(medicine)
    await db.commit()
    await db.refresh(medicine)
    
    return MedicineResponse(
        id=medicine.id,
        business_id=medicine.business_id,
        brand_name=medicine.brand_name,
        generic_name=medicine.generic_name,
        manufacturer=medicine.manufacturer,
        category=medicine.category,
        requires_prescription=medicine.requires_prescription,
        unit_type=medicine.unit_type,
        purchase_price=medicine.purchase_price,
        sale_price=medicine.sale_price,
        reorder_threshold=medicine.reorder_threshold,
        total_stock=0,
        earliest_expiry=None,
        batches=[],
        created_at=medicine.created_at
    )

@router.get("/medicines", response_model=List[MedicineResponse])
async def list_medicines(
    q: Optional[str] = Query(None, description="Search by brand or generic name"),
    low_stock_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Medicine)
        .options(selectinload(Medicine.batches).selectinload(Batch.supplier))
        .where(Medicine.business_id == current_user.business_id)
    )
    
    # Dual Search: brand_name OR generic_name
    if q and q.strip():
        search_term = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Medicine.brand_name.ilike(search_term),
                Medicine.generic_name.ilike(search_term)
            )
        )
        
    stmt = stmt.order_by(Medicine.brand_name)
    result = await db.execute(stmt)
    medicines = result.scalars().all()
    
    response_list = []
    for med in medicines:
        # Calculate total stock aggregated across non-expired/active batches
        total_stock = sum(b.quantity_in_stock for b in med.batches)
        
        if low_stock_only and total_stock >= med.reorder_threshold:
            continue
            
        # Earliest expiry date
        active_batches = [b for b in med.batches if b.quantity_in_stock > 0]
        earliest_expiry = min((b.expiry_date for b in active_batches), default=None)
        
        batch_responses = []
        for b in med.batches:
            b_resp = BatchResponse.model_validate(b)
            b_resp.supplier_name = b.supplier.name if b.supplier else None
            batch_responses.append(b_resp)
            
        med_resp = MedicineResponse.model_validate(med)
        med_resp.total_stock = total_stock
        med_resp.earliest_expiry = earliest_expiry
        med_resp.batches = batch_responses
        response_list.append(med_resp)
        
    return response_list

@router.get("/medicines/{medicine_id}", response_model=MedicineResponse)
async def get_medicine(
    medicine_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Medicine)
        .options(selectinload(Medicine.batches).selectinload(Batch.supplier))
        .where(Medicine.id == medicine_id, Medicine.business_id == current_user.business_id)
    )
    result = await db.execute(stmt)
    med = result.scalar_one_or_none()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
        
    total_stock = sum(b.quantity_in_stock for b in med.batches)
    active_batches = [b for b in med.batches if b.quantity_in_stock > 0]
    earliest_expiry = min((b.expiry_date for b in active_batches), default=None)
    
    batch_responses = []
    for b in med.batches:
        b_resp = BatchResponse.model_validate(b)
        b_resp.supplier_name = b.supplier.name if b.supplier else None
        batch_responses.append(b_resp)
        
    med_resp = MedicineResponse.model_validate(med)
    med_resp.total_stock = total_stock
    med_resp.earliest_expiry = earliest_expiry
    med_resp.batches = batch_responses
    return med_resp

@router.put("/medicines/{medicine_id}", response_model=MedicineResponse)
async def update_medicine(
    medicine_id: int,
    data: MedicineUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Medicine).where(Medicine.id == medicine_id, Medicine.business_id == current_user.business_id)
    )
    med = result.scalar_one_or_none()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
        
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(med, key, value)
        
    await db.commit()
    await db.refresh(med)
    return await get_medicine(medicine_id, current_user, db)

@router.delete("/medicines/{medicine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_medicine(
    medicine_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Medicine).where(Medicine.id == medicine_id, Medicine.business_id == current_user.business_id)
    )
    med = result.scalar_one_or_none()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
        
    await db.delete(med)
    await db.commit()

@router.post("/medicines/import-csv", response_model=dict)
async def import_medicines_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
    content = await file.read()
    text = content.decode('utf-8-sig') # Handles UTF-8 BOM from Excel
    reader = csv.DictReader(io.StringIO(text))
    
    created_count = 0
    errors = []
    
    for row_idx, row in enumerate(reader, start=2):
        brand_name = row.get("brand_name", "").strip()
        generic_name = row.get("generic_name", "").strip()
        
        if not brand_name or not generic_name:
            errors.append(f"Row {row_idx}: Missing brand_name or generic_name")
            continue
            
        category = row.get("category", "tablet").strip()
        req_rx = str(row.get("requires_prescription", "")).strip().lower() in ["true", "1", "yes"]
        unit_type = row.get("unit_type", "strip").strip()
        
        try:
            purchase_price = float(row.get("purchase_price", 0))
            sale_price = float(row.get("sale_price", 0))
            reorder_threshold = int(row.get("reorder_threshold", 10))
        except ValueError:
            errors.append(f"Row {row_idx}: Invalid numeric pricing data")
            continue
            
        med = Medicine(
            business_id=current_user.business_id,
            brand_name=brand_name,
            generic_name=generic_name,
            manufacturer=row.get("manufacturer", "").strip() or None,
            category=category,
            requires_prescription=req_rx,
            unit_type=unit_type,
            purchase_price=purchase_price,
            sale_price=sale_price,
            reorder_threshold=reorder_threshold
        )
        db.add(med)
        created_count += 1
        
    await db.commit()
    return {"created_count": created_count, "errors": errors}

# --- BATCHES ---
@router.post("/batches", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
async def create_batch(
    data: BatchCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Form Validation: Reject batches with past expiry dates on entry
    if data.expiry_date < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Expiry date ({data.expiry_date}) cannot be in the past!"
        )
        
    # Verify medicine belongs to tenant
    med_res = await db.execute(
        select(Medicine).where(Medicine.id == data.medicine_id, Medicine.business_id == current_user.business_id)
    )
    if not med_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Medicine not found for this pharmacy")
        
    batch = Batch(
        business_id=current_user.business_id,
        medicine_id=data.medicine_id,
        batch_number=data.batch_number.strip(),
        expiry_date=data.expiry_date,
        quantity_in_stock=data.quantity_in_stock,
        received_date=date.today(),
        supplier_id=data.supplier_id,
        purchase_price=data.purchase_price
    )
    db.add(batch)
    await db.flush()
    
    # Record Stock Movement ('in')
    movement = StockMovement(
        business_id=current_user.business_id,
        batch_id=batch.id,
        type="in",
        quantity=data.quantity_in_stock,
        reason="Stock Batch Received",
        staff_id=current_user.id
    )
    db.add(movement)
    await db.commit()
    await db.refresh(batch)
    
    res = BatchResponse.model_validate(batch)
    if data.supplier_id:
        sup_res = await db.execute(select(Supplier).where(Supplier.id == data.supplier_id))
        sup = sup_res.scalar_one_or_none()
        res.supplier_name = sup.name if sup else None
        
    return res

@router.get("/batches", response_model=List[BatchResponse])
async def list_batches(
    medicine_id: Optional[int] = None,
    expiring_days: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Batch)
        .options(selectinload(Batch.supplier))
        .where(Batch.business_id == current_user.business_id)
    )
    
    if medicine_id:
        stmt = stmt.where(Batch.medicine_id == medicine_id)
        
    if expiring_days:
        cutoff = date.today() + timedelta(days=expiring_days)
        stmt = stmt.where(Batch.expiry_date <= cutoff)
        
    stmt = stmt.order_by(Batch.expiry_date.asc())
    result = await db.execute(stmt)
    batches = result.scalars().all()
    
    res_list = []
    for b in batches:
        b_resp = BatchResponse.model_validate(b)
        b_resp.supplier_name = b.supplier.name if b.supplier else None
        res_list.append(b_resp)
        
    return res_list
