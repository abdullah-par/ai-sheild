import time, re, json, uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User, Scan
from schemas import URLScanRequest, URLScanResponse, EmailScanRequest, EmailScanResponse
from auth import get_current_user, get_optional_user
from services.phishing_service import analyze_url, analyze_email_text, analyze_email_bytes

router = APIRouter(prefix="/api/v1/phishing", tags=["phishing"])


def _next_scan_id(db_count: int) -> str:
    return f"SC-{(db_count + 1):05d}"


async def _save_scan(db: AsyncSession, user: Optional[User], scan_type: str,
                     target: str, verdict: str, risk: float,
                     confidence: float, elapsed_ms: int, raw: dict) -> str:
    # Simple sequential ID using timestamp to avoid extra DB query
    scan_id = f"SC-{uuid.uuid4().hex[:6].upper()}"
    scan = Scan(
        scan_id=scan_id,
        user_id=user.id if user else None,
        type=scan_type,
        target=target[:500],
        verdict=verdict,
        risk_score=risk,
        confidence=confidence,
        scan_time_ms=elapsed_ms,
        raw_result=json.dumps(raw),
    )
    db.add(scan)
    await db.commit()
    return scan_id


# ── URL Scan ─────────────────────────────────────
@router.post("/scan-url", response_model=URLScanResponse)
async def scan_url(
    body: URLScanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    if not body.url.strip():
        raise HTTPException(status_code=422, detail="URL cannot be empty")

    t0      = time.time()
    result  = analyze_url(body.url)
    elapsed = int((time.time() - t0) * 1000)

    scan_id = await _save_scan(
        db, current_user, "url", body.url,
        result["verdict"], result["risk_score"],
        result["confidence"], elapsed, result,
    )

    return {
        "scan_id":      scan_id,
        "url":          body.url,
        "risk_score":   result["risk_score"],
        "verdict":      result["verdict"],
        "confidence":   result["confidence"],
        "scan_time_ms": elapsed,
        "indicators":   result["indicators"],
        "whois":        result.get("whois"),
        "recommendations": result["recommendations"],
        "timestamp":    datetime.utcnow(),
    }


# ── Email Scan ────────────────────────────────────
@router.post("/analyze-email", response_model=EmailScanResponse)
async def analyze_email(
    raw_email: str = Form(None),
    file: UploadFile = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    if not raw_email and not file:
        raise HTTPException(status_code=422, detail="Provide raw_email text or upload a file")

    t0 = time.time()

    if file:
        content = await file.read()
        result  = analyze_email_bytes(content, filename=file.filename)
        target  = file.filename
    else:
        result = analyze_email_text(raw_email)
        target = result.get("sender_analysis", {}).get("from_address", "email")

    elapsed = int((time.time() - t0) * 1000)

    scan_id = await _save_scan(
        db, current_user, "email", target,
        result["verdict"], result["risk_score"],
        result["confidence"], elapsed, result,
    )

    return {
        "scan_id":         scan_id,
        "verdict":         result["verdict"],
        "risk_score":      result["risk_score"],
        "confidence":      result["confidence"],
        "scan_time_ms":    elapsed,
        "auth_checks":     result["auth_checks"],
        "sender_analysis": result["sender_analysis"],
        "link_analysis":   result["link_analysis"],
        "urgency_signals": result["urgency_signals"],
        "recommendations": result["recommendations"],
        "timestamp":       datetime.utcnow(),
    }


@router.post("/analyze-email-text", response_model=EmailScanResponse)
async def analyze_email_text_json(
    body: EmailScanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    t0      = time.time()
    result  = analyze_email_text(body.raw_email)
    target  = result.get("sender_analysis", {}).get("from_address", "email")
    elapsed = int((time.time() - t0) * 1000)

    scan_id = await _save_scan(
        db, current_user, "email", target,
        result["verdict"], result["risk_score"],
        result["confidence"], elapsed, result,
    )

    return {
        "scan_id":         scan_id,
        "verdict":         result["verdict"],
        "risk_score":      result["risk_score"],
        "confidence":      result["confidence"],
        "scan_time_ms":    elapsed,
        "auth_checks":     result["auth_checks"],
        "sender_analysis": result["sender_analysis"],
        "link_analysis":   result["link_analysis"],
        "urgency_signals": result["urgency_signals"],
        "recommendations": result["recommendations"],
        "timestamp":       datetime.utcnow(),
    }
