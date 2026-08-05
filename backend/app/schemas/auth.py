from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict

# Auth & Business Schemas
class BusinessOnboard(BaseModel):
    name: str
    license_number: str
    address: Optional[str] = None
    contact: Optional[str] = None
    owner_full_name: str
    owner_email: EmailStr
    owner_password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    business_id: int
    full_name: str
    email: str
    role: str

    model_config = ConfigDict(from_attributes=True)

class BusinessResponse(BaseModel):
    id: int
    name: str
    license_number: str
    address: Optional[str] = None
    contact: Optional[str] = None
    subscription_tier: str
    subscription_status: str
    trial_ends_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    business: BusinessResponse
