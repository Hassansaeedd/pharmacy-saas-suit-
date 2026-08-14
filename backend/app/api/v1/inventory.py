import csv
import io
from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, delete
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.inventory import Supplier, Medicine, Batch, StockMovement
from app.models.sales import PurchaseOrder, PurchaseOrderItem, SaleItem
from app.schemas.inventory import (
    SupplierCreate, SupplierResponse,
    MedicineCreate, MedicineUpdate, MedicineResponse,
    BatchCreate, BatchResponse,
    PurchaseOrderCreate, PurchaseOrderResponse, PurchaseOrderItemResponse,
    ReceivePORequest
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
        reorder_threshold=data.reorder_threshold,
        barcode=data.barcode.strip() if data.barcode else None
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
        barcode=medicine.barcode,
        total_stock=0,
        earliest_expiry=None,
        batches=[],
        created_at=medicine.created_at
    )

@router.get("/medicines", response_model=List[MedicineResponse])
async def list_medicines(
    q: Optional[str] = Query(None, description="Search by brand, generic name, or barcode"),
    low_stock_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Medicine)
        .options(selectinload(Medicine.batches).selectinload(Batch.supplier))
        .where(Medicine.business_id == current_user.business_id)
    )
    
    # Search: brand_name OR generic_name OR Medicine.barcode OR Batch.barcode
    if q and q.strip():
        search_term = f"%{q.strip()}%"
        exact_q = q.strip()
        stmt = stmt.where(
            or_(
                Medicine.brand_name.ilike(search_term),
                Medicine.generic_name.ilike(search_term),
                Medicine.barcode == exact_q,
                Medicine.batches.any(Batch.barcode == exact_q)
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

@router.delete("/medicines/clear-all", response_model=dict)
async def clear_all_medicines(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    med_res = await db.execute(select(Medicine.id).where(Medicine.business_id == current_user.business_id))
    med_ids = med_res.scalars().all()
    
    if not med_ids:
        return {"deleted_count": 0, "message": "No medicines found to clear."}
        
    await db.execute(delete(SaleItem).where(SaleItem.medicine_id.in_(med_ids)))
    await db.execute(delete(PurchaseOrderItem).where(PurchaseOrderItem.medicine_id.in_(med_ids)))
    
    batch_res = await db.execute(select(Batch.id).where(Batch.business_id == current_user.business_id))
    batch_ids = batch_res.scalars().all()
    if batch_ids:
        await db.execute(delete(StockMovement).where(StockMovement.batch_id.in_(batch_ids)))
    
    await db.execute(delete(Batch).where(Batch.business_id == current_user.business_id))
    result = await db.execute(delete(Medicine).where(Medicine.business_id == current_user.business_id))
    
    await db.commit()
    return {"deleted_count": result.rowcount, "message": f"Successfully deleted all {result.rowcount} medicines and associated inventory."}

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
            
        category = (row.get("category") or "tablet").strip().lower()
        req_rx = str(row.get("requires_prescription", "")).strip().lower() in ["true", "1", "yes"]
        unit_type = (row.get("unit_type") or "strip").strip().lower()
        
        try:
            p_price_raw = row.get("purchase_price")
            purchase_price = float(p_price_raw) if p_price_raw is not None and str(p_price_raw).strip() != "" else 0.0

            s_price_raw = row.get("sale_price")
            sale_price = float(s_price_raw) if s_price_raw is not None and str(s_price_raw).strip() != "" else 0.0

            reorder_raw = row.get("reorder_threshold")
            reorder_threshold = int(reorder_raw) if reorder_raw is not None and str(reorder_raw).strip() != "" else 10
        except ValueError:
            errors.append(f"Row {row_idx}: Invalid numeric pricing data")
            continue
            
        med = Medicine(
            business_id=current_user.business_id,
            brand_name=brand_name,
            generic_name=generic_name,
            manufacturer=(row.get("manufacturer") or "").strip() or None,
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
        purchase_price=data.purchase_price,
        barcode=data.barcode.strip() if data.barcode else f"B-{data.batch_number.strip()}"
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

# --- PURCHASE ORDERS (PROCUREMENT) ---
@router.post("/purchase-orders", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_purchase_order(
    data: PurchaseOrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    sup_res = await db.execute(select(Supplier).where(Supplier.id == data.supplier_id, Supplier.business_id == current_user.business_id))
    supplier = sup_res.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    total_cost = sum(item.quantity * item.cost_price for item in data.items)

    po = PurchaseOrder(
        business_id=current_user.business_id,
        supplier_id=data.supplier_id,
        status="submitted",
        total_cost=total_cost
    )
    db.add(po)
    await db.flush()

    for item in data.items:
        po_item = PurchaseOrderItem(
            purchase_order_id=po.id,
            medicine_id=item.medicine_id,
            quantity=item.quantity,
            cost_price=item.cost_price
        )
        db.add(po_item)

    await db.commit()
    await db.refresh(po)
    return await get_purchase_order(po.id, current_user, db)

@router.get("/purchase-orders", response_model=List[PurchaseOrderResponse])
async def list_purchase_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items))
        .where(PurchaseOrder.business_id == current_user.business_id)
        .order_by(PurchaseOrder.created_at.desc())
    )
    res = await db.execute(stmt)
    pos = res.scalars().all()

    response_list = []
    for po in pos:
        sup_res = await db.execute(select(Supplier).where(Supplier.id == po.supplier_id))
        sup = sup_res.scalar_one_or_none()
        
        items_resp = []
        for item in po.items:
            med_res = await db.execute(select(Medicine).where(Medicine.id == item.medicine_id))
            med = med_res.scalar_one_or_none()
            items_resp.append(PurchaseOrderItemResponse(
                id=item.id,
                medicine_id=item.medicine_id,
                medicine_name=med.brand_name if med else "Medicine",
                quantity=item.quantity,
                cost_price=item.cost_price
            ))

        response_list.append(PurchaseOrderResponse(
            id=po.id,
            business_id=po.business_id,
            supplier_id=po.supplier_id,
            supplier_name=sup.name if sup else "Supplier",
            status=po.status,
            total_cost=po.total_cost,
            items=items_resp,
            created_at=po.created_at
        ))
    return response_list

@router.get("/purchase-orders/{po_id}", response_model=PurchaseOrderResponse)
async def get_purchase_order(
    po_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items))
        .where(PurchaseOrder.id == po_id, PurchaseOrder.business_id == current_user.business_id)
    )
    res = await db.execute(stmt)
    po = res.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")

    sup_res = await db.execute(select(Supplier).where(Supplier.id == po.supplier_id))
    sup = sup_res.scalar_one_or_none()

    items_resp = []
    for item in po.items:
        med_res = await db.execute(select(Medicine).where(Medicine.id == item.medicine_id))
        med = med_res.scalar_one_or_none()
        items_resp.append(PurchaseOrderItemResponse(
            id=item.id,
            medicine_id=item.medicine_id,
            medicine_name=med.brand_name if med else "Medicine",
            quantity=item.quantity,
            cost_price=item.cost_price
        ))

    return PurchaseOrderResponse(
        id=po.id,
        business_id=po.business_id,
        supplier_id=po.supplier_id,
        supplier_name=sup.name if sup else "Supplier",
        status=po.status,
        total_cost=po.total_cost,
        items=items_resp,
        created_at=po.created_at
    )

@router.post("/purchase-orders/{po_id}/receive", response_model=PurchaseOrderResponse)
async def receive_purchase_order(
    po_id: int,
    data: ReceivePORequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    po_res = await db.execute(
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items))
        .where(PurchaseOrder.id == po_id, PurchaseOrder.business_id == current_user.business_id)
    )
    po = po_res.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")

    if po.status == "received":
        raise HTTPException(status_code=400, detail="Purchase Order has already been received into inventory stock.")

    for rec in data.received_items:
        po_item = next((i for i in po.items if i.id == rec.item_id), None)
        if not po_item:
            continue

        batch = Batch(
            business_id=current_user.business_id,
            medicine_id=po_item.medicine_id,
            batch_number=rec.batch_number.strip(),
            expiry_date=rec.expiry_date,
            quantity_in_stock=rec.received_qty,
            received_date=date.today(),
            supplier_id=po.supplier_id,
            purchase_price=po_item.cost_price,
            barcode=f"B-{rec.batch_number.strip()}"
        )
        db.add(batch)
        await db.flush()

        movement = StockMovement(
            business_id=current_user.business_id,
            batch_id=batch.id,
            type="in",
            quantity=rec.received_qty,
            reason=f"Received PO #{po.id}",
            staff_id=current_user.id
        )
        db.add(movement)

    po.status = "received"
    await db.commit()
    return await get_purchase_order(po.id, current_user, db)
