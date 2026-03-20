from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization, SubscriptionPlan
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, verify_token
from app.schemas.user import LoginRequest, TokenResponse, UserCreate, UserResponse, PasswordChange
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/auth", tags=["Authentifizierung"])


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falsche E-Mail-Adresse oder Passwort",
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account ist deaktiviert")

    # Update last login
    user.last_login = datetime.utcnow()
    await db.commit()
    await db.refresh(user)

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        user=UserResponse.model_validate(user),
    )


@router.post("/register", response_model=TokenResponse)
async def register(request: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    result = await db.execute(select(User).where(User.email == request.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="E-Mail-Adresse bereits registriert")

    # Create default SaaS organization for new user
    org = Organization(
        name=f"{request.first_name} {request.last_name}",
        slug=request.email.split("@")[0].lower().replace(".", "-") + "-org",
        plan=SubscriptionPlan.STARTER,
    )
    db.add(org)
    await db.flush()

    user = User(
        email=request.email,
        hashed_password=get_password_hash(request.password),
        first_name=request.first_name,
        last_name=request.last_name,
        role=request.role,
        organization_id=org.id,
        preferred_language=request.preferred_language,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str, db: AsyncSession = Depends(get_db)):
    import uuid as uuid_lib
    user_id = verify_token(refresh_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Ungültiger Refresh-Token")

    result = await db.execute(select(User).where(User.id == uuid_lib.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Nutzer nicht gefunden")

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_active_user)):
    return UserResponse.model_validate(user)


@router.post("/change-password")
async def change_password(
    request: PasswordChange,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(request.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Aktuelles Passwort ist falsch")

    user.hashed_password = get_password_hash(request.new_password)
    await db.commit()
    return {"message": "Passwort erfolgreich geändert"}
