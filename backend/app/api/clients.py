from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
import uuid

from app.database import get_db
from app.models.user import User
from app.models.client import Client
from app.models.scan import Scan, ScanStatus
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/clients", tags=["Mandanten"])


async def get_client_or_404(client_id: uuid.UUID, user: User, db: AsyncSession) -> Client:
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Mandant nicht gefunden")

    # Access control
    if not user.is_deudat and client.organization_id != user.organization_id:
        raise HTTPException(status_code=403, detail="Kein Zugriff")

    return client


@router.get("", response_model=List[ClientResponse])
async def list_clients(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Client)

    if user.is_deudat:
        # Deudat sieht alle Mandanten seiner Org oder alle wenn SuperAdmin
        from app.models.user import UserRole
        if user.role == UserRole.SUPER_ADMIN:
            pass  # Alle
        else:
            query = query.where(Client.organization_id == user.organization_id)
    else:
        query = query.where(Client.organization_id == user.organization_id)

    result = await db.execute(query.order_by(Client.name))
    clients = result.scalars().all()

    # Enrich with scan data
    responses = []
    for client in clients:
        scan_result = await db.execute(
            select(func.count(Scan.id)).where(Scan.client_id == client.id)
        )
        scan_count = scan_result.scalar() or 0

        last_scan_result = await db.execute(
            select(Scan)
            .where(Scan.client_id == client.id, Scan.status == ScanStatus.COMPLETED)
            .order_by(Scan.completed_at.desc())
            .limit(1)
        )
        last_scan = last_scan_result.scalar_one_or_none()

        r = ClientResponse.model_validate(client)
        r.scan_count = scan_count
        r.last_scan_date = last_scan.completed_at if last_scan else None
        r.last_scan_score = last_scan.overall_score if last_scan else None
        responses.append(r)

    return responses


@router.post("", response_model=ClientResponse, status_code=201)
async def create_client(
    data: ClientCreate,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    client = Client(
        **data.model_dump(),
        organization_id=user.organization_id,
    )
    db.add(client)
    await db.commit()
    await db.refresh(client)
    r = ClientResponse.model_validate(client)
    r.scan_count = 0
    return r


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: uuid.UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return ClientResponse.model_validate(
        await get_client_or_404(client_id, user, db)
    )


@router.patch("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: uuid.UUID,
    data: ClientUpdate,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    client = await get_client_or_404(client_id, user, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(client, field, value)
    await db.commit()
    await db.refresh(client)
    return ClientResponse.model_validate(client)


@router.delete("/{client_id}", status_code=204)
async def delete_client(
    client_id: uuid.UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    client = await get_client_or_404(client_id, user, db)
    await db.delete(client)
    await db.commit()
