from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import uuid
import os

from app.database import get_db
from app.models.user import User
from app.models.scan import Scan, ScanFinding
from app.models.report import Report, ReportFormat
from app.api.deps import get_current_active_user
from app.reports.generator import generate_report

router = APIRouter(prefix="/reports", tags=["Berichte"])


@router.post("/generate/{scan_id}", status_code=201)
async def generate_report_endpoint(
    scan_id: uuid.UUID,
    format: ReportFormat = ReportFormat.PDF,
    language: str = "de",
    background_tasks: BackgroundTasks = None,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    # Get scan
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan nicht gefunden")

    if scan.status != "completed":
        raise HTTPException(status_code=400, detail="Scan noch nicht abgeschlossen")

    if not user.is_deudat and scan.organization_id != user.organization_id:
        raise HTTPException(status_code=403, detail="Kein Zugriff")

    # Load findings
    findings_result = await db.execute(
        select(ScanFinding).where(ScanFinding.scan_id == scan_id, ScanFinding.is_included_in_report == True)
    )
    scan.findings = findings_result.scalars().all()

    # Generate report
    try:
        file_path = await generate_report(scan, format, language)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler beim Erstellen des Berichts: {str(e)}")

    # Save report record
    file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
    report = Report(
        scan_id=scan.id,
        organization_id=scan.organization_id,
        format=format,
        language=language,
        file_path=file_path,
        file_size_bytes=file_size,
        report_config=scan.scan_config,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    return {
        "report_id": str(report.id),
        "format": format,
        "download_url": f"/api/reports/{report.id}/download",
    }


@router.get("/{report_id}/download")
async def download_report(
    report_id: uuid.UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Bericht nicht gefunden")

    if not user.is_deudat and report.organization_id != user.organization_id:
        raise HTTPException(status_code=403, detail="Kein Zugriff")

    if not report.file_path or not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Berichtsdatei nicht gefunden")

    # Update download count
    report.download_count += 1
    report.last_downloaded = datetime.utcnow()
    await db.commit()

    ext = "pdf" if report.format == ReportFormat.PDF else "docx"
    media_type = "application/pdf" if report.format == ReportFormat.PDF else \
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    return FileResponse(
        path=report.file_path,
        media_type=media_type,
        filename=f"DSGVO-Bericht-{report.id}.{ext}",
    )


@router.get("/scan/{scan_id}", response_model=list)
async def list_scan_reports(
    scan_id: uuid.UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report).where(Report.scan_id == scan_id).order_by(Report.created_at.desc())
    )
    reports = result.scalars().all()
    return [
        {
            "id": str(r.id),
            "format": r.format,
            "language": r.language,
            "created_at": r.created_at,
            "file_size_bytes": r.file_size_bytes,
            "download_count": r.download_count,
            "download_url": f"/api/reports/{r.id}/download",
        }
        for r in reports
    ]
