from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from services.report_service import AIReportService
from typing import Optional
from auth import get_optional_user
from models import Report, User
from sqlalchemy import select

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])

@router.post("/generate")
async def generate_report(
    time_range: str = "24h", 
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    try:
        user_id = current_user.id if current_user else None
        report = await AIReportService.generate_report(time_range, db, user_id)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/latest")
async def get_latest_report(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    user_id = current_user.id if current_user else None
    if user_id:
        query = select(Report).where(Report.user_id == user_id).order_by(Report.created_at.desc()).limit(1)
    else:
        query = select(Report).where(Report.user_id.is_(None)).order_by(Report.created_at.desc()).limit(1)

    result = await db.execute(query)
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="No reports found")
    return report

@router.get("/{report_id}")
async def get_report(
    report_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    user_id = current_user.id if current_user else None
    if user_id:
        query = select(Report).where(Report.id == report_id, Report.user_id == user_id)
    else:
        query = select(Report).where(Report.id == report_id, Report.user_id.is_(None))
        
    result = await db.execute(query)
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@router.get("/{report_id}/pdf")
async def get_report_pdf(
    report_id: int, 
    token: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    try:
        if not current_user and token:
            try:
                from auth import SECRET_KEY, ALGORITHM
                from jose import jwt
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                email = payload.get("sub")
                if email:
                    result = await db.execute(select(User).where(User.email == email))
                    current_user = result.scalar_one_or_none()
            except Exception:
                pass

        user_id = current_user.id if current_user else None
        if user_id:
            query = select(Report).where(Report.id == report_id, Report.user_id == user_id)
        else:
            query = select(Report).where(Report.id == report_id, Report.user_id.is_(None))
            
        result = await db.execute(query)
        report = result.scalar_one_or_none()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
            
        pdf_bytes = await AIReportService.generate_pdf(report_id, db)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=report_{report_id}.pdf"}
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

