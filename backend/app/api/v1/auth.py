from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.db import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.business import Business
from app.models.user import User
from app.schemas.auth import BusinessOnboard, UserLogin, Token, UserResponse, BusinessResponse

router = APIRouter()

@router.post("/onboard", response_model=Token, status_code=status.HTTP_201_CREATED)
async def onboard_pharmacy(
    data: BusinessOnboard,
    db: AsyncSession = Depends(get_db)
):
    # Check if user email already exists
    existing_user = await db.execute(select(User).where(User.email == data.owner_email))
    if existing_user.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )
        
    # Create Business Tenant
    new_business = Business(
        name=data.name,
        license_number=data.license_number,
        address=data.address,
        contact=data.contact,
        subscription_tier="basic",
        subscription_status="trial"
    )
    db.add(new_business)
    await db.flush() # Populate new_business.id
    
    # Create Owner / Pharmacist User
    hashed_pwd = get_password_hash(data.owner_password)
    owner_user = User(
        business_id=new_business.id,
        full_name=data.owner_full_name,
        email=data.owner_email,
        password_hash=hashed_pwd,
        role="owner_pharmacist" # First user is Owner/Pharmacist
    )
    db.add(owner_user)
    await db.commit()
    await db.refresh(new_business)
    await db.refresh(owner_user)
    
    # Auto-seed 100 essential Pakistani medicines & initial stock batches
    from app.core.seed_data import seed_pharmacy_catalog
    await seed_pharmacy_catalog(db, new_business.id)
    
    # Generate JWT Token
    token_data = {"sub": str(owner_user.id), "business_id": new_business.id, "role": owner_user.role}
    token = create_access_token(data=token_data)
    
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(owner_user),
        business=BusinessResponse.model_validate(new_business)
    )

@router.post("/login", response_model=Token)
async def login(
    data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
        
    # Fetch business
    biz_result = await db.execute(select(Business).where(Business.id == user.business_id))
    business = biz_result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found for user")
        
    token_data = {"sub": str(user.id), "business_id": business.id, "role": user.role}
    token = create_access_token(data=token_data)
    
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
        business=BusinessResponse.model_validate(business)
    )

from app.core.deps import get_current_user, get_current_business

@router.get("/me", response_model=dict)
async def get_me(
    current_user: User = Depends(get_current_user),
    business: Business = Depends(get_current_business)
):
    return {
        "user": UserResponse.model_validate(current_user),
        "business": BusinessResponse.model_validate(business)
    }
