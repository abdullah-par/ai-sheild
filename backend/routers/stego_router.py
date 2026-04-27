import time, json, uuid
from datetime import datetime
from typing import Optional
import base64
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Header
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User, Scan
from auth import get_current_user, get_optional_user
from services.stego_service import analyze_image_file, encode_text, decode_text, save_heatmap

from schemas import StegoScanResponse

router = APIRouter(prefix="/api/v1/steganography", tags=["steganography"])

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/bmp", "image/gif", "image/webp"}
MAX_SIZE_MB   = 10


async def _save_scan(db, user, target, verdict, risk, confidence, elapsed, raw, session_id=None):
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
        session_id=session_id if not user else None,
    )
    db.add(scan)
    await db.commit()
    return scan_id


@router.post("/analyze", response_model=StegoScanResponse)
async def analyze(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
    x_session_id: Optional[str] = Header(None),
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
        session_id=x_session_id,
    )
    
    save_heatmap(scan_id, content, result["analysis"]["lsb_anomaly_score"])

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


@router.post("/encode")
async def encode(
    file: UploadFile = File(...),
    message: str = Form(...),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {file.content_type}")
        
    content = await file.read()
    
    try:
        encoded_bytes = encode_text(content, message)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    b64_str = base64.b64encode(encoded_bytes).decode("utf-8")
    
    return {
        "filename": f"encoded_{file.filename}",
        "image_base64": f"data:image/png;base64,{b64_str}"
    }


@router.post("/decode")
async def decode(
    file: UploadFile = File(...),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {file.content_type}")
        
    content = await file.read()
    
    try:
        message = decode_text(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    return {
        "message": message
    }
