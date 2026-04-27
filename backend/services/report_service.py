import os
import json
import logging
from datetime import datetime, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from models import Report, Scan
from fpdf import FPDF

logger = logging.getLogger(__name__)

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
    async def generate_report(time_range: str, db: AsyncSession) -> Report:
        logger.info(f"🤖 Starting AI Report generation for range: {time_range}")
        
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
        total_scans_result = await db.execute(total_scans_query)
        total_scans = total_scans_result.scalar() or 0

        malicious_query = select(Scan).where(Scan.created_at >= start_date, Scan.verdict != "SAFE")
        malicious_result = await db.execute(malicious_query)
        malicious_scans = malicious_result.scalars().all()
        malicious_count = len(malicious_scans)

        breakdown_query = select(Scan.type, func.count(Scan.id)).where(
            Scan.created_at >= start_date, Scan.verdict != "SAFE"
        ).group_by(Scan.type)
        breakdown_result = await db.execute(breakdown_query)
        breakdown = breakdown_result.all()
        
        top_attack = "None Detected"
        if breakdown:
            breakdown_list = list(breakdown)
            breakdown_list.sort(key=lambda x: x[1], reverse=True)
            top_attack = breakdown_list[0][0]

        all_scans_query = select(Scan).where(Scan.created_at >= start_date)
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
        You are an expert Cybersecurity Analyst (CISM/CISSP certified). 
        Analyze the following IDS (Intrusion Detection System) security data for the last {time_range}:
        
        DATA SUMMARY:
        - Total Network Flows Analyzed: {stats_summary['total_traffic']}
        - Malicious Attacks Detected: {stats_summary['attacks_detected']}
        - Systems Automatically Blocked: {stats_summary['ips_blocked']}
        - Primary Attack Vectors: {stats_summary['attack_types']}
        - Recent Malicious Targets: {stats_summary['sample_malicious_targets']}

        Please provide a professional Security Analysis Report in plain text format. Do not use complex markdown formatting like excessive bolding or tables.
        Include these sections:
        1. EXECUTIVE SUMMARY: A high-level overview.
        2. THREAT LANDSCAPE: Analysis of attack patterns.
        3. PATTERN RECOGNITION: Campaign identification.
        4. ACTIONABLE RECOMMENDATIONS: 3-5 specific steps.
        Keep it professional and technical.
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
        
        if os.path.exists(file_path):
            logger.info(f"📄 Serving PDF from filesystem: {report_id}.pdf")
            with open(file_path, "rb") as f:
                return f.read()

        query = select(Report).where(Report.id == report_id)
        result = await db.execute(query)
        report = result.scalar_one_or_none()
        
        if not report:
            raise ValueError("Report not found")

        pdf = FPDF(orientation='P', unit='mm', format='A4')
        pdf.add_page()
        
        # Header
        pdf.set_fill_color(0, 0, 0)
        pdf.rect(0, 0, 210, 30, 'F')
        
        pdf.set_text_color(255, 255, 255)
        pdf.set_font('Helvetica', 'B', 16)
        pdf.text(15, 18, 'AI-SHIELD')
        
        pdf.set_font('Helvetica', '', 10)
        pdf.text(15, 24, 'SECURITY ANALYSIS REPORT')
        
        pdf.set_text_color(153, 153, 153)
        pdf.set_font('Helvetica', '', 8)
        pdf.text(140, 18, datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S GMT"))
        
        # Title
        pdf.set_text_color(0, 0, 0)
        pdf.set_font('Helvetica', 'B', 22)
        pdf.text(15, 45, report.title.upper())
        
        pdf.set_font('Helvetica', '', 10)
        start_str = report.time_range_start.strftime("%Y-%m-%d %H:%M")
        end_str = report.time_range_end.strftime("%Y-%m-%d %H:%M")
        pdf.text(15, 52, f"Analysis Period: {start_str} - {end_str}")
        
        pdf.set_draw_color(238, 238, 238)
        pdf.line(15, 58, 195, 58)
        
        # Summary Stats
        stats_y = 65
        
        pdf.rect(15, stats_y, 40, 25)
        pdf.set_text_color(153, 153, 153)
        pdf.set_font('Helvetica', '', 8)
        pdf.text(18, stats_y + 8, 'TOTAL SCANS')
        pdf.set_text_color(0, 0, 0)
        pdf.set_font('Helvetica', 'B', 14)
        pdf.text(18, stats_y + 18, str(report.total_flows))
        
        pdf.rect(60, stats_y, 40, 25)
        pdf.set_text_color(153, 153, 153)
        pdf.set_font('Helvetica', '', 8)
        pdf.text(63, stats_y + 8, 'MALICIOUS')
        pdf.set_text_color(255, 0, 0)
        pdf.set_font('Helvetica', 'B', 14)
        pdf.text(63, stats_y + 18, str(report.malicious_count))
        
        pdf.rect(105, stats_y, 40, 25)
        pdf.set_text_color(153, 153, 153)
        pdf.set_font('Helvetica', '', 8)
        pdf.text(108, stats_y + 8, 'THREATS FOUND')
        pdf.set_text_color(0, 0, 0)
        pdf.set_font('Helvetica', 'B', 14)
        pdf.text(108, stats_y + 18, str(report.blocked_count))
        
        pdf.rect(150, stats_y, 45, 25)
        pdf.set_text_color(153, 153, 153)
        pdf.set_font('Helvetica', '', 8)
        pdf.text(153, stats_y + 8, 'TOP VECTOR')
        pdf.set_text_color(0, 0, 0)
        pdf.set_font('Helvetica', 'B', 10)
        pdf.text(153, stats_y + 18, str(report.top_attack_type))
        
        # Trend Graph
        graph_y = stats_y + 35
        pdf.set_text_color(0, 0, 0)
        pdf.set_font('Helvetica', 'B', 10)
        pdf.text(15, graph_y - 5, '24-HOUR THREAT TREND')
        
        pdf.set_draw_color(204, 204, 204)
        pdf.line(15, graph_y, 15, graph_y + 20)
        pdf.line(15, graph_y + 20, 195, graph_y + 20)
        
        timeline = json.loads(report.timeline_json or "[]")
        if len(timeline) > 1:
            max_val = max([t.get("maliciousFlows", 0) for t in timeline] + [1])
            step_x = 180 / (len(timeline) - 1)
            
            points = []
            for idx, point in enumerate(timeline):
                x = 15 + (idx * step_x)
                y = (graph_y + 20) - ((point.get("maliciousFlows", 0) / max_val) * 20)
                points.append((x, y))
                
            pdf.set_draw_color(0, 0, 0)
            for i in range(len(points) - 1):
                pdf.line(points[i][0], points[i][1], points[i+1][0], points[i+1][1])
        
        # AI Analysis Section
        ai_y = graph_y + 35
        pdf.set_text_color(0, 0, 0)
        pdf.set_font('Helvetica', 'B', 14)
        pdf.text(15, ai_y, 'ARTIFICIAL INTELLIGENCE ANALYSIS')
        
        pdf.set_fill_color(0, 0, 0)
        pdf.rect(15, ai_y + 2, 15, 1, 'F')
        
        pdf.set_xy(15, ai_y + 10)
        pdf.set_text_color(51, 51, 51)
        pdf.set_font('Helvetica', '', 10)
        
        clean_text = report.ai_raw_content.encode('latin-1', 'ignore').decode('latin-1')
        pdf.multi_cell(180, 6, clean_text)
        
        pdf_string = pdf.output(dest='S')
        pdf_bytes = pdf_string.encode('latin1') if isinstance(pdf_string, str) else pdf_string
        
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

        pdf = FPDF(orientation='P', unit='mm', format='A4')
        pdf.add_page()
        
        # Header
        pdf.set_fill_color(0, 0, 0)
        pdf.rect(0, 0, 210, 30, 'F')
        
        pdf.set_text_color(255, 255, 255)
        pdf.set_font('Helvetica', 'B', 16)
        pdf.text(15, 18, 'AI-SHIELD')
        
        pdf.set_font('Helvetica', '', 10)
        pdf.text(15, 24, 'INDIVIDUAL SCAN REPORT')
        
        pdf.set_text_color(153, 153, 153)
        pdf.set_font('Helvetica', '', 8)
        pdf.text(140, 18, datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S GMT"))
        
        # Title
        pdf.set_text_color(0, 0, 0)
        pdf.set_font('Helvetica', 'B', 22)
        pdf.text(15, 45, f"SCAN: {scan.scan_id}")
        
        pdf.set_font('Helvetica', '', 10)
        pdf.text(15, 52, f"Target: {scan.target}")
        
        pdf.set_draw_color(238, 238, 238)
        pdf.line(15, 58, 195, 58)
        
        # Summary Stats
        stats_y = 65
        
        pdf.rect(15, stats_y, 40, 25)
        pdf.set_text_color(153, 153, 153)
        pdf.set_font('Helvetica', '', 8)
        pdf.text(18, stats_y + 8, 'SCAN TYPE')
        pdf.set_text_color(0, 0, 0)
        pdf.set_font('Helvetica', 'B', 12)
        pdf.text(18, stats_y + 18, scan.type.upper())
        
        pdf.rect(60, stats_y, 40, 25)
        pdf.set_text_color(153, 153, 153)
        pdf.set_font('Helvetica', '', 8)
        pdf.text(63, stats_y + 8, 'VERDICT')
        
        if scan.verdict == 'SAFE':
            pdf.set_text_color(16, 185, 129)
        elif scan.verdict in ['PHISHING', 'STEGO_DETECTED']:
            pdf.set_text_color(239, 68, 68)
        else:
            pdf.set_text_color(245, 158, 11)
            
        pdf.set_font('Helvetica', 'B', 12)
        pdf.text(63, stats_y + 18, scan.verdict)
        pdf.set_text_color(0, 0, 0)
        
        pdf.rect(105, stats_y, 40, 25)
        pdf.set_text_color(153, 153, 153)
        pdf.set_font('Helvetica', '', 8)
        pdf.text(108, stats_y + 8, 'RISK SCORE')
        pdf.set_font('Helvetica', 'B', 14)
        pdf.text(108, stats_y + 18, f"{scan.risk_score}/100")
        
        pdf.rect(150, stats_y, 45, 25)
        pdf.set_text_color(153, 153, 153)
        pdf.set_font('Helvetica', '', 8)
        pdf.text(153, stats_y + 8, 'CONFIDENCE')
        pdf.set_font('Helvetica', 'B', 14)
        pdf.text(153, stats_y + 18, f"{scan.confidence}%")
        
        # Analysis Breakdown
        ai_y = stats_y + 35
        pdf.set_text_color(0, 0, 0)
        pdf.set_font('Helvetica', 'B', 14)
        pdf.text(15, ai_y, 'ANALYSIS DETAILS')
        
        pdf.set_fill_color(0, 0, 0)
        pdf.rect(15, ai_y + 2, 15, 1, 'F')
        
        pdf.set_xy(15, ai_y + 10)
        pdf.set_text_color(51, 51, 51)
        pdf.set_font('Helvetica', '', 10)
        
        raw_data = json.loads(scan.raw_result or "{}")
        text_lines = []
        
        if scan.type == 'url':
            text_lines.append("URL INDICATORS:")
            indicators = raw_data.get("indicators", {}) or raw_data
            text_lines.append(f"  - Domain Age: {indicators.get('domain_age_days', 'N/A')} days")
            text_lines.append(f"  - SSL Certificate: {'Valid' if indicators.get('ssl_valid') else 'Invalid / None'}")
            text_lines.append(f"  - Server Location: {indicators.get('geolocation', 'Unknown')}")
            text_lines.append(f"  - Redirect Hops: {indicators.get('redirect_hops', 0)}")
            text_lines.append(f"  - Typosquatting Match: {indicators.get('typosquatting_match') or 'None'}")
            
            hits = indicators.get('blocklist_hits', [])
            text_lines.append(f"  - Blocklist Hits: {len(hits)} ({', '.join(hits) if hits else 'None'})")
            
            text_lines.append("")
            text_lines.append("WHOIS REGISTRY:")
            whois = raw_data.get("whois", {}) or {}
            text_lines.append(f"  - Registrar: {whois.get('registrar', 'Unknown')}")
            text_lines.append(f"  - Creation Date: {whois.get('created', 'Unknown')}")
            text_lines.append(f"  - Expiry Date: {whois.get('expires', 'Unknown')}")
            
        elif scan.type == 'email':
            text_lines.append("AUTHENTICATION CHECKS:")
            auth = raw_data.get("auth_checks", {}) or {}
            text_lines.append(f"  - SPF: {auth.get('spf', 'N/A')}")
            text_lines.append(f"  - DKIM: {auth.get('dkim', 'N/A')}")
            text_lines.append(f"  - DMARC: {auth.get('dmarc', 'N/A')}")
            
            text_lines.append("")
            text_lines.append("SENDER ANALYSIS:")
            sender = raw_data.get("sender_analysis", {}) or {}
            text_lines.append(f"  - From: {sender.get('from_address', 'Unknown')}")
            text_lines.append(f"  - Domain: {sender.get('domain', 'Unknown')}")
            text_lines.append(f"  - Trusted Sender: {'Yes' if sender.get('is_trusted') else 'No / Unknown'}")
            
            text_lines.append("")
            text_lines.append("LINK ANALYSIS:")
            links = raw_data.get("link_analysis", {}) or {}
            text_lines.append(f"  - Total Links: {links.get('total_links', 0)}")
            text_lines.append(f"  - Suspicious Links: {links.get('suspicious_links', 0)}")
            
        elif scan.type in ['image', 'steganography']:
            text_lines.append("FILE INFORMATION:")
            info = raw_data.get("file_info", {}) or {}
            text_lines.append(f"  - Size: {info.get('size_bytes', 0)} bytes")
            text_lines.append(f"  - Format: {info.get('format', 'Unknown')}")
            
            text_lines.append("")
            text_lines.append("STEGANOGRAPHY ANALYSIS:")
            analysis = raw_data.get("analysis", {}) or {}
            text_lines.append(f"  - Hidden Data Detected: {'Yes' if analysis.get('hidden_data_detected') else 'No'}")
            text_lines.append(f"  - Encryption Suspected: {'Yes' if analysis.get('encryption_suspected') else 'No'}")

        # Recommendations
        recs = raw_data.get("recommendations", [])
        if recs:
            text_lines.append("")
            text_lines.append("RECOMMENDED ACTIONS:")
            for r in recs:
                text_lines.append(f"  - {r}")

        descriptive_text = "\n".join(text_lines)
        clean_text = descriptive_text.encode('latin-1', 'ignore').decode('latin-1')
        pdf.multi_cell(180, 6, clean_text)

        
        pdf_string = pdf.output(dest='S')
        pdf_bytes = pdf_string.encode('latin1') if isinstance(pdf_string, str) else pdf_string
        return pdf_bytes
