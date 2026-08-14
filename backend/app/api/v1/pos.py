from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.deps import get_current_user, get_current_business
from app.models.user import User
from app.models.business import Business
from app.models.inventory import Medicine, Batch, StockMovement
from app.models.sales import Sale, SaleItem
from app.schemas.pos import SaleCreate, SaleResponse, SaleItemResponse
from app.services.fefo import select_fefo_batches
from app.services.receipt import generate_pdf_receipt

router = APIRouter()

@router.post("/sales", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
async def create_sale(
    data: SaleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not data.items:
        raise HTTPException(status_code=400, detail="Cart cannot be empty")

    business_id = current_user.business_id
    total_amount = 0.0
    processed_items = [] # (medicine, batch, quantity, unit_price, subtotal)

    # Check for prescription-required medicines
    requires_rx = False
    for item in data.items:
        med_res = await db.execute(
            select(Medicine).where(Medicine.id == item.medicine_id, Medicine.business_id == business_id)
        )
        med = med_res.scalar_one_or_none()
        if not med:
            raise HTTPException(status_code=404, detail=f"Medicine ID {item.medicine_id} not found")
        if med.requires_prescription:
            requires_rx = True

    # Server-Enforced Prescription RBAC Rule:
    # If any medicine requires prescription, sale MUST have prescription_verified=True AND
    # the user verifying/completing the sale MUST have role 'owner_pharmacist' (or verified_by a pharmacist)
    if requires_rx:
        if not data.prescription_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Prescription verification is required for prescription-only medicines in this cart!"
            )
        # Server-side RBAC check: Counter staff CANNOT bypass/self-approve prescription sales without pharmacist role!
        if current_user.role != "owner_pharmacist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Prescription approval required! Only an Owner/Pharmacist can verify and dispense prescription medicines."
            )

    # FEFO Batch Allocation & Stock Decrement
    for item in data.items:
        allocations = await select_fefo_batches(
            db=db,
            business_id=business_id,
            medicine_id=item.medicine_id,
            required_qty=item.quantity,
            manual_batch_id=item.batch_id
        )

        for batch, alloc_qty in allocations:
            subtotal = alloc_qty * item.unit_price
            total_amount += subtotal
            
            # Decrement Stock
            batch.quantity_in_stock -= alloc_qty
            
            # Record Stock Movement ('out')
            movement = StockMovement(
                business_id=business_id,
                batch_id=batch.id,
                type="out",
                quantity=alloc_qty,
                reason="POS Counter Checkout",
                staff_id=current_user.id
            )
            db.add(movement)
            
            processed_items.append((item.medicine_id, batch.id, alloc_qty, item.unit_price, subtotal))

    # Customer Khata Credit Validation
    customer = None
    if data.payment_method == "customer_credit":
        if not data.customer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A registered customer account must be selected for Customer Khata Credit payments."
            )
        from app.models.customer import Customer, CustomerTransaction
        cust_res = await db.execute(
            select(Customer).where(Customer.id == data.customer_id, Customer.business_id == business_id)
        )
        customer = cust_res.scalar_one_or_none()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer credit account not found.")

        if (customer.current_balance + total_amount) > customer.credit_limit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Credit limit exceeded! Customer balance is Rs. {customer.current_balance:.2f}, purchase is Rs. {total_amount:.2f}, max limit is Rs. {customer.credit_limit:.2f}."
            )

    # Record Sale
    new_sale = Sale(
        business_id=business_id,
        staff_id=current_user.id,
        customer_name=data.customer_name or (customer.name if customer else None),
        customer_phone=data.customer_phone or (customer.phone if customer else None),
        total_amount=total_amount,
        payment_method=data.payment_method,
        prescription_verified=data.prescription_verified,
        verified_by_staff_id=current_user.id if data.prescription_verified else None
    )
    db.add(new_sale)
    await db.flush() # Populate new_sale.id

    # If Khata Credit Sale, record CustomerTransaction & update current_balance
    if customer:
        new_bal = round(customer.current_balance + total_amount, 2)
        customer.current_balance = new_bal
        c_trans = CustomerTransaction(
            business_id=business_id,
            customer_id=customer.id,
            sale_id=new_sale.id,
            transaction_type="credit_sale",
            amount=total_amount,
            balance_after=new_bal,
            notes=f"POS Sale Invoice #{new_sale.id}"
        )
        db.add(c_trans)

    # Record Sale Items
    sale_item_responses = []
    for med_id, batch_id, qty, price, sub in processed_items:
        s_item = SaleItem(
            sale_id=new_sale.id,
            medicine_id=med_id,
            batch_id=batch_id,
            quantity=qty,
            unit_price=price,
            subtotal=sub
        )
        db.add(s_item)

    await db.commit()
    await db.refresh(new_sale)

    # Build response with medicine & batch details
    return await get_sale(new_sale.id, current_user, db)

@router.get("/sales", response_model=List[SaleResponse])
async def list_sales(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    staff_id: Optional[int] = None,
    prescription_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Sale)
        .options(selectinload(Sale.items))
        .where(Sale.business_id == current_user.business_id)
    )

    if start_date:
        stmt = stmt.where(Sale.created_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        stmt = stmt.where(Sale.created_at <= datetime.combine(end_date, datetime.max.time()))
    if staff_id:
        stmt = stmt.where(Sale.staff_id == staff_id)
    if prescription_only:
        stmt = stmt.where(Sale.prescription_verified == True)

    stmt = stmt.order_by(Sale.created_at.desc())
    result = await db.execute(stmt)
    sales = result.scalars().all()

    sale_responses = []
    for s in sales:
        item_responses = []
        for item in s.items:
            med_res = await db.execute(select(Medicine).where(Medicine.id == item.medicine_id))
            med = med_res.scalar_one_or_none()
            batch_res = await db.execute(select(Batch).where(Batch.id == item.batch_id))
            batch = batch_res.scalar_one_or_none()

            item_responses.append(SaleItemResponse(
                id=item.id,
                medicine_id=item.medicine_id,
                medicine_name=med.brand_name if med else None,
                batch_id=item.batch_id,
                batch_number=batch.batch_number if batch else None,
                quantity=item.quantity,
                unit_price=item.unit_price,
                subtotal=item.subtotal
            ))

        staff_res = await db.execute(select(User).where(User.id == s.staff_id))
        staff = staff_res.scalar_one_or_none()

        s_resp = SaleResponse.model_validate(s)
        s_resp.staff_name = staff.full_name if staff else None
        s_resp.items = item_responses
        sale_responses.append(s_resp)

    return sale_responses

@router.get("/sales/{sale_id}", response_model=SaleResponse)
async def get_sale(
    sale_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Sale)
        .options(selectinload(Sale.items))
        .where(Sale.id == sale_id, Sale.business_id == current_user.business_id)
    )
    result = await db.execute(stmt)
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Sale transaction not found")

    item_responses = []
    for item in s.items:
        med_res = await db.execute(select(Medicine).where(Medicine.id == item.medicine_id))
        med = med_res.scalar_one_or_none()
        batch_res = await db.execute(select(Batch).where(Batch.id == item.batch_id))
        batch = batch_res.scalar_one_or_none()

        item_responses.append(SaleItemResponse(
            id=item.id,
            medicine_id=item.medicine_id,
            medicine_name=med.brand_name if med else None,
            batch_id=item.batch_id,
            batch_number=batch.batch_number if batch else None,
            quantity=item.quantity,
            unit_price=item.unit_price,
            subtotal=item.subtotal
        ))

    staff_res = await db.execute(select(User).where(User.id == s.staff_id))
    staff = staff_res.scalar_one_or_none()

    s_resp = SaleResponse.model_validate(s)
    s_resp.staff_name = staff.full_name if staff else None
    s_resp.items = item_responses
    return s_resp

@router.get("/sales/{sale_id}/receipt")
async def get_sale_receipt(
    sale_id: int,
    current_user: User = Depends(get_current_user),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    sale = await get_sale(sale_id, current_user, db)
    pdf_bytes = generate_pdf_receipt(sale, business)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=Receipt-POS-{sale_id:06d}.pdf"}
    )
