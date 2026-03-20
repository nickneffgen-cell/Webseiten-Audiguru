from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.database import init_db
from app.api import auth, clients, scans, reports


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    os.makedirs(settings.REPORTS_DIR, exist_ok=True)

    # Create default super admin if none exists
    await create_default_admin()

    yield
    # Shutdown


async def create_default_admin():
    from app.database import AsyncSessionLocal
    from app.models.user import User, UserRole
    from app.models.organization import Organization, SubscriptionPlan
    from app.core.security import get_password_hash
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.role == UserRole.SUPER_ADMIN).limit(1))
        if result.scalar_one_or_none():
            return

        # Create Deudat internal organization
        org = Organization(
            name="Deudat GmbH",
            slug="deudat-intern",
            is_deudat=True,
            plan=SubscriptionPlan.FREE,
        )
        db.add(org)
        await db.flush()

        admin = User(
            email="admin@deudat.de",
            hashed_password=get_password_hash("DsgvoAudit2024!"),
            first_name="Admin",
            last_name="Deudat",
            role=UserRole.SUPER_ADMIN,
            is_active=True,
            is_verified=True,
            organization_id=org.id,
        )
        db.add(admin)
        await db.commit()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="DSGVO/BDSG Compliance Scanner für Webseiten",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api")
app.include_router(clients.router, prefix="/api")
app.include_router(scans.router, prefix="/api")
app.include_router(reports.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION, "app": settings.APP_NAME}


@app.get("/api/stats")
async def stats():
    from app.database import AsyncSessionLocal
    from app.models.scan import Scan, ScanStatus
    from app.models.user import User
    from app.models.client import Client
    from sqlalchemy import select, func

    async with AsyncSessionLocal() as db:
        scans_total = (await db.execute(select(func.count(Scan.id)))).scalar()
        scans_completed = (await db.execute(select(func.count(Scan.id)).where(Scan.status == ScanStatus.COMPLETED))).scalar()
        users_total = (await db.execute(select(func.count(User.id)))).scalar()
        clients_total = (await db.execute(select(func.count(Client.id)))).scalar()

    return {
        "scans_total": scans_total,
        "scans_completed": scans_completed,
        "users_total": users_total,
        "clients_total": clients_total,
    }
