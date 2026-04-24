from pydantic import BaseModel, EmailStr, Field, HttpUrl, validator
from typing import Optional, List, Dict, Any
from datetime import datetime


# ── Auth ─────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100, description="Password must be at least 8 characters")

class LoginRequest(BaseModel):
    email: EmailStr = Field(..., example="user@example.com")
    password: str = Field(..., description="User password")

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    id: int
    email: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Phishing ──────────────────────────────────────
class URLScanRequest(BaseModel):
    url: str = Field(..., min_length=4, max_length=2048, example="http://suspicious-site.com/login")

    @validator("url")
    def validate_url_format(cls, v):
        # Basic check for protocol or at least a dot
        if "://" not in v and "." not in v:
            raise ValueError("Invalid URL format")
        return v

class EmailScanRequest(BaseModel):
    raw_email: str = Field(..., min_length=10, max_length=100000, description="The raw email headers and body content")

class ScanIndicator(BaseModel):
    label: str
    value: str
    status: str  # safe | warning | danger

class URLScanResponse(BaseModel):
    scan_id: str
    url: str
    risk_score: float = Field(..., ge=0, le=100)
    verdict: str
    confidence: float = Field(..., ge=0, le=100)
    scan_time_ms: int
    indicators: Dict[str, Any]
    whois: Optional[Dict[str, Any]] = None
    recommendations: List[str]
    timestamp: datetime

class EmailScanResponse(BaseModel):
    scan_id: str
    verdict: str
    risk_score: float = Field(..., ge=0, le=100)
    confidence: float = Field(..., ge=0, le=100)
    scan_time_ms: int
    auth_checks: Dict[str, Any]
    sender_analysis: Dict[str, Any]
    link_analysis: Dict[str, Any]
    urgency_signals: List[str]
    recommendations: List[str]
    timestamp: datetime


# ── Steganography ─────────────────────────────────
class StegoScanResponse(BaseModel):
    scan_id: str
    filename: str
    verdict: str
    risk_score: float = Field(..., ge=0, le=100)
    confidence: float = Field(..., ge=0, le=100)
    scan_time_ms: int
    file_info: Dict[str, Any]
    analysis: Dict[str, Any]
    heatmap_url: Optional[str] = None
    recommendations: List[str]
    timestamp: datetime


# ── Dashboard ─────────────────────────────────────
class ScanSummary(BaseModel):
    scan_id: str
    type: str
    target: str
    verdict: str
    risk_score: float
    timestamp: datetime

class PaginatedScans(BaseModel):
    total: int
    page: int
    limit: int
    scans: List[ScanSummary]

class ScanDetail(BaseModel):
    id: int
    scan_id: str
    user_id: Optional[int]
    type: str
    target: str
    verdict: str
    risk_score: float
    confidence: float
    scan_time_ms: int
    raw_result: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True

class StatsSummary(BaseModel):
    total_scans: int
    threats_found: int
    clean_scans: int
    average_risk_score: float
    breakdown: Dict[str, int]

class DayStats(BaseModel):
    date: str
    label: str
    total: int
    threats: int

class WeeklyStats(BaseModel):
    days: List[DayStats]
