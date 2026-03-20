import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, DateTime, ForeignKey, Text, JSON, Integer, Float, Boolean, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class ScanStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class FindingSeverity(str, Enum):
    CRITICAL = "critical"   # Schwerwiegend - sofortiger Handlungsbedarf
    HIGH = "high"           # Hoch - baldiger Handlungsbedarf
    MEDIUM = "medium"       # Mittel - Handlungsbedarf
    LOW = "low"             # Niedrig - Empfehlung
    INFO = "info"           # Information


class ScanFinding(Base):
    __tablename__ = "scan_findings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False
    )

    category: Mapped[str] = mapped_column(String(100), nullable=False)  # z.B. "cookies", "privacy_policy"
    check_id: Mapped[str] = mapped_column(String(100), nullable=False)   # z.B. "GDPR_ART13_001"
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[FindingSeverity] = mapped_column(SAEnum(FindingSeverity), nullable=False)
    law_reference: Mapped[str | None] = mapped_column(String(200), nullable=True)  # z.B. "Art. 13 DSGVO"
    recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    affected_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    evidence: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # Screenshots, Code-Snippets
    is_included_in_report: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationship
    scan: Mapped["Scan"] = relationship("Scan", back_populates="findings")


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Target
    target_url: Mapped[str] = mapped_column(String(500), nullable=False)
    scan_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Status & Progress
    status: Mapped[ScanStatus] = mapped_column(SAEnum(ScanStatus), default=ScanStatus.PENDING)
    progress: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Scan Configuration (was geprüft werden soll)
    scan_config: Mapped[dict] = mapped_column(JSON, default=dict)

    # Results
    pages_scanned: Mapped[int] = mapped_column(Integer, default=0)
    cookies_found: Mapped[int] = mapped_column(Integer, default=0)
    trackers_found: Mapped[int] = mapped_column(Integer, default=0)
    overall_score: Mapped[float | None] = mapped_column(Float, nullable=True)  # 0-100
    score_breakdown: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Raw scan data
    raw_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ai_analysis: Mapped[str | None] = mapped_column(Text, nullable=True)  # Claude-Analyse
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    client: Mapped["Client"] = relationship("Client", back_populates="scans")
    created_by_user: Mapped["User"] = relationship("User", back_populates="scans")
    findings: Mapped[list["ScanFinding"]] = relationship("ScanFinding", back_populates="scan", cascade="all, delete-orphan")
    reports: Mapped[list["Report"]] = relationship("Report", back_populates="scan", cascade="all, delete-orphan")

    @property
    def duration_seconds(self) -> int | None:
        if self.started_at and self.completed_at:
            return int((self.completed_at - self.started_at).total_seconds())
        return None

    @property
    def findings_by_severity(self) -> dict:
        counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
        for f in self.findings:
            counts[f.severity.value] += 1
        return counts
