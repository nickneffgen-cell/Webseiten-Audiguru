from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import uuid
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.scan import Scan, ScanStatus, ScanFinding
from app.models.organization import Organization
from app.schemas.scan import ScanCreate, ScanResponse, ScanListResponse, FindingUpdate
from app.api.deps import get_current_active_user
from app.scanner.orchestrator import run_scan_task

router = APIRouter(prefix="/scans", tags=["Scans"])


@router.get("", response_model=List[ScanListResponse])
async def list_scans(
    client_id: Optional[uuid.UUID] = None,
    status: Optional[ScanStatus] = None,
    limit: int = 20,
    offset: int = 0,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Scan)

    if user.is_deudat:
        from app.models.user import UserRole
        if user.role != UserRole.SUPER_ADMIN:
            query = query.where(Scan.organization_id == user.organization_id)
    else:
        query = query.where(Scan.organization_id == user.organization_id)

    if client_id:
        query = query.where(Scan.client_id == client_id)
    if status:
        query = query.where(Scan.status == status)

    query = query.order_by(Scan.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=ScanResponse, status_code=201)
async def create_scan(
    data: ScanCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    # Check scan quota
    org_result = await db.execute(select(Organization).where(Organization.id == user.organization_id))
    org = org_result.scalar_one_or_none()

    if org and not org.is_deudat and not org.can_scan:
        raise HTTPException(
            status_code=402,
            detail=f"Scan-Limit erreicht. Verbleibend: {org.remaining_scans}. Bitte upgraden Sie Ihren Plan."
        )

    scan = Scan(
        target_url=data.target_url,
        client_id=data.client_id,
        organization_id=user.organization_id,
        created_by=user.id,
        scan_name=data.scan_name or data.target_url,
        scan_config=data.scan_config.model_dump(),
        status=ScanStatus.PENDING,
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)

    # Increment scan counter
    if org and not org.is_deudat:
        org.scans_used_this_month += 1
        await db.commit()

    # Start background scan
    background_tasks.add_task(run_scan_task, str(scan.id))

    return scan


@router.get("/{scan_id}", response_model=ScanResponse)
async def get_scan(
    scan_id: uuid.UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Scan).where(Scan.id == scan_id)
    )
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan nicht gefunden")

    # Access control
    if not user.is_deudat and scan.organization_id != user.organization_id:
        raise HTTPException(status_code=403, detail="Kein Zugriff")

    # Load findings
    findings_result = await db.execute(
        select(ScanFinding).where(ScanFinding.scan_id == scan_id)
    )
    scan.findings = findings_result.scalars().all()
    return scan


@router.patch("/{scan_id}/findings/{finding_id}", response_model=dict)
async def update_finding(
    scan_id: uuid.UUID,
    finding_id: uuid.UUID,
    data: FindingUpdate,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Einzelnen Fund im Bericht ein-/ausblenden"""
    result = await db.execute(
        select(ScanFinding).where(ScanFinding.id == finding_id, ScanFinding.scan_id == scan_id)
    )
    finding = result.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Befund nicht gefunden")

    finding.is_included_in_report = data.is_included_in_report
    await db.commit()
    return {"message": "Befund aktualisiert"}


@router.delete("/{scan_id}", status_code=204)
async def delete_scan(
    scan_id: uuid.UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan nicht gefunden")

    if not user.is_deudat and scan.organization_id != user.organization_id:
        raise HTTPException(status_code=403, detail="Kein Zugriff")

    await db.delete(scan)
    await db.commit()
