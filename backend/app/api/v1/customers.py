from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.customer import Customer, CustomerTransaction
from app.schemas.customer import (
    CustomerCreate,
    CustomerResponse,
    CustomerPayment,
    CustomerUdharCreate,
    CustomerLedgerResponse,
    CustomerTransactionResponse
)

router = APIRouter()

@router.get("", response_model=List[CustomerResponse])
async def list_customers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all customer credit accounts for the pharmacy tenant with outstanding balance metrics.
    """
    stmt = (
        select(Customer)
        .where(Customer.business_id == current_user.business_id)
        .order_by(Customer.current_balance.desc(), Customer.name.asc())
    )
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    data: CustomerCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new customer credit account with credit limit in PKR.
    """
    # Check if phone number already registered for this business
    stmt = select(Customer).where(
        Customer.business_id == current_user.business_id,
        Customer.phone == data.phone.strip()
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A customer with this phone number already exists in your credit ledger."
        )

    customer = Customer(
        business_id=current_user.business_id,
        name=data.name.strip(),
        phone=data.phone.strip(),
        cnic=data.cnic.strip() if data.cnic else None,
        address=data.address.strip() if data.address else None,
        credit_limit=data.credit_limit,
        current_balance=0.0
    )
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    return customer

@router.get("/{customer_id}/ledger", response_model=CustomerLedgerResponse)
async def get_customer_ledger(
    customer_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetch complete credit transaction ledger and balance history for a customer.
    """
    stmt = (
        select(Customer)
        .options(selectinload(Customer.transactions))
        .where(
            Customer.id == customer_id,
            Customer.business_id == current_user.business_id
        )
    )
    customer = (await db.execute(stmt)).scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer credit account not found.")

    return customer

@router.post("/{customer_id}/payments", response_model=CustomerTransactionResponse)
async def record_customer_payment(
    customer_id: int,
    payment: CustomerPayment,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Record a cash recovery payment from customer to reduce outstanding Khata balance.
    """
    stmt = select(Customer).where(
        Customer.id == customer_id,
        Customer.business_id == current_user.business_id
    )
    customer = (await db.execute(stmt)).scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer credit account not found.")

    if payment.amount > customer.current_balance:
        raise HTTPException(
            status_code=400,
            detail=f"Payment amount (Rs. {payment.amount}) exceeds current balance (Rs. {customer.current_balance})."
        )

    new_balance = round(customer.current_balance - payment.amount, 2)
    customer.current_balance = new_balance

    trans = CustomerTransaction(
        business_id=current_user.business_id,
        customer_id=customer.id,
        sale_id=None,
        transaction_type="payment_received",
        amount=payment.amount,
        balance_after=new_balance,
        notes=payment.notes or "Cash Recovery Payment"
    )
    db.add(trans)
    await db.commit()
    await db.refresh(trans)
    return trans

@router.post("/{customer_id}/udhar", response_model=CustomerTransactionResponse)
async def record_customer_udhar(
    customer_id: int,
    data: CustomerUdharCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Manually add an Udhar (credit debit entry) against a customer's credit account.
    """
    stmt = select(Customer).where(
        Customer.id == customer_id,
        Customer.business_id == current_user.business_id
    )
    customer = (await db.execute(stmt)).scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer credit account not found.")

    new_balance = round(customer.current_balance + data.amount, 2)
    if new_balance > customer.credit_limit:
        raise HTTPException(
            status_code=400,
            detail=f"This transaction of Rs. {data.amount} exceeds customer's remaining credit capacity! Credit limit is Rs. {customer.credit_limit}."
        )

    customer.current_balance = new_balance

    trans = CustomerTransaction(
        business_id=current_user.business_id,
        customer_id=customer.id,
        sale_id=None,
        transaction_type="credit_sale",
        amount=data.amount,
        balance_after=new_balance,
        notes=data.notes or "Manual Udhar / Credit Entry"
    )
    db.add(trans)
    await db.commit()
    await db.refresh(trans)
    return trans
