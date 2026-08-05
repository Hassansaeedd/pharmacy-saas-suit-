from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class POSCartItem(BaseModel):
    medicine_id: int
    batch_id: Optional[int] = None # Optional: system FEFO auto-selects if None
    quantity: int = Field(gt=0)
    unit_price: float

class SaleCreate(BaseModel):
    items: List[POSCartItem]
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    payment_method: str = "cash" # cash, card, mobile_wallet
    prescription_verified: bool = False
    verification_note: Optional[str] = None

class SaleItemResponse(BaseModel):
    id: int
    medicine_id: int
    medicine_name: Optional[str] = None
    batch_id: int
    batch_number: Optional[str] = None
    quantity: int
    unit_price: float
    subtotal: float

    model_config = ConfigDict(from_attributes=True)

class SaleResponse(BaseModel):
    id: int
    business_id: int
    staff_id: int
    staff_name: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    total_amount: float
    payment_method: str
    prescription_verified: bool
    created_at: datetime
    items: List[SaleItemResponse] = []

    model_config = ConfigDict(from_attributes=True)
