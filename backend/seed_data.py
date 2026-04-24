import asyncio
import uuid
import json
from datetime import datetime, timedelta
from database import AsyncSessionLocal
from models import Scan

async def seed():
    print("[*] Seeding sample scans...")
    async with AsyncSessionLocal() as db:
        # Sample data
        scans = [
            {
                "type": "url",
                "target": "https://secure-login-bank.verify-acc.com/login",
                "verdict": "PHISHING",
                "risk_score": 98.5,
                "confidence": 95.0,
                "scan_time_ms": 450,
            },
            {
                "type": "url",
                "target": "https://google.com",
                "verdict": "SAFE",
                "risk_score": 2.1,
                "confidence": 99.0,
                "scan_time_ms": 120,
            },
            {
                "type": "image",
                "target": "profile_photo.jpg",
                "verdict": "SAFE",
                "risk_score": 5.0,
                "confidence": 92.0,
                "scan_time_ms": 850,
            },
            {
                "type": "image",
                "target": "secret_doc_stego.png",
                "verdict": "STEGO_DETECTED",
                "risk_score": 88.0,
                "confidence": 85.0,
                "scan_time_ms": 1200,
            },
            {
                "type": "email",
                "target": "urgent@it-support-dept.net",
                "verdict": "SUSPICIOUS",
                "risk_score": 65.0,
                "confidence": 78.0,
                "scan_time_ms": 600,
            },
            {
                "type": "url",
                "target": "http://free-bitcoins-now.io",
                "verdict": "PHISHING",
                "risk_score": 92.0,
                "confidence": 88.0,
                "scan_time_ms": 300,
            }
        ]

        for s_data in scans:
            scan = Scan(
                scan_id=f"SC-{uuid.uuid4().hex[:6].upper()}",
                user_id=None, # Anonymous
                type=s_data["type"],
                target=s_data["target"],
                verdict=s_data["verdict"],
                risk_score=s_data["risk_score"],
                confidence=s_data["confidence"],
                scan_time_ms=s_data["scan_time_ms"],
                raw_result=json.dumps({"seeded": True}),
                created_at=datetime.utcnow() - timedelta(hours=uuid.uuid4().int % 48)
            )
            db.add(scan)
        
        await db.commit()
    print("[OK] Seeding complete.")

if __name__ == "__main__":
    asyncio.run(seed())
