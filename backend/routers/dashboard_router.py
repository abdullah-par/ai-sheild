from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query, Header
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
    x_session_id: Optional[str] = Header(None),
):
    # If no user, show anonymous scans (where user_id is None)
    user_id = current_user.id if current_user else None
    if user_id:
        query = select(Scan).where(Scan.user_id == user_id)
    else:
        query = select(Scan).where(Scan.user_id == None, Scan.session_id == x_session_id)

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
    x_session_id: Optional[str] = Header(None),
):
    import json
    user_id = current_user.id if current_user else None
    if user_id:
        result = await db.execute(
            select(Scan).where(Scan.scan_id == scan_id, Scan.user_id == user_id)
        )
    else:
        result = await db.execute(
            select(Scan).where(Scan.scan_id == scan_id, Scan.user_id == None, Scan.session_id == x_session_id)
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
    x_session_id: Optional[str] = Header(None),
):
    from fastapi import HTTPException
    user_id = current_user.id if current_user else None
    if user_id:
        result = await db.execute(
            select(Scan).where(Scan.scan_id == scan_id, Scan.user_id == user_id)
        )
    else:
        result = await db.execute(
            select(Scan).where(Scan.scan_id == scan_id, Scan.user_id == None, Scan.session_id == x_session_id)
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
    x_session_id: Optional[str] = Header(None),
):
    user_id = current_user.id if current_user else None
    if user_id:
        result = await db.execute(
            select(Scan).where(Scan.user_id == user_id)
        )
    else:
        result = await db.execute(
            select(Scan).where(Scan.user_id == None, Scan.session_id == x_session_id)
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
    x_session_id: Optional[str] = Header(None),
):
    DAYS   = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    today  = datetime.utcnow().date()
    days   = []
    user_id = current_user.id if current_user else None

    week_start = today - timedelta(days=6)
    if user_id:
        result = await db.execute(
            select(Scan).where(
                Scan.user_id == user_id,
                Scan.created_at >= datetime.combine(week_start, datetime.min.time()),
            )
        )
    else:
        result = await db.execute(
            select(Scan).where(
                Scan.user_id == None,
                Scan.session_id == x_session_id,
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
    format: str = Query("json", regex="^json$"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
    x_session_id: Optional[str] = Header(None),
):
    import json
    user_id = current_user.id if current_user else None
    if user_id:
        result = await db.execute(
            select(Scan).where(Scan.scan_id == scan_id, Scan.user_id == user_id)
        )
    else:
        result = await db.execute(
            select(Scan).where(Scan.scan_id == scan_id, Scan.user_id == None, Scan.session_id == x_session_id)
        )
    scan = result.scalar_one_or_none()
    if not scan:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Scan not found")

    # Keep the parameter for backward compatibility with existing clients,
    # but support JSON-only exports to avoid invalid file type downloads.
    if format != "json":
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Only JSON export is supported")

    from fastapi.responses import JSONResponse
    return JSONResponse(content={
        "scan_id": scan.scan_id,
        "type": scan.type,
        "target": scan.target,
        "verdict": scan.verdict,
        "risk_score": scan.risk_score,
        "confidence": scan.confidence,
        "scan_time_ms": scan.scan_time_ms,
        "created_at": str(scan.created_at),
        "raw_result": json.loads(scan.raw_result) if scan.raw_result else {}
    })


@router.get("/scans/{scan_id}/pdf")
async def export_scan_pdf(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    from fastapi import HTTPException, Response
    from services.report_service import AIReportService
    
    try:
        pdf_bytes = await AIReportService.generate_scan_pdf(scan_id, db)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=scan_report_{scan_id}.pdf"}
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# ── User Report Generation ──────────────────────
@router.get("/user/report")
async def generate_user_report(
    format: str = Query("json", regex="^json$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),  # Requires authentication
):
    """Generate a comprehensive report for the authenticated user including all their scans."""
    import json

    # Get user info
    user_info = {
        "user_id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "created_at": str(current_user.created_at),
        "is_active": current_user.is_active,
    }

    # Get all user's scans
    result = await db.execute(
        select(Scan).where(Scan.user_id == current_user.id).order_by(Scan.created_at.desc())
    )
    scans = result.scalars().all()

    # Calculate statistics
    total_scans = len(scans)
    threats_found = sum(1 for s in scans if s.verdict != "SAFE")
    clean_scans = total_scans - threats_found
    avg_risk_score = sum(s.risk_score for s in scans) / total_scans if total_scans else 0

    # Breakdown by type and verdict
    breakdown = {
        "phishing_url": sum(1 for s in scans if s.type == "url" and s.verdict == "PHISHING"),
        "phishing_email": sum(1 for s in scans if s.type == "email" and s.verdict == "PHISHING"),
        "steganography": sum(1 for s in scans if s.verdict == "STEGO_DETECTED"),
        "safe": clean_scans,
        "suspicious": sum(1 for s in scans if s.verdict == "SUSPICIOUS"),
    }

    # Recent activity (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_scans = [s for s in scans if s.created_at >= thirty_days_ago]
    recent_threats = sum(1 for s in recent_scans if s.verdict != "SAFE")

    # Format scan details
    scan_details = []
    for scan in scans:
        scan_details.append({
            "scan_id": scan.scan_id,
            "type": scan.type,
            "target": scan.target,
            "verdict": scan.verdict,
            "risk_score": scan.risk_score,
            "confidence": scan.confidence,
            "scan_time_ms": scan.scan_time_ms,
            "created_at": str(scan.created_at),
            "raw_result": json.loads(scan.raw_result) if scan.raw_result else None,
        })

    report_data = {
        "generated_at": datetime.utcnow().isoformat(),
        "user": user_info,
        "summary": {
            "total_scans": total_scans,
            "threats_found": threats_found,
            "clean_scans": clean_scans,
            "average_risk_score": round(avg_risk_score, 2),
            "breakdown": breakdown,
        },
        "recent_activity": {
            "period_days": 30,
            "scans_in_period": len(recent_scans),
            "threats_in_period": recent_threats,
        },
        "scans": scan_details,
    }

    from fastapi.responses import JSONResponse
    return JSONResponse(content=report_data)

