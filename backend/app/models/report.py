import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, DateTime, ForeignKey, Text, JSON, Integer, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class ReportFormat(str, Enum):
    PDF = "pdf"
    DOCX = "docx"


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )

    format: Mapped[ReportFormat] = mapped_column(SAEnum(ReportFormat), nullable=False)
    language: Mapped[str] = mapped_column(String(5), default="de")
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Bericht-Konfiguration (welche Blöcke enthalten sind)
    report_config: Mapped[dict] = mapped_column(JSON, default=dict)

    # Download tracking
    download_count: Mapped[int] = mapped_column(Integer, default=0)
    last_downloaded: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    scan: Mapped["Scan"] = relationship("Scan", back_populates="reports")
