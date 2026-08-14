from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class CustomerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    phone: str = Field(..., min_length=5, max_length=50)
    cnic: Optional[str] = None
    address: Optional[str] = None
    credit_limit: float = Field(25000.0, ge=0.0)

class CustomerCreate(CustomerBase):
    pass

class CustomerPayment(BaseModel):
    amount: float = Field(..., gt=0.0)
    notes: Optional[str] = None

class CustomerUdharCreate(BaseModel):
    amount: float = Field(..., gt=0.0)
    notes: Optional[str] = None

class CustomerTransactionResponse(BaseModel):
    id: int
    business_id: int
    customer_id: int
    sale_id: Optional[int] = None
    transaction_type: str
    amount: float
    balance_after: float
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CustomerResponse(CustomerBase):
    id: int
    business_id: int
    current_balance: float
    created_at: datetime

    class Config:
        from_attributes = True

class CustomerLedgerResponse(CustomerResponse):
    transactions: List[CustomerTransactionResponse] = []
