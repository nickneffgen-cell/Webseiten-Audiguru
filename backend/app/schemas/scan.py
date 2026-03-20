from pydantic import BaseModel, HttpUrl, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
from app.models.scan import ScanStatus, FindingSeverity


class ScanConfig(BaseModel):
    """Konfiguration für einen Scan - was geprüft werden soll"""
    max_pages: int = 50
    max_depth: int = 3

    # Prüfkategorien
    check_cookies: bool = True
    check_privacy_policy: bool = True
    check_imprint: bool = True
    check_ssl: bool = True
    check_trackers: bool = True
    check_consent_management: bool = True
    check_google_fonts: bool = True
    check_external_scripts: bool = True
    check_contact_forms: bool = True
    check_newsletter: bool = True
    check_social_media: bool = True
    check_accessibility: bool = False

    # Strenge
    strictness: str = "standard"  # "lenient", "standard", "strict"

    # Sprache des Berichts
    report_language: str = "de"

    # Report-Blöcke (was im Bericht erscheint)
    report_blocks: List[str] = [
        "executive_summary",
        "score_overview",
        "cookie_analysis",
        "privacy_policy_analysis",
        "tracker_analysis",
        "consent_management",
        "legal_requirements",
        "recommendations",
        "technical_details",
        "appendix",
    ]


class ScanCreate(BaseModel):
    target_url: str
    client_id: Optional[uuid.UUID] = None
    scan_name: Optional[str] = None
    scan_config: ScanConfig = ScanConfig()

    @field_validator("target_url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            v = "https://" + v
        return v


class ScanFindingResponse(BaseModel):
    id: uuid.UUID
    category: str
    check_id: str
    title: str
    description: str
    severity: FindingSeverity
    law_reference: Optional[str] = None
    recommendation: Optional[str] = None
    affected_url: Optional[str] = None
    evidence: Optional[Dict[str, Any]] = None
    is_included_in_report: bool

    model_config = {"from_attributes": True}


class ScanResponse(BaseModel):
    id: uuid.UUID
    target_url: str
    scan_name: Optional[str] = None
    status: ScanStatus
    progress: int
    pages_scanned: int
    cookies_found: int
    trackers_found: int
    overall_score: Optional[float] = None
    score_breakdown: Optional[Dict[str, Any]] = None
    ai_analysis: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    findings: List[ScanFindingResponse] = []
    client_id: Optional[uuid.UUID] = None

    model_config = {"from_attributes": True}


class ScanListResponse(BaseModel):
    id: uuid.UUID
    target_url: str
    scan_name: Optional[str] = None
    status: ScanStatus
    progress: int
    overall_score: Optional[float] = None
    pages_scanned: int
    cookies_found: int
    trackers_found: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    client_id: Optional[uuid.UUID] = None

    model_config = {"from_attributes": True}


class FindingUpdate(BaseModel):
    is_included_in_report: bool
