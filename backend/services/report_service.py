import os
import json
import logging
from typing import Optional
from datetime import datetime, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from models import Report, Scan
from services.pdf_renderer import ReportPDFRenderer

logger = logging.getLogger(__name__)
pdf_renderer = ReportPDFRenderer()

# Initialize Groq client
try:
    from groq import Groq
    groq_api_key = os.getenv("GROQ_API_KEY") or os.getenv("groq_api_key")
    groq_client = Groq(api_key=groq_api_key) if groq_api_key else None
    if not groq_client:
        logger.warning("GROQ_API_KEY not found in environment. AI analysis will be mocked.")
except ImportError:
    logger.warning("Groq SDK not found. AI report generation will be limited.")
    groq_client = None


class AIReportService:
    @staticmethod
    async def generate_report(time_range: str, db: AsyncSession, user_id: Optional[int] = None) -> Report:
        logger.info(f"🤖 Starting AI Report generation for range: {time_range}, user_id: {user_id}")
        
        # 1. Calculate time bounds
        end_date = datetime.utcnow()
        if time_range == "24h":
            start_date = end_date - timedelta(hours=24)
        elif time_range == "7d":
            start_date = end_date - timedelta(days=7)
        else:
            start_date = end_date - timedelta(hours=24)

        # 2. Gather Data from Database
        total_scans_query = select(func.count(Scan.id)).where(Scan.created_at >= start_date)
        if user_id:
            total_scans_query = total_scans_query.where(Scan.user_id == user_id)
        else:
            # For anonymous reports, do not mix logged-in user data
            total_scans_query = total_scans_query.where(Scan.user_id.is_(None))
            
        total_scans_result = await db.execute(total_scans_query)
        total_scans = total_scans_result.scalar() or 0

        malicious_query = select(Scan).where(Scan.created_at >= start_date, Scan.verdict != "SAFE")
        if user_id:
            malicious_query = malicious_query.where(Scan.user_id == user_id)
        else:
            malicious_query = malicious_query.where(Scan.user_id.is_(None))
            
        malicious_result = await db.execute(malicious_query)
        malicious_scans = malicious_result.scalars().all()
        malicious_count = len(malicious_scans)

        breakdown_query = select(Scan.type, func.count(Scan.id)).where(
            Scan.created_at >= start_date, Scan.verdict != "SAFE"
        )
        if user_id:
            breakdown_query = breakdown_query.where(Scan.user_id == user_id)
        else:
            breakdown_query = breakdown_query.where(Scan.user_id.is_(None))
            
        breakdown_query = breakdown_query.group_by(Scan.type)
        breakdown_result = await db.execute(breakdown_query)
        breakdown = breakdown_result.all()
        
        top_attack = "None Detected"
        if breakdown:
            breakdown_list = list(breakdown)
            breakdown_list.sort(key=lambda x: x[1], reverse=True)
            top_attack = breakdown_list[0][0]

        all_scans_query = select(Scan).where(Scan.created_at >= start_date)
        if user_id:
            all_scans_query = all_scans_query.where(Scan.user_id == user_id)
        else:
            all_scans_query = all_scans_query.where(Scan.user_id.is_(None))
            
        all_scans_result = await db.execute(all_scans_query)
        all_scans = all_scans_result.scalars().all()
        
        timeline_dict = {}
        for scan in all_scans:
            hour_str = scan.created_at.strftime("%Y-%m-%dT%H:00:00.000Z")
            if hour_str not in timeline_dict:
                timeline_dict[hour_str] = 0
            if scan.verdict != "SAFE":
                timeline_dict[hour_str] += 1
                
        timeline_data = [{"hour": k, "maliciousFlows": v} for k, v in sorted(timeline_dict.items())]

        stats_summary = {
            "period": time_range,
            "total_traffic": total_scans,
            "attacks_detected": malicious_count,
            "ips_blocked": malicious_count,
            "attack_types": ", ".join([f"{b[0]}: {b[1]}" for b in breakdown]),
            "sample_malicious_targets": ", ".join(list(set([s.target for s in malicious_scans[:5]])))
        }

        prompt = f"""
        You are a Cyber Forensics Expert and Incident Responder. 
        Analyze the following security telemetry data for the last {time_range}:
        
        DATA SUMMARY:
        - Total Network Flows Analyzed: {stats_summary['total_traffic']}
        - Malicious Attacks Detected: {stats_summary['attacks_detected']}
        - Systems Automatically Blocked: {stats_summary['ips_blocked']}
        - Primary Attack Vectors: {stats_summary['attack_types']}
        - Recent Malicious Targets: {stats_summary['sample_malicious_targets']}

        Please provide a highly technical, objective Cyber Forensics Report. Avoid conversational or overly descriptive language.
        Format the output using clear forensic categories:
        1. FORENSIC SUMMARY: High-level technical baseline.
        2. EVIDENCE PRESERVATION & ARTIFACTS: Identified malicious targets and attack vectors.
        3. TACTICS, TECHNIQUES, AND PROCEDURES (TTPs): Technical breakdown of the exploitation methods.
        4. CHAIN OF CUSTODY & INCIDENT TIMELINE: Analysis of flow progression.
        5. REMEDIATION & MITIGATION PROTOCOLS: Exact technical countermeasures (e.g., firewall rules, patch management).
        
        Use concise, evidence-based language (e.g., "IOCs identified", "TTP correlation"). Keep it in plain text format without excessive markdown.
        """

        ai_response = "AI Analysis unavailable (Missing API Key)."
        
        if groq_client:
            try:
                chat_completion = groq_client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model="llama-3.3-70b-versatile",
                    temperature=0.5,
                )
                ai_response = chat_completion.choices[0].message.content
            except Exception as e:
                logger.error(f"Groq API call failed: {e}")
                ai_response = f"AI Analysis failed: {e}"

        report = Report(
            title=f"Security Analysis Report ({time_range})",
            user_id=user_id,
            time_range_start=start_date,
            time_range_end=end_date,
            total_flows=total_scans,
            malicious_count=malicious_count,
            blocked_count=malicious_count,
            top_attack_type=top_attack,
            timeline_json=json.dumps(timeline_data),
            ai_raw_content=ai_response,
            status="completed"
        )

        db.add(report)
        await db.commit()
        await db.refresh(report)
        logger.info(f"✅ AI Report generated and saved to DB: {report.id}")
        
        return report


    @staticmethod
    async def generate_pdf(report_id: int, db: AsyncSession) -> bytes:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        export_dir = os.path.join(base_dir, "exports", "reports")
        os.makedirs(export_dir, exist_ok=True)
        file_path = os.path.join(export_dir, f"{report_id}.pdf")

        query = select(Report).where(Report.id == report_id)
        result = await db.execute(query)
        report = result.scalar_one_or_none()
        if not report:
            raise ValueError("Report not found")

        scans = await AIReportService._get_report_scans(report, db)
        pdf_bytes = pdf_renderer.build_ai_report(report, scans)
        with open(file_path, "wb") as f:
            f.write(pdf_bytes)
        logger.info(f"💾 Report saved to filesystem: {file_path}")
        return pdf_bytes

    @staticmethod
    async def generate_scan_pdf(scan_id: str, db: AsyncSession) -> bytes:
        query = select(Scan).where(Scan.scan_id == scan_id)
        result = await db.execute(query)
        scan = result.scalar_one_or_none()
        if not scan:
            raise ValueError("Scan not found")

        return pdf_renderer.build_scan_report(scan)

    @staticmethod
    async def _get_report_scans(report: Report, db: AsyncSession):
        query = select(Scan).where(
            Scan.created_at >= report.time_range_start,
            Scan.created_at <= report.time_range_end,
        )
        if report.user_id:
            query = query.where(Scan.user_id == report.user_id)
        else:
            query = query.where(Scan.user_id.is_(None))
        result = await db.execute(query.order_by(Scan.created_at.desc()))
        return result.scalars().all()
