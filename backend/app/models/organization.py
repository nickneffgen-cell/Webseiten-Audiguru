import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, Integer, Boolean, DateTime, JSON, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class SubscriptionPlan(str, Enum):
    FREE = "free"                   # Deudat intern - unbegrenzt
    STARTER = "starter"             # 5 Scans/Monat
    PROFESSIONAL = "professional"   # 50 Scans/Monat
    ENTERPRISE = "enterprise"       # Unbegrenzt


PLAN_SCAN_LIMITS = {
    SubscriptionPlan.FREE: -1,           # Unbegrenzt
    SubscriptionPlan.STARTER: 5,
    SubscriptionPlan.PROFESSIONAL: 50,
    SubscriptionPlan.ENTERPRISE: -1,     # Unbegrenzt
}

PLAN_PRICES_MONTHLY = {
    SubscriptionPlan.FREE: 0,
    SubscriptionPlan.STARTER: 29,
    SubscriptionPlan.PROFESSIONAL: 99,
    SubscriptionPlan.ENTERPRISE: 299,
}


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    is_deudat: Mapped[bool] = mapped_column(Boolean, default=False)  # Deudat interne Org

    # Subscription
    plan: Mapped[SubscriptionPlan] = mapped_column(
        SAEnum(SubscriptionPlan), default=SubscriptionPlan.STARTER
    )
    scans_used_this_month: Mapped[int] = mapped_column(Integer, default=0)
    billing_cycle_start: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Stripe
    stripe_customer_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    subscription_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Settings
    report_settings: Mapped[dict] = mapped_column(JSON, default=dict)  # Konfig für Berichte
    scan_settings: Mapped[dict] = mapped_column(JSON, default=dict)    # Konfig für Scans

    # Contact
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    country: Mapped[str] = mapped_column(String(10), default="DE")

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    users: Mapped[list["User"]] = relationship("User", back_populates="organization")
    clients: Mapped[list["Client"]] = relationship("Client", back_populates="organization", cascade="all, delete-orphan")

    @property
    def scan_limit(self) -> int:
        return PLAN_SCAN_LIMITS.get(self.plan, 5)

    @property
    def can_scan(self) -> bool:
        limit = self.scan_limit
        if limit == -1:
            return True
        return self.scans_used_this_month < limit

    @property
    def remaining_scans(self) -> int:
        limit = self.scan_limit
        if limit == -1:
            return 999999
        return max(0, limit - self.scans_used_this_month)
