from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

# Supplier Schemas
class SupplierCreate(BaseModel):
    name: str
    contact: Optional[str] = None
    address: Optional[str] = None

class SupplierResponse(SupplierCreate):
    id: int
    business_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Batch Schemas
class BatchCreate(BaseModel):
    medicine_id: int
    batch_number: str
    expiry_date: date
    quantity_in_stock: int = Field(gt=0, description="Initial stock quantity")
    supplier_id: Optional[int] = None
    purchase_price: float = 0.0

class BatchResponse(BaseModel):
    id: int
    business_id: int
    medicine_id: int
    batch_number: str
    expiry_date: date
    quantity_in_stock: int
    received_date: date
    supplier_id: Optional[int] = None
    purchase_price: float = 0.0
    supplier_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# Medicine Schemas
class MedicineCreate(BaseModel):
    brand_name: str
    generic_name: str
    manufacturer: Optional[str] = None
    category: str = "tablet"
    requires_prescription: bool = False
    unit_type: str = "strip"
    purchase_price: float = 0.0
    sale_price: float = 0.0
    reorder_threshold: int = 10

class MedicineUpdate(BaseModel):
    brand_name: Optional[str] = None
    generic_name: Optional[str] = None
    manufacturer: Optional[str] = None
    category: Optional[str] = None
    requires_prescription: Optional[bool] = None
    unit_type: Optional[str] = None
    purchase_price: Optional[float] = None
    sale_price: Optional[float] = None
    reorder_threshold: Optional[int] = None

class MedicineResponse(MedicineCreate):
    id: int
    business_id: int
    total_stock: int = 0
    earliest_expiry: Optional[date] = None
    batches: List[BatchResponse] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
