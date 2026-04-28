import json
import math
import os
import re
import shutil
from collections import Counter
from datetime import datetime
from io import BytesIO
from typing import Any, Dict, Iterable, List, Optional, Tuple

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Wedge
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    Flowable,
)


def _safe_float(value: Any, fallback: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _safe_int(value: Any, fallback: int = 0) -> int:
    try:
        return int(round(float(value)))
    except (TypeError, ValueError):
        return fallback


def _safe_text(value: Any, fallback: str = "N/A") -> str:
    if value is None:
        return fallback
    text = str(value).strip()
    return text or fallback


def _fmt_dt(value: Any) -> str:
    if not value:
        return "N/A"
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M UTC")
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed.strftime("%Y-%m-%d %H:%M UTC")
    except ValueError:
        return _safe_text(value)


def _fmt_pct(value: float) -> str:
    return f"{round(value, 1)}%"


def clear_cached_reports():
    """Delete all cached PDF reports in the exports/reports directory."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    export_dir = os.path.join(base_dir, "exports", "reports")
    if os.path.exists(export_dir):
        for filename in os.listdir(export_dir):
            file_path = os.path.join(export_dir, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            except Exception as e:
                print(f'Failed to delete {file_path}. Reason: {e}')


class ReportPDFRenderer:
    COLORS = {
        "bg": colors.HexColor("#F4F7FB"),
        "ink": colors.HexColor("#0F172A"),
        "muted": colors.HexColor("#475569"),
        "line": colors.HexColor("#CBD5E1"),
        "panel": colors.white,
        "blue": colors.HexColor("#2563EB"),
        "cyan": colors.HexColor("#0891B2"),
        "green": colors.HexColor("#16A34A"),
        "amber": colors.HexColor("#D97706"),
        "red": colors.HexColor("#DC2626"),
        "violet": colors.HexColor("#7C3AED"),
        "slate": colors.HexColor("#334155"),
    }

    VERDICT_COLORS = {
        "SAFE": colors.HexColor("#16A34A"),
        "PHISHING": colors.HexColor("#DC2626"),
        "STEGO_DETECTED": colors.HexColor("#7C3AED"),
        "SUSPICIOUS": colors.HexColor("#D97706"),
    }

    AI_SECTION_META = [
        ("FORENSIC SUMMARY", "1", colors.HexColor("#2563EB")),
        ("EVIDENCE PRESERVATION & ARTIFACTS", "2", colors.HexColor("#0891B2")),
        ("TACTICS, TECHNIQUES, AND PROCEDURES (TTPS)", "3", colors.HexColor("#7C3AED")),
        ("CHAIN OF CUSTODY & INCIDENT TIMELINE", "4", colors.HexColor("#D97706")),
        ("REMEDIATION & MITIGATION PROTOCOLS", "5", colors.HexColor("#DC2626")),
    ]

    MITRE_MAP = {
        "phishing": ("T1566", "Phishing"),
        "email": ("T1566.001", "Spearphishing Attachment"),
        "url": ("T1566.002", "Spearphishing Link"),
        "stego": ("T1027", "Obfuscated/Compressed Files and Information"),
        "steganography": ("T1027.003", "Steganography"),
        "credential": ("T1110", "Brute Force / Credential Abuse"),
        "spoof": ("T1586", "Compromise Accounts / Identity Abuse"),
        "redirect": ("T1204", "User Execution"),
    }

    def __init__(self) -> None:
        self.styles = self._build_styles()
        self.report_type = "INDIVIDUAL SCAN REPORT"

    def _build_styles(self) -> Dict[str, ParagraphStyle]:
        base = getSampleStyleSheet()
        return {
            "title": ParagraphStyle(
                "Title",
                parent=base["Heading1"],
                fontName="Helvetica-Bold",
                fontSize=22,
                textColor=self.COLORS["ink"],
                leading=26,
                spaceAfter=6,
            ),
            "subtitle": ParagraphStyle(
                "Subtitle",
                parent=base["BodyText"],
                fontName="Helvetica",
                fontSize=10,
                textColor=self.COLORS["muted"],
                leading=14,
            ),
            "section": ParagraphStyle(
                "Section",
                parent=base["Heading2"],
                fontName="Helvetica-Bold",
                fontSize=13,
                textColor=self.COLORS["ink"],
                leading=16,
                spaceAfter=4,
            ),
            "body": ParagraphStyle(
                "Body",
                parent=base["BodyText"],
                fontName="Helvetica",
                fontSize=9,
                textColor=self.COLORS["ink"],
                leading=13,
            ),
            "small": ParagraphStyle(
                "Small",
                parent=base["BodyText"],
                fontName="Helvetica",
                fontSize=8,
                textColor=self.COLORS["muted"],
                leading=11,
            ),
            "mono": ParagraphStyle(
                "Mono",
                parent=base["BodyText"],
                fontName="Courier",
                fontSize=8,
                textColor=self.COLORS["ink"],
                leading=10,
            ),
            "centerSmall": ParagraphStyle(
                "CenterSmall",
                parent=base["BodyText"],
                fontName="Helvetica",
                fontSize=8,
                textColor=self.COLORS["muted"],
                alignment=TA_CENTER,
            ),
            "rightSmall": ParagraphStyle(
                "RightSmall",
                parent=base["BodyText"],
                fontName="Helvetica",
                fontSize=8,
                textColor=self.COLORS["muted"],
                alignment=TA_RIGHT,
            ),
        }

    # Helper drawing functions for modular layout
    def draw_section_header(self, title: str, border_color: colors.Color = None) -> Table:
        """Draw a section header with optional left border."""
        para = Paragraph(title, self.styles["section"])
        tbl = Table([[para]], colWidths=[174 * mm])
        style = [
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#E2E8F0")),
            ("LINEBELOW", (0, 0), (-1, -1), 1.4, self.COLORS["blue"]),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]
        if border_color:
            style.append(("LINEBEFORE", (0, 0), (0, -1), 3, border_color))
        tbl.setStyle(TableStyle(style))
        return tbl

    def draw_badge(self, text: str, bg_color: colors.Color) -> Table:
        """Draw a small rounded badge with white text."""
        badge = Table(
            [[Paragraph(f"<font color='white'><b>{_safe_text(text)}</b></font>", self.styles["centerSmall"])]],
            colWidths=[30 * mm],
        )
        badge.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), bg_color),
                    ("BOX", (0, 0), (-1, -1), 0, bg_color),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ]
            )
        )
        return badge

    def draw_stat_card(self, label: str, value: str, accent_color: colors.Color, fill: bool = False) -> Table:
        """Render a single stat card with a colored top accent or full fill."""
        text_color = colors.white if fill else self.COLORS["ink"]
        val_style = ParagraphStyle(
            "CardVal",
            parent=self.styles["section"],
            textColor=text_color,
            alignment=TA_LEFT
        )
        lbl_style = ParagraphStyle(
            "CardLbl",
            parent=self.styles["small"],
            textColor=colors.white if fill else self.COLORS["muted"],
            alignment=TA_LEFT
        )
        
        card = Table(
            [
                [Paragraph(label, lbl_style)],
                [Paragraph(f"<b>{_safe_text(value)}</b>", val_style)],
            ],
            colWidths=[34 * mm],
        )
        style = [
            ("BACKGROUND", (0, 0), (-1, -1), accent_color if fill else self.COLORS["panel"]),
            ("BOX", (0, 0), (-1, -1), 0.8, self.COLORS["line"]),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]
        if not fill:
            style.append(("LINEABOVE", (0, 0), (-1, 0), 3, accent_color))
        
        card.setStyle(TableStyle(style))
        return card

    def build_ai_report(self, report: Any, scans: List[Any]) -> bytes:
        self.report_type = "SECURITY ANALYSIS REPORT"
        title = "Security Analysis Report"
        meta = {
            "report_id": f"RPT-{report.id:05d}",
            "generated_at": _fmt_dt(datetime.utcnow()),
            "analysis_period": f"{_fmt_dt(report.time_range_start)} to {_fmt_dt(report.time_range_end)}",
            "classification": self._classification_tag(report.malicious_count, report.total_flows),
            "watermark": "Generated by AI-Shield",
        }
        summary = self._build_ai_summary(report, scans)
        sections = self._parse_ai_sections(report.ai_raw_content or "")
        iocs = self._build_ioc_rows(scans)
        trend_chart = self._timeline_chart(json.loads(report.timeline_json or "[]"))
        attack_chart = self._attack_breakdown_chart(scans)
        story: List[Any] = []

        story.extend(self._hero_block(title, meta, summary["verdict"], summary["threat_level"]))
        story.extend(self._stat_cards(summary["cards"], cols=5))
        story.extend(self._chart_row(trend_chart, attack_chart))
        story.extend(self._forensic_analysis_block(sections, summary["mitre_lines"], summary["ioc_tokens"]))
        story.extend(self._ioc_table(iocs))
        story.extend(self._remediation_block(summary["remediation"]))

        return self._build_document(story, title, meta)

    def build_scan_report(self, scan: Any) -> bytes:
        self.report_type = "INDIVIDUAL SCAN REPORT"
        raw = json.loads(scan.raw_result or "{}")
        title = "Individual Scan Report"
        meta = {
            "report_id": f"SCAN-{scan.scan_id}",
            "generated_at": _fmt_dt(datetime.utcnow()),
            "analysis_period": _fmt_dt(scan.created_at),
            "classification": self._classification_tag(1 if scan.verdict != "SAFE" else 0, 1),
            "watermark": "Generated by AI-Shield",
        }
        gauge = self._risk_gauge_chart(_safe_float(scan.risk_score))
        indicator_rows, metadata_rows = self._scan_detail_rows(scan, raw)
        action_rows = self._scan_recommendations(scan, raw)
        verdict = self._safe_verdict(scan.verdict)

        story: List[Any] = []
        story.extend(self._hero_block(title, meta, verdict, self._scan_threat_level(scan)))
        story.extend(self._scan_identity_block(scan))
        story.extend(self._scan_visual_block(scan, gauge))
        story.extend(self._indicator_table(indicator_rows))
        story.extend(self._metadata_table(metadata_rows))
        story.extend(self._remediation_block(action_rows, title="Recommended Actions"))

        return self._build_document(story, title, meta)

    def build_simple_scan_report(self, scan: Any) -> bytes:
        """Compact single-page report."""
        meta = {
            "report_id": f"SCAN-{scan.scan_id}",
            "generated_at": _fmt_dt(datetime.utcnow()),
            "analysis_period": _fmt_dt(scan.created_at),
            "classification": self._classification_tag(1 if scan.verdict != "SAFE" else 0, 1),
            "watermark": "Generated by AI-Shield",
        }
        story: List[Any] = []
        story.append(self.draw_section_header("Scan Identity", self.COLORS["blue"]))
        verdict = self._safe_verdict(scan.verdict)
        identity_rows = [
            [Paragraph("Scan ID", self.styles["small"]), Paragraph(_safe_text(scan.scan_id), self.styles["mono"])],
            [Paragraph("Target", self.styles["small"]), Paragraph(_safe_text(scan.target), self.styles["body"])],
            [Paragraph("Type", self.styles["small"]), self._pill(_safe_text(scan.type).upper(), self.COLORS["blue"])],
            [Paragraph("Verdict", self.styles["small"]), self._pill(verdict, self.VERDICT_COLORS.get(verdict, self.COLORS["slate"]))],
            [Paragraph("Risk Score", self.styles["small"]), Paragraph(str(_safe_int(scan.risk_score)), self.styles["body"])],
        ]
        ident_tbl = Table(identity_rows, colWidths=[40 * mm, 120 * mm])
        ident_tbl.setStyle(self._table_style())
        story.append(ident_tbl)
        story.append(Spacer(1, 8))
        
        threat = self._scan_threat_level(scan)
        cards = [
            self.draw_stat_card("Risk Score", str(_safe_int(scan.risk_score)), self.COLORS["amber"]),
            self.draw_stat_card("Verdict", verdict, self.VERDICT_COLORS.get(verdict, self.COLORS["slate"])),
            self.draw_stat_card("Threat", threat, self._threat_color(threat)),
        ]
        cards_tbl = Table([cards], colWidths=[58 * mm] * len(cards))
        cards_tbl.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
        story.append(cards_tbl)
        story.append(Spacer(1, 12))
        return self._build_document(story, "Individual Scan Report", meta)

    def _build_document(self, story: List[Any], title: str, meta: Dict[str, str]) -> bytes:
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=14 * mm,
            rightMargin=14 * mm,
            topMargin=28 * mm,
            bottomMargin=18 * mm,
            title=title,
            author="AI-Shield",
        )
        doc.build(
            story,
            onFirstPage=lambda canvas, document: self._draw_page_chrome(canvas, document, meta),
            onLaterPages=lambda canvas, document: self._draw_page_chrome(canvas, document, meta),
        )
        return buffer.getvalue()

    def _draw_page_chrome(self, canvas, doc, meta: Dict[str, str]) -> None:
        width, height = A4
        canvas.saveState()
        canvas.setFillColor(self.COLORS["bg"])
        canvas.rect(0, 0, width, height, fill=1, stroke=0)

        # Increased header band height to 28mm to accommodate separate subtitle and tagline
        header_h = 28 * mm
        canvas.setFillColor(self.COLORS["ink"])
        canvas.rect(0, height - header_h, width, header_h, fill=1, stroke=0)
        
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 15)
        canvas.drawString(14 * mm, height - 12 * mm, "AI-SHIELD")
        
        # Subtitle and Tagline on separate lines (Y+6 gap)
        canvas.setFont("Helvetica", 10)
        canvas.drawString(14 * mm, height - 18 * mm, self.report_type)
        canvas.setFont("Helvetica", 8)
        canvas.drawString(14 * mm, height - 24 * mm, "Threat Intelligence Reporting Suite")

        canvas.setFillColor(colors.white)
        # Move timestamp down by 8mm below the badge bottom edge
        # Badge bottom is at height - 15.5mm (drawn later), so timestamp at height - 23.5mm
        canvas.drawRightString(width - 14 * mm, height - 23.5 * mm, meta["generated_at"])

        classification = meta["classification"]
        if "CONFIDENTIAL" in classification:
            tag_color = self.COLORS["red"]
        elif "TLP:AMBER" in classification:
            tag_color = self.COLORS["amber"]
        else:
            tag_color = self.COLORS["blue"]

        # Classification badge
        canvas.setFillColor(tag_color)
        canvas.roundRect(width - 56 * mm, height - 15.5 * mm, 42 * mm, 8 * mm, 2 * mm, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 8)
        canvas.drawCentredString(width - 35 * mm, height - 11.5 * mm, classification)

        canvas.setStrokeColor(self.COLORS["line"])
        canvas.line(14 * mm, 15 * mm, width - 14 * mm, 15 * mm)
        canvas.setFillColor(self.COLORS["muted"])
        canvas.setFont("Helvetica", 7)
        canvas.drawString(14 * mm, 10.5 * mm, f"{meta['watermark']} | {meta['report_id']}")
        canvas.drawRightString(width - 14 * mm, 10.5 * mm, f"Page {doc.page}")

        canvas.setFillColor(colors.HexColor("#DDE7F5"))
        canvas.setFont("Helvetica-Bold", 28)
        canvas.saveState()
        canvas.translate(width - 20 * mm, height / 2)
        canvas.rotate(90)
        canvas.drawCentredString(0, 0, "AI-SHIELD")
        canvas.restoreState()
        canvas.restoreState()

    def _hero_block(self, title: str, meta: Dict[str, str], verdict: str, threat_level: str) -> List[Any]:
        badge_color = self._threat_color(threat_level)
        verdict_color = self.VERDICT_COLORS.get(verdict, self.COLORS["slate"])
        left = [
            Paragraph(title, self.styles["title"]),
            Paragraph(
                f"<b>Report ID:</b> {meta['report_id']}<br/><b>Generated:</b> {meta['generated_at']}<br/><b>Analysis Period:</b> {meta['analysis_period']}",
                self.styles["subtitle"],
            ),
        ]
        right = [
            self._pill(f"Threat Level: {threat_level}", badge_color),
            Spacer(1, 4),
            self._pill(f"Verdict: {verdict}", verdict_color),
        ]
        table = Table([[left, right]], colWidths=[122 * mm, 52 * mm])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), self.COLORS["panel"]),
                    ("BOX", (0, 0), (-1, -1), 0.8, self.COLORS["line"]),
                    ("ROUNDEDCORNERS", [4, 4, 4, 4]),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 12),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                    ("TOPPADDING", (0, 0), (-1, -1), 12),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                ]
            )
        )
        return [table, Spacer(1, 8)]

    def _stat_cards(self, cards: List[Tuple[str, str, colors.Color]], cols: int = 5) -> List[Any]:
        rows = []
        row = []
        width = 174 * mm / cols
        for label, value, tone in cards:
            # Threat Level card gets full fill
            is_threat = label == "Threat Level"
            block = self.draw_stat_card(label, value, tone, fill=is_threat)
            row.append(block)
            if len(row) == cols:
                rows.append(row)
                row = []
        if row:
            while len(row) < cols:
                row.append("")
            rows.append(row)
        table = Table(rows, colWidths=[width] * cols, hAlign="LEFT")
        table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
        return [table, Spacer(1, 10)]

    def _chart_row(self, trend: BytesIO, attack: BytesIO) -> List[Any]:
        left = self._panel("Threat Trend Chart", Image(trend, width=108 * mm, height=58 * mm))
        right = self._panel("Attack Breakdown", Image(attack, width=64 * mm, height=58 * mm))
        table = Table([[left, right]], colWidths=[112 * mm, 62 * mm])
        table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
        return [table, Spacer(1, 10)]

    def _forensic_analysis_block(
        self,
        sections: Dict[str, List[str]],
        mitre_lines: List[str],
        ioc_tokens: List[str],
    ) -> List[Any]:
        story: List[Any] = [self._section_heading("AI Forensic Analysis")]
        for heading, number, tone in self.AI_SECTION_META:
            body = sections.get(heading) or ["No structured evidence was available for this section."]
            story.append(self._bordered_section(number, heading, body, tone))
            story.append(Spacer(1, 6 * mm)) # Added 6mm vertical rhythm spacer after body
        if ioc_tokens:
            story.append(self._section_heading("IOC Reference Box"))
            content = "<br/>".join([re.escape(x).replace("\\", "") for x in ioc_tokens[:12]])
            story.append(self._mono_box(content))
            story.append(Spacer(1, 8 * mm))
        if mitre_lines:
            # Fix MITRE ATT&CK semicolon bug by using raw string or direct replacement
            title = "MITRE ATT&CK Mapping"
            story.append(self._section_heading(title))
            story.append(self._bullet_box(mitre_lines))
            story.append(Spacer(1, 10))
        return story

    def _ioc_table(self, rows: List[List[str]]) -> List[Any]:
        story = [self._section_heading("IOC Table")]
        data = [["Target", "Type", "Verdict", "Risk Score", "Timestamp"]] + rows
        table = Table(data, colWidths=[58 * mm, 22 * mm, 28 * mm, 24 * mm, 42 * mm], repeatRows=1)
        table.setStyle(self._table_style())
        story.extend([table, Spacer(1, 10)])
        return story

    def _indicator_table(self, rows: List[List[str]]) -> List[Any]:
        story = [self._section_heading("Indicator Breakdown Table")]
        data = [["Indicator", "Observed Value", "Status"]] + rows
        table = Table(data, colWidths=[68 * mm, 76 * mm, 30 * mm], repeatRows=1)
        table.setStyle(self._table_style())
        story.extend([table, Spacer(1, 8 * mm)]) # Added 8mm vertical rhythm spacer
        return story

    def _metadata_table(self, rows: List[List[str]]) -> List[Any]:
        story = [self._section_heading("WHOIS / Metadata Block")]
        data = [["Field", "Value"]] + rows
        # Use repeatRows=1 to ensure header appears on page 2 if it splits
        table = Table(data, colWidths=[48 * mm, 126 * mm], repeatRows=1)
        table.setStyle(self._table_style())
        story.extend([table, Spacer(1, 8 * mm)]) # Added 8mm vertical rhythm spacer
        return story

    def _remediation_block(self, items: List[Tuple[str, str]], title: str = "Remediation Checklist") -> List[Any]:
        # Add a 10mm vertical spacer before starting the Recommended Actions section
        story = [Spacer(1, 10 * mm), self._section_heading(title)]
        rows = []
        for priority, text in items:
            tag = self._priority_tag(priority)
            # Checkbox column, Tag column, Action text column
            rows.append([Paragraph("&#9632;", self.styles["body"]), tag, Paragraph(_safe_text(text), self.styles["body"])])
        
        # Priority tag spacing: colWidths adjusted to fit dynamic tags
        # Column 1 (tag) set to 24mm, Column 2 (text) set to 142mm
        table = Table(rows or [["", "", Paragraph("No remediation items generated.", self.styles["body"])]], colWidths=[8 * mm, 24 * mm, 142 * mm])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), self.COLORS["panel"]),
                    ("BOX", (0, 0), (-1, -1), 0.8, self.COLORS["line"]),
                    ("INNERGRID", (0, 0), (-1, -1), 0.4, self.COLORS["line"]),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                    # Ensure the 3mm gap after tag (8mm cell padding + 3mm extra)
                    ("LEFTPADDING", (2, 0), (2, -1), 11), 
                ]
            )
        )
        story.extend([table, Spacer(1, 8 * mm)])
        return story

    def _scan_identity_block(self, scan: Any) -> List[Any]:
        verdict = self._safe_verdict(scan.verdict)
        type_color = {
            "URL": self.COLORS["blue"],
            "EMAIL": self.COLORS["violet"],
            "IMAGE": self.COLORS["cyan"],
        }.get(_safe_text(scan.type).upper(), self.COLORS["cyan"])
        rows = [
            [Paragraph("<b>Scan ID</b>", self.styles["small"]), Paragraph(_safe_text(scan.scan_id), self.styles["mono"])],
            [Paragraph("<b>Timestamp</b>", self.styles["small"]), Paragraph(_fmt_dt(scan.created_at), self.styles["body"])],
            [Paragraph("<b>Scan Type</b>", self.styles["small"]), self._pill(_safe_text(scan.type).upper(), type_color)],
            [Paragraph("<b>Target</b>", self.styles["small"]), Paragraph(_safe_text(scan.target), self.styles["body"])],
            [Paragraph("<b>Verdict</b>", self.styles["small"]), self._pill(verdict, self.VERDICT_COLORS.get(verdict, self.COLORS["slate"]))],
        ]
        # Identity block row padding: rowHeight 10mm and 3mm top padding
        table = Table(rows, colWidths=[34 * mm, 140 * mm], rowHeights=[10 * mm] * len(rows))
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
                    ("BOX", (0, 0), (-1, -1), 0.8, self.COLORS["line"]),
                    ("INNERGRID", (0, 0), (-1, -1), 0.4, self.COLORS["line"]),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 3 * mm), # Fixed 3mm top padding
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 1 * mm),
                ]
            )
        )
        return [table, Spacer(1, 8 * mm)] # Added 8mm vertical rhythm spacer

    def _scan_visual_block(self, scan: Any, gauge: BytesIO) -> List[Any]:
        verdict = self._safe_verdict(scan.verdict)
        verdict_color = self.VERDICT_COLORS.get(verdict, self.COLORS["slate"])
        
        # Gauge and verdict panel height mismatch: Set both to fixed 70mm height
        panel_h = 70 * mm
        left = self._panel("Visual Risk Gauge", Image(gauge, width=78 * mm, height=46 * mm), height=panel_h)
        
        right_body = Table(
            [
                [self._pill(verdict, verdict_color)],
                [Paragraph(f"<b>{self._scan_threat_level(scan)}</b>", self.styles["section"])],
                [Paragraph(f"Confidence: {_fmt_pct(_safe_float(scan.confidence))}<br/>Risk Score: {_safe_int(scan.risk_score)}/100", self.styles["body"])],
            ],
            colWidths=[82 * mm],
        )
        # Vertically center contents within the fixed height
        right_body.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
        right = self._panel("Verdict Badge", right_body, height=panel_h)
        
        row = Table([[left, right]], colWidths=[88 * mm, 86 * mm])
        row.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
        return [row, Spacer(1, 8 * mm)] # Added 8mm vertical rhythm spacer

    def _panel(self, title: str, body: Any, height: float = None) -> Table:
        title_para = Paragraph(title, self.styles["section"])
        content = Table([[title_para], [Spacer(1, 2)], [body]], colWidths=["*"], rowHeights=[None, None, height - 12 * mm if height else None])
        content.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), self.COLORS["panel"]),
                    ("BOX", (0, 0), (-1, -1), 0.8, self.COLORS["line"]),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("VALIGN", (0, 2), (0, 2), "MIDDLE"), # Center body vertically if height is fixed
                ]
            )
        )
        return content

    def _section_heading(self, text: str) -> Table:
        table = Table([[Paragraph(text, self.styles["section"])]], colWidths=[174 * mm])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#E2E8F0")),
                    ("LINEBELOW", (0, 0), (-1, -1), 1.4, self.COLORS["blue"]),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        return table

    def _bordered_section(self, number: str, title: str, lines: List[str], tone: colors.Color) -> Table:
        header = Paragraph(f"<b>{number}. {title}</b>", self.styles["body"])
        content = Paragraph("<br/>".join([_safe_text(line) for line in lines]), self.styles["body"])
        table = Table([[header], [content]], colWidths=[174 * mm])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), self.COLORS["panel"]),
                    ("LINEBEFORE", (0, 0), (0, -1), 4, tone),
                    ("BOX", (0, 0), (-1, -1), 0.8, self.COLORS["line"]),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        return table

    def _mono_box(self, content: str) -> Table:
        table = Table([[Paragraph(content, self.styles["mono"])]], colWidths=[174 * mm])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#E2E8F0")),
                    ("BOX", (0, 0), (-1, -1), 0.8, self.COLORS["line"]),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        return table

    def _bullet_box(self, lines: List[str]) -> Table:
        text = "<br/>".join([f"&bull; {_safe_text(line)}" for line in lines])
        table = Table([[Paragraph(text, self.styles["body"])]], colWidths=[174 * mm])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), self.COLORS["panel"]),
                    ("BOX", (0, 0), (-1, -1), 0.8, self.COLORS["line"]),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        return table

    def _table_style(self) -> TableStyle:
        return TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), self.COLORS["ink"]),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BACKGROUND", (0, 1), (-1, -1), self.COLORS["panel"]),
                ("BOX", (0, 0), (-1, -1), 0.8, self.COLORS["line"]),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, self.COLORS["line"]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )

    def _pill(self, text: str, color: colors.Color, width: float = 40 * mm) -> Table:
        table = Table([[Paragraph(f"<font color='white'><b>{_safe_text(text)}</b></font>", self.styles["centerSmall"])]], colWidths=[width])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), color),
                    ("BOX", (0, 0), (-1, -1), 0, color),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ]
            )
        )
        return table

    def _priority_tag(self, priority: str) -> Table:
        from reportlab.pdfbase.pdfmetrics import stringWidth
        tone = {
            "CRITICAL": self.COLORS["red"],
            "HIGH": self.COLORS["amber"],
            "MEDIUM": self.COLORS["blue"],
            "LOW": self.COLORS["green"],
        }.get(priority, self.COLORS["slate"])
        
        tag_text = f"[{priority}]"
        # Calculate width dynamically + 4mm padding
        w = stringWidth(tag_text, "Helvetica-Bold", 8) + 4 * mm
        return self._pill(tag_text, tone, width=w)

    def _classification_tag(self, malicious_count: int, total_flows: int) -> str:
        ratio = (malicious_count / total_flows) if total_flows else 0
        if malicious_count >= 10 or ratio > 0.4:
            return "CONFIDENTIAL | TLP:AMBER"
        if malicious_count >= 1:
            return "SENSITIVE | TLP:GREEN"
        return "INTERNAL | TLP:CLEAR"

    def _threat_color(self, threat_level: str) -> colors.Color:
        return {
            "LOW": self.COLORS["green"],
            "MEDIUM": self.COLORS["blue"],
            "HIGH": self.COLORS["amber"],
            "CRITICAL": self.COLORS["red"],
        }.get(threat_level, self.COLORS["slate"])

    def _safe_verdict(self, verdict: Any) -> str:
        return _safe_text(verdict, "UNKNOWN").upper()

    def _build_ai_summary(self, report: Any, scans: List[Any]) -> Dict[str, Any]:
        malicious_ratio = (report.malicious_count / report.total_flows) if report.total_flows else 0
        if report.malicious_count >= 10 or malicious_ratio >= 0.5:
            threat_level = "CRITICAL"
        elif report.malicious_count >= 5 or malicious_ratio >= 0.3:
            threat_level = "HIGH"
        elif report.malicious_count >= 1 or malicious_ratio >= 0.1:
            threat_level = "MEDIUM"
        else:
            threat_level = "LOW"
        verdict = "SAFE" if report.malicious_count == 0 else ("SUSPICIOUS" if threat_level == "MEDIUM" else "PHISHING")
        counter = Counter(scan.type for scan in scans if scan.verdict != "SAFE")
        top_vector = report.top_attack_type if _safe_text(report.top_attack_type, "") != "None Detected" else "None"
        cards = [
            ("Total Scans", str(report.total_flows), self.COLORS["blue"]),
            ("Malicious", str(report.malicious_count), self.COLORS["red"]),
            ("Blocked", str(report.blocked_count), self.COLORS["amber"]),
            ("Top Vector", _safe_text(top_vector).upper(), self.COLORS["violet"]),
            ("Threat Level", threat_level, self._threat_color(threat_level)),
        ]
        mitre_lines = self._mitre_lines(scans, report.ai_raw_content or "")
        ioc_tokens = self._extract_ioc_tokens(scans, report.ai_raw_content or "")
        remediation = self._ai_recommendations(threat_level, counter, scans)
        return {
            "cards": cards,
            "threat_level": threat_level,
            "verdict": verdict,
            "mitre_lines": mitre_lines,
            "ioc_tokens": ioc_tokens,
            "remediation": remediation,
        }

    def _scan_threat_level(self, scan: Any) -> str:
        risk = _safe_float(scan.risk_score)
        if risk >= 85:
            return "CRITICAL"
        if risk >= 65:
            return "HIGH"
        if risk >= 35:
            return "MEDIUM"
        return "LOW"

    def _parse_ai_sections(self, text: str) -> Dict[str, List[str]]:
        normalized = text.replace("\r\n", "\n")
        headers = [meta[0] for meta in self.AI_SECTION_META]
        aliases = {
            "TACTICS, TECHNIQUES, AND PROCEDURES": "TACTICS, TECHNIQUES, AND PROCEDURES (TTPS)",
            "TACTICS, TECHNIQUES, AND PROCEDURES (TTPS)": "TACTICS, TECHNIQUES, AND PROCEDURES (TTPS)",
        }
        pattern = re.compile(
            r"(?im)^(?:\d+\.\s*)?(FORENSIC SUMMARY|EVIDENCE PRESERVATION\s*&\s*ARTIFACTS|TACTICS,\s*TECHNIQUES,\s*AND\s*PROCEDURES(?:\s*\(TTPS?\))?|CHAIN OF CUSTODY\s*&\s*INCIDENT TIMELINE|REMEDIATION\s*&\s*MITIGATION PROTOCOLS)\s*:?\s*$"
        )
        matches = list(pattern.finditer(normalized))
        result: Dict[str, List[str]] = {header: [] for header in headers}
        if not matches:
            result[headers[0]] = [line.strip() for line in normalized.splitlines() if line.strip()] or ["AI analysis unavailable."]
            return result
        for idx, match in enumerate(matches):
            key = re.sub(r"\s+", " ", match.group(1).upper().replace("&", "&")).strip()
            canonical = aliases.get(key, key)
            start = match.end()
            end = matches[idx + 1].start() if idx + 1 < len(matches) else len(normalized)
            lines = [line.strip("- ").strip() for line in normalized[start:end].splitlines() if line.strip()]
            result.setdefault(canonical, []).extend(lines)
        return result

    def _extract_ioc_tokens(self, scans: List[Any], text: str) -> List[str]:
        tokens = []
        seen = set()
        for scan in scans:
            # Filter IOC list to only entries containing a . (domains/URLs) and skip scan IDs (SC-)
            for candidate in [scan.target]:
                token = _safe_text(candidate, "")
                if token and "." in token and not token.startswith("SC-") and token not in seen:
                    seen.add(token)
                    tokens.append(token)
        for candidate in re.findall(r"\b(?:[a-zA-Z0-9.-]+\.[a-z]{2,}|(?:\d{1,3}\.){3}\d{1,3})\b", text):
            if candidate not in seen:
                seen.add(candidate)
                tokens.append(candidate)
        return tokens[:16]

    def _mitre_lines(self, scans: List[Any], text: str) -> List[str]:
        corpus = " ".join([_safe_text(scan.type, "") for scan in scans]) + " " + text.lower()
        found = []
        for token, mapping in self.MITRE_MAP.items():
            if token in corpus.lower():
                code, label = mapping
                line = f"{code} - {label}"
                if line not in found:
                    found.append(line)
        return found[:6]

    def _build_ioc_rows(self, scans: List[Any]) -> List[List[str]]:
        rows = []
        # Filter only scans where verdict != 'SAFE'
        for scan in [s for s in scans if s.verdict != "SAFE"][:12]:
            rows.append(
                [
                    _safe_text(scan.target),
                    _safe_text(scan.type).upper(),
                    self._safe_verdict(scan.verdict),
                    f"{_safe_int(scan.risk_score)}/100",
                    _fmt_dt(scan.created_at),
                ]
            )
        return rows or [["No malicious indicators captured", "-", "-", "-", "-"]]

    def _timeline_chart(self, timeline: List[Dict[str, Any]]) -> BytesIO:
        labels = []
        values = []
        for point in timeline[-12:]:
            # Format labels as HH:MM only
            if point.get("hour"):
                try:
                    dt = datetime.fromisoformat(point["hour"].replace("Z", "+00:00"))
                    labels.append(dt.strftime("%H:%M"))
                except:
                    labels.append("N/A")
            else:
                labels.append("N/A")
            values.append(_safe_int(point.get("maliciousFlows")))
        if not labels:
            labels = ["No Data"]
            values = [0]
        fig, ax = plt.subplots(figsize=(7, 2.8), dpi=160)
        ax.set_facecolor("#FFFFFF")
        ax.plot(labels, values, color="#2563EB", marker="o", linewidth=2)
        ax.fill_between(labels, values, color="#BFDBFE", alpha=0.45)
        ax.set_title("Threat Activity Over Time", fontsize=10, loc="left")
        ax.set_xlabel("Time Window", fontsize=8)
        ax.set_ylabel("Threat Count", fontsize=8)
        ax.tick_params(axis="x", labelrotation=0, labelsize=7) # Rotation 0 as requested
        ax.tick_params(axis="y", labelsize=7)
        ax.grid(alpha=0.2)
        if values and max(values) > 0:
            peak = max(values)
            peak_idx = values.index(peak)
            ax.annotate("Spike", (labels[peak_idx], peak), textcoords="offset points", xytext=(0, 10), ha="center", fontsize=7, color="#DC2626")
        buf = BytesIO()
        fig.tight_layout()
        fig.savefig(buf, format="png", bbox_inches="tight", facecolor="white")
        plt.close(fig)
        buf.seek(0)
        return buf

    def _attack_breakdown_chart(self, scans: List[Any]) -> BytesIO:
        from matplotlib.ticker import MaxNLocator
        counts = Counter(scan.type.upper() for scan in scans if scan.verdict != "SAFE")
        if not counts:
            counts = Counter({"NONE": 1})
        labels = list(counts.keys())
        values = list(counts.values())
        fig, ax = plt.subplots(figsize=(4.2, 2.8), dpi=160)
        palette = ["#2563EB", "#DC2626", "#7C3AED", "#D97706"]
        ax.bar(labels, values, color=palette[: len(values)])
        total = sum(values) or 1
        for idx, value in enumerate(values):
            ax.text(idx, value + 0.05, f"{value} ({round(value/total*100)}%)", ha="center", fontsize=7)
        ax.set_ylabel("Count", fontsize=8)
        ax.set_title("Attack Type Distribution", fontsize=10, loc="left")
        ax.tick_params(axis="both", labelsize=7)
        ax.yaxis.set_major_locator(MaxNLocator(integer=True)) # Force integer ticks
        ax.grid(axis="y", alpha=0.2)
        buf = BytesIO()
        fig.tight_layout()
        fig.savefig(buf, format="png", bbox_inches="tight", facecolor="white")
        plt.close(fig)
        buf.seek(0)
        return buf

    def _risk_gauge_chart(self, risk_score: float) -> BytesIO:
        fig, ax = plt.subplots(figsize=(4.2, 2.4), dpi=180)
        ax.set_aspect("equal")
        bands = [
            (180, 120, "#16A34A"),
            (120, 60, "#D97706"),
            (60, 0, "#DC2626"),
        ]
        for start, end, tone in bands:
            ax.add_patch(Wedge((0, 0), 1.0, end, start, width=0.22, facecolor=tone, edgecolor="white"))
        angle = 180 - (max(0, min(risk_score, 100)) / 100.0) * 180
        x = 0.78 * math.cos(math.radians(angle))
        y = 0.78 * math.sin(math.radians(angle))
        ax.plot([0, x], [0, y], color="#0F172A", linewidth=2.5)
        ax.scatter([0], [0], s=25, color="#0F172A")
        ax.text(0, -0.1, str(_safe_int(risk_score)), ha="center", va="center", fontsize=16, fontweight="bold", color="#0F172A")
        ax.text(0, -0.32, "Risk Score", ha="center", va="center", fontsize=8, color="#475569")
        ax.text(-1.0, -0.02, "0", fontsize=7, color="#475569")
        ax.text(0, 1.02, "50", fontsize=7, color="#475569", ha="center")
        ax.text(1.0, -0.02, "100", fontsize=7, color="#475569", ha="right")
        ax.axis("off")
        buf = BytesIO()
        fig.tight_layout()
        fig.savefig(buf, format="png", bbox_inches="tight", transparent=True)
        plt.close(fig)
        buf.seek(0)
        return buf

    def _ai_recommendations(self, threat_level: str, counter: Counter, scans: List[Any]) -> List[Tuple[str, str]]:
        items: List[Tuple[str, str]] = []
        if threat_level in {"CRITICAL", "HIGH"}:
            items.append(("CRITICAL", "Escalate identified indicators to incident response and preserve affected evidence artifacts immediately."))
        if counter.get("url"):
            items.append(("HIGH", "Block flagged domains and redirect destinations at the DNS, email, and web proxy layers."))
        if counter.get("email"):
            items.append(("HIGH", "Purge matching email subjects, attachments, and sender patterns from user mailboxes and secure gateways."))
        if counter.get("image") or counter.get("steganography"):
            items.append(("HIGH", "Quarantine suspicious image artifacts and scan adjacent file-transfer channels for concealed payload delivery."))
        if any(_safe_float(scan.risk_score) >= 70 for scan in scans):
            items.append(("MEDIUM", "Review high-risk detections for credential theft, spoofing, or follow-on execution paths."))
        items.append(("LOW", "Retain this report with page-numbered evidence records for audit and chain-of-custody purposes."))
        return items

    def _scan_recommendations(self, scan: Any, raw: Dict[str, Any]) -> List[Tuple[str, str]]:
        recs = raw.get("recommendations") or []
        rows: List[Tuple[str, str]] = []
        default_priority = "LOW" if self._safe_verdict(scan.verdict) == "SAFE" else "MEDIUM"
        for text in recs:
            lowered = _safe_text(text).lower()
            if any(word in lowered for word in ["immediately", "block", "quarantine", "disable"]):
                priority = "CRITICAL"
            elif any(word in lowered for word in ["report", "verify", "reset", "scan"]):
                priority = "HIGH"
            else:
                priority = default_priority
            rows.append((priority, _safe_text(text)))
        if not rows:
            verdict = self._safe_verdict(scan.verdict)
            if verdict == "SAFE":
                rows.append(("LOW", "No urgent remediation required; maintain monitoring and retain the scan artifact for records."))
            else:
                rows.append(("HIGH", "Contain the target, verify related systems, and investigate adjacent indicators associated with this scan."))
        return rows

    def _scan_detail_rows(self, scan: Any, raw: Dict[str, Any]) -> Tuple[List[List[str]], List[List[str]]]:
        scan_type = _safe_text(scan.type).lower()
        indicators: List[List[str]] = []
        metadata: List[List[str]] = []
        if scan_type == "url":
            url_data = raw.get("indicators", {}) or raw
            indicators = [
                ["SSL", "Valid" if url_data.get("ssl_valid") else "Invalid / None", "PASS" if url_data.get("ssl_valid") else "FAIL"],
                ["Domain Age", f"{url_data.get('domain_age_days', 'N/A')} days", "PASS" if _safe_int(url_data.get("domain_age_days"), 999) >= 30 else "WARN"],
                ["Redirect Hops", str(url_data.get("redirect_hops", 0)), "WARN" if _safe_int(url_data.get("redirect_hops")) > 1 else "PASS"],
                ["Blocklist Hits", ", ".join(url_data.get("blocklist_hits", []) or ["None"]), "FAIL" if url_data.get("blocklist_hits") else "PASS"],
                ["Typosquatting", _safe_text(url_data.get("typosquatting_match"), "None"), "FAIL" if url_data.get("typosquatting_match") else "PASS"],
            ]
            whois = raw.get("whois", {}) or {}
            metadata = [
                ["Registrar", _safe_text(whois.get("registrar"))],
                ["Created", _safe_text(whois.get("created"))],
                ["Expires", _safe_text(whois.get("expires"))],
                ["Geo", _safe_text(url_data.get("geolocation"))],
                ["Target", _safe_text(scan.target)],
            ]
        elif scan_type == "email":
            auth = raw.get("auth_checks", {}) or {}
            sender = raw.get("sender_analysis", {}) or {}
            links = raw.get("link_analysis", {}) or {}
            indicators = [
                ["SPF", _safe_text(auth.get("spf")), "PASS" if _safe_text(auth.get("spf"), "").upper() == "PASS" else "FAIL"],
                ["DKIM", _safe_text(auth.get("dkim")), "PASS" if _safe_text(auth.get("dkim"), "").upper() in {"PASS", "VALID"} else "FAIL"],
                ["DMARC", _safe_text(auth.get("dmarc")), "PASS" if _safe_text(auth.get("dmarc"), "").upper() not in {"NONE", "FAIL"} else "WARN"],
                ["Suspicious Links", str(links.get("suspicious_links", 0)), "FAIL" if _safe_int(links.get("suspicious_links")) else "PASS"],
                ["Spoofing", "Detected" if sender.get("spoofing_detected") else "Not detected", "FAIL" if sender.get("spoofing_detected") else "PASS"],
            ]
            metadata = [
                ["From", _safe_text(sender.get("from_address"))],
                ["Domain", _safe_text(sender.get("domain"))],
                ["Trusted Sender", "Yes" if sender.get("is_trusted") else "No / Unknown"],
                ["Total Links", str(links.get("total_links", 0))],
                ["Target", _safe_text(scan.target)],
            ]
        else:
            analysis = raw.get("analysis", {}) or {}
            file_info = raw.get("file_info", {}) or {}
            indicators = [
                ["Hidden Data", "Detected" if analysis.get("hidden_data_detected") else "Not detected", "FAIL" if analysis.get("hidden_data_detected") else "PASS"],
                ["Encryption Suspected", "Yes" if analysis.get("encryption_suspected") else "No", "WARN" if analysis.get("encryption_suspected") else "PASS"],
                ["LSB Anomaly", str(analysis.get("lsb_anomaly_score", "N/A")), "FAIL" if _safe_float(analysis.get("lsb_anomaly_score")) > 50 else "PASS"],
                ["Entropy", _safe_text(analysis.get("entropy_score")), "WARN" if _safe_float(analysis.get("entropy_score")) > 7 else "PASS"],
                ["Format", _safe_text(file_info.get("format")), "PASS"],
            ]
            metadata = [
                ["Filename", _safe_text(scan.target)],
                ["Format", _safe_text(file_info.get("format"))],
                ["Size", f"{file_info.get('size_bytes', 0)} bytes"],
                ["Payload Estimate", str(analysis.get("estimated_payload_bytes", 0))],
                ["Target", _safe_text(scan.target)],
            ]
        return indicators, metadata
