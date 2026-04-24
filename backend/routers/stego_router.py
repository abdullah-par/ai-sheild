import time, json, uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User, Scan
from auth import get_current_user, get_optional_user
from services.stego_service import analyze_image_file

from schemas import StegoScanResponse

router = APIRouter(prefix="/api/v1/steganography", tags=["steganography"])

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/bmp", "image/gif", "image/webp"}
MAX_SIZE_MB   = 10


async def _save_scan(db, user, target, verdict, risk, confidence, elapsed, raw):
    scan_id = f"SC-{uuid.uuid4().hex[:6].upper()}"
    scan = Scan(
        scan_id=scan_id,
        user_id=user.id if user else None,
        type="steganography",
        target=target[:500],
        verdict=verdict,
        risk_score=risk,
        confidence=confidence,
        scan_time_ms=elapsed,
        raw_result=json.dumps(raw),
    )
    db.add(scan)
    await db.commit()
    return scan_id


@router.post("/analyze", response_model=StegoScanResponse)
async def analyze(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    # Validate type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {file.content_type}")

    content = await file.read()

    # Validate size
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds {MAX_SIZE_MB} MB limit")

    t0      = time.time()
    result  = analyze_image_file(content, file.filename)
    elapsed = int((time.time() - t0) * 1000)

    scan_id = await _save_scan(
        db, current_user, file.filename,
        result["verdict"], result["risk_score"],
        result["confidence"], elapsed, result,
    )

    return {
        "scan_id":         scan_id,
        "filename":        file.filename,
        "verdict":         result["verdict"],
        "risk_score":      result["risk_score"],
        "confidence":      result["confidence"],
        "scan_time_ms":    elapsed,
        "file_info":       result["file_info"],
        "analysis":        result["analysis"],
        "heatmap_url":     f"/api/v1/steganography/heatmap/{scan_id}",
        "recommendations": result["recommendations"],
        "timestamp":       datetime.utcnow(),
    }


@router.get("/heatmap/{scan_id}")
async def get_heatmap(scan_id: str):
    """Returns the entropy heatmap PNG for a completed scan (placeholder path)."""
    path = f"heatmaps/{scan_id}.png"
    import os
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Heatmap not found for this scan")
    return FileResponse(path, media_type="image/png")
