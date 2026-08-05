from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.db import get_db
from app.core.security import get_password_hash
from app.core.deps import get_current_user, require_roles
from app.models.user import User
from app.schemas.auth import UserResponse

router = APIRouter()

class StaffCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str # 'owner_pharmacist' or 'counter_staff'

@router.get("/staff", response_model=List[UserResponse])
async def list_staff(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Isolated by business_id
    result = await db.execute(select(User).where(User.business_id == current_user.business_id))
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]

@router.post("/staff", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_staff(
    data: StaffCreate,
    current_user: User = Depends(require_roles(["owner_pharmacist"])),
    db: AsyncSession = Depends(get_db)
):
    # Check email uniqueness
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User with this email already exists")
        
    if data.role not in ["owner_pharmacist", "counter_staff"]:
        raise HTTPException(status_code=400, detail="Invalid role specified")
        
    new_staff = User(
        business_id=current_user.business_id,
        full_name=data.full_name,
        email=data.email,
        password_hash=get_password_hash(data.password),
        role=data.role
    )
    db.add(new_staff)
    await db.commit()
    await db.refresh(new_staff)
    return UserResponse.model_validate(new_staff)
