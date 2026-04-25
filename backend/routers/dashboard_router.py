from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case

from database import get_db
from models import User, Scan
from auth import get_current_user, get_optional_user
from schemas import PaginatedScans, StatsSummary, WeeklyStats, ScanDetail

router = APIRouter(prefix="/api/v1", tags=["dashboard"])


# ── Paginated Scan History ───────────────────────
@router.get("/scans", response_model=PaginatedScans)
async def get_scans(
    page:    int = Query(1, ge=1),
    limit:   int = Query(20, ge=1, le=100),
    type:    str = Query(None),
    verdict: str = Query(None),
    db:      AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    # If no user, show anonymous scans (where user_id is None)
    user_id = current_user.id if current_user else None
    query = select(Scan).where(Scan.user_id == user_id)

    if type:
        query = query.where(Scan.type == type)
    if verdict:
        query = query.where(Scan.verdict == verdict)

    # Total count
    count_q = select(func.count()).select_from(query.subquery())
    total   = (await db.execute(count_q)).scalar_one()

    # Paginated results
    query  = query.order_by(Scan.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    scans  = result.scalars().all()

    return {
        "total": total,
        "page":  page,
        "limit": limit,
        "scans": [
            {
                "scan_id":    s.scan_id,
                "type":       s.type,
                "target":     s.target,
                "verdict":    s.verdict,
                "risk_score": s.risk_score,
                "timestamp":  s.created_at,
            }
            for s in scans
        ],
    }


# ── Single Scan Detail ───────────────────────────
@router.get("/scans/{scan_id}", response_model=ScanDetail)
async def get_scan(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    import json
    user_id = current_user.id if current_user else None
    result = await db.execute(
        select(Scan).where(Scan.scan_id == scan_id, Scan.user_id == user_id)
    )
    scan = result.scalar_one_or_none()
    if not scan:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Scan not found")

    return {
        **{c.name: getattr(scan, c.name) for c in scan.__table__.columns},
        "raw_result": json.loads(scan.raw_result) if scan.raw_result else None,
    }


# ── Delete Scan ──────────────────────────────────
@router.delete("/scans/{scan_id}", status_code=204)
async def delete_scan(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    from fastapi import HTTPException
    user_id = current_user.id if current_user else None
    result = await db.execute(
        select(Scan).where(Scan.scan_id == scan_id, Scan.user_id == user_id)
    )
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    await db.delete(scan)
    await db.commit()


# ── Stats Summary ────────────────────────────────
@router.get("/stats/summary", response_model=StatsSummary)
async def stats_summary(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    user_id = current_user.id if current_user else None
    result = await db.execute(
        select(Scan).where(Scan.user_id == user_id)
    )
    scans = result.scalars().all()

    total        = len(scans)
    threats      = sum(1 for s in scans if s.verdict != "SAFE")
    clean        = total - threats
    avg_risk     = sum(s.risk_score for s in scans) / total if total else 0

    breakdown = {
        "phishing_url":    sum(1 for s in scans if s.type == "url"   and s.verdict == "PHISHING"),
        "phishing_email":  sum(1 for s in scans if s.type == "email" and s.verdict == "PHISHING"),
        "steganography":   sum(1 for s in scans if s.verdict == "STEGO_DETECTED"),
        "safe":            clean,
        "suspicious":      sum(1 for s in scans if s.verdict == "SUSPICIOUS"),
    }

    return {
        "total_scans":       total,
        "threats_found":     threats,
        "clean_scans":       clean,
        "average_risk_score": round(avg_risk, 2),
        "breakdown":         breakdown,
    }


# ── Weekly Stats ─────────────────────────────────
@router.get("/stats/weekly", response_model=WeeklyStats)
async def stats_weekly(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    DAYS   = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    today  = datetime.utcnow().date()
    days   = []
    user_id = current_user.id if current_user else None

    # Query once for the last 7 days and aggregate in Python to avoid
    # database-specific DATE() casting issues across drivers/dialects.
    week_start = today - timedelta(days=6)
    result = await db.execute(
        select(Scan).where(
            Scan.user_id == user_id,
            Scan.created_at >= datetime.combine(week_start, datetime.min.time()),
        )
    )
    week_scans = result.scalars().all()

    by_day = {}
    for s in week_scans:
        created = s.created_at
        # Handle both timezone-aware and naive datetimes returned by DB drivers.
        day_key = (created.date() if created else None)
        if day_key is None:
            continue
        if day_key not in by_day:
            by_day[day_key] = {"total": 0, "threats": 0}
        by_day[day_key]["total"] += 1
        if s.verdict != "SAFE":
            by_day[day_key]["threats"] += 1

    for i in range(6, -1, -1):
        day_date = today - timedelta(days=i)
        stats = by_day.get(day_date, {"total": 0, "threats": 0})
        days.append({
            "date": str(day_date),
            "label": DAYS[day_date.weekday()],
            "total": stats["total"],
            "threats": stats["threats"],
        })

    return {"days": days}


# ── Export Report ────────────────────────────────
@router.get("/scans/{scan_id}/report")
async def export_report(
    scan_id: str,
    format: str = Query("pdf", regex="^(pdf|csv|json)$"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    user_id = current_user.id if current_user else None
    result = await db.execute(
        select(Scan).where(Scan.scan_id == scan_id, Scan.user_id == user_id)
    )
    scan = result.scalar_one_or_none()
    if not scan:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Scan not found")

    # Placeholder for actual file generation logic
    if format == "json":
        from fastapi.responses import JSONResponse
        return JSONResponse(content={
            "scan_id": scan.scan_id,
            "verdict": scan.verdict,
            "risk_score": scan.risk_score,
            "raw_result": json.loads(scan.raw_result) if scan.raw_result else {}
        })

    # For now, return a simple text file as a placeholder for PDF/CSV
    from fastapi.responses import StreamingResponse
    import io
    
    output = io.StringIO()
    output.write(f"AI-SHIELD SECURITY REPORT\n")
    output.write(f"==========================\n")
    output.write(f"Scan ID: {scan.scan_id}\n")
    output.write(f"Type: {scan.type}\n")
    output.write(f"Target: {scan.target}\n")
    output.write(f"Verdict: {scan.verdict}\n")
    output.write(f"Risk Score: {scan.risk_score}%\n")
    output.write(f"Confidence: {scan.confidence}%\n")
    output.write(f"Timestamp: {scan.created_at}\n")
    
    output.seek(0)
    filename = f"report_{scan.scan_id}.{format}"
    media_type = "application/pdf" if format == "pdf" else "text/csv" if format == "csv" else "text/plain"
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
