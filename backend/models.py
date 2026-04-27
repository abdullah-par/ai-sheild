from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String(255), unique=True, index=True, nullable=False)
    username      = Column(String(100), nullable=True)
    avatar_key    = Column(String(50), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    # One-to-many relationship with Scan
    scans = relationship("Scan", back_populates="user", cascade="all, delete-orphan")


class Scan(Base):
    __tablename__ = "scans"

    id          = Column(Integer, primary_key=True, index=True)
    scan_id     = Column(String(20), unique=True, index=True)   # e.g. SC-00142
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=True)  # nullable for anonymous
    type        = Column(String(20), nullable=False)             # url | email | image
    target      = Column(String(512), nullable=False)            # URL / email address / filename
    verdict     = Column(String(30), nullable=False)             # SAFE | PHISHING | STEGO_DETECTED | SUSPICIOUS
    risk_score  = Column(Float, nullable=False)
    confidence  = Column(Float, nullable=False)
    scan_time_ms = Column(Integer, nullable=False)
    raw_result  = Column(Text, nullable=True)                    # JSON blob of full analysis
    session_id  = Column(String(64), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    # Many-to-one relationship with User
    user = relationship("User", back_populates="scans")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    time_range_start = Column(DateTime(timezone=True), nullable=False)
    time_range_end = Column(DateTime(timezone=True), nullable=False)
    total_flows = Column(Integer, default=0)
    malicious_count = Column(Integer, default=0)
    blocked_count = Column(Integer, default=0)
    top_attack_type = Column(String(100), nullable=True)
    timeline_json = Column(Text, nullable=True)
    ai_raw_content = Column(Text, nullable=True)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
