from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())


class Scan(Base):
    __tablename__ = "scans"

    id          = Column(Integer, primary_key=True, index=True)
    scan_id     = Column(String(20), unique=True, index=True)   # e.g. SC-00142
    user_id     = Column(Integer, nullable=True)                 # nullable for anonymous
    type        = Column(String(20), nullable=False)             # url | email | image
    target      = Column(String(512), nullable=False)            # URL / email address / filename
    verdict     = Column(String(30), nullable=False)             # SAFE | PHISHING | STEGO_DETECTED | SUSPICIOUS
    risk_score  = Column(Float, nullable=False)
    confidence  = Column(Float, nullable=False)
    scan_time_ms = Column(Integer, nullable=False)
    raw_result  = Column(Text, nullable=True)                    # JSON blob of full analysis
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
