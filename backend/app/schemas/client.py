from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid


class ClientCreate(BaseModel):
    name: str
    website_url: str
    contact_person: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    notes: Optional[str] = None
    company_country: str = "DE"
    company_industry: Optional[str] = None
    assigned_user_id: Optional[uuid.UUID] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    website_url: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    notes: Optional[str] = None
    company_country: Optional[str] = None
    company_industry: Optional[str] = None
    assigned_user_id: Optional[uuid.UUID] = None


class ClientResponse(BaseModel):
    id: uuid.UUID
    name: str
    website_url: str
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    notes: Optional[str] = None
    company_country: str
    company_industry: Optional[str] = None
    organization_id: uuid.UUID
    assigned_user_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    scan_count: Optional[int] = 0
    last_scan_date: Optional[datetime] = None
    last_scan_score: Optional[float] = None

    model_config = {"from_attributes": True}
