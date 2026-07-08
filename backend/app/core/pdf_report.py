"""Shared tabular PDF report generator for admin exports.

Mirrors the CSV exports (orders / leads / bookings / products) as clean,
branded, landscape A4 PDF tables. Uses the same reportlab dependency the
invoice generator already ships with — no new packages.
"""
from __future__ import annotations

import io
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

BRAND = colors.HexColor("#1d4ed8")
BRAND_DARK = colors.HexColor("#1e3a8a")
ROW_ALT = colors.HexColor("#f3f6fd")
GRID = colors.HexColor("#dbe3f0")
MUTED = colors.HexColor("#6b7280")

_title_style = ParagraphStyle("rpt-title", fontName="Helvetica-Bold", fontSize=15, textColor=BRAND_DARK)
_sub_style = ParagraphStyle("rpt-sub", fontName="Helvetica", fontSize=8.5, textColor=MUTED)
_cell_style = ParagraphStyle("rpt-cell", fontName="Helvetica", fontSize=7.5, leading=9.5)
_head_style = ParagraphStyle("rpt-head", fontName="Helvetica-Bold", fontSize=8, textColor=colors.white, leading=10)


def _cell(text: str) -> Paragraph:
    safe = (text or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return Paragraph(safe, _cell_style)


def build_table_report(
    title: str,
    headers: list[str],
    rows: list[list[str]],
    *,
    subtitle: str | None = None,
    col_widths: list[float] | None = None,
) -> bytes:
    """Render a branded landscape-A4 PDF table and return the bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(A4),
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=14 * mm,
        bottomMargin=12 * mm,
        title=title,
        author="ABO Enterprise",
    )

    generated = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")
    meta = subtitle or f"{len(rows)} records"
    story = [
        Paragraph("ABO Enterprise", ParagraphStyle("brand", fontName="Helvetica-Bold", fontSize=9, textColor=BRAND)),
        Spacer(1, 2),
        Paragraph(title, _title_style),
        Spacer(1, 2),
        Paragraph(f"{meta} · Generated {generated}", _sub_style),
        Spacer(1, 8),
    ]

    data = [[Paragraph(h, _head_style) for h in headers]]
    for r in rows:
        data.append([_cell(str(c)) for c in r])

    usable = doc.width
    widths = [usable * w for w in col_widths] if col_widths else [usable / len(headers)] * len(headers)

    table = Table(data, colWidths=widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ROW_ALT]),
        ("GRID", (0, 0), (-1, -1), 0.4, GRID),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
    ]))
    story.append(table)
    doc.build(story)
    return buf.getvalue()
