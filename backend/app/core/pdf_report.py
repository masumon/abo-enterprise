"""Shared tabular PDF report generator for admin exports.

Mirrors the CSV exports (orders / leads / bookings / products) as clean,
branded, landscape A4 PDF tables.

Rendered with fpdf2 + HarfBuzz text shaping and the bundled FreeSans font —
the same stack as the invoice — so Bangla names/addresses and the ৳ sign
print correctly (reportlab's Helvetica showed them as empty boxes).
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

BRAND = (29, 78, 216)
BRAND_DARK = (30, 58, 138)
ROW_ALT = (243, 246, 253)
GRID = (219, 227, 240)
MUTED = (107, 114, 128)

_FONTS_DIR = Path(__file__).resolve().parents[2] / "assets" / "fonts"


def build_table_report(
    title: str,
    headers: list[str],
    rows: list[list[str]],
    *,
    subtitle: str | None = None,
    col_widths: list[float] | None = None,
) -> bytes:
    """Render a branded landscape-A4 PDF table and return the bytes."""
    from fpdf import FPDF
    from fpdf.fonts import FontFace

    pdf = FPDF(orientation="L", unit="pt", format="A4")
    margin = 34.0
    pdf.set_margins(margin, 40.0, margin)
    pdf.set_auto_page_break(True, margin=34.0)
    pdf.set_title(title)
    pdf.set_author("ABO Enterprise")

    regular, bold = _FONTS_DIR / "FreeSans.ttf", _FONTS_DIR / "FreeSansBold.ttf"
    if regular.is_file() and bold.is_file():
        pdf.add_font("rpt", "", str(regular))
        pdf.add_font("rpt", "B", str(bold))
        # FreeSansBold has no Bengali glyphs or ৳ — borrow them from regular.
        pdf.add_font("rptbn", "", str(regular))
        pdf.set_fallback_fonts(["rptbn"], exact_match=False)
        pdf.set_text_shaping(True)
        font = "rpt"
    else:  # pragma: no cover — fonts ship in the repo
        font = "helvetica"

    pdf.add_page()
    generated = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")
    meta = subtitle or f"{len(rows)} records"

    pdf.set_font(font, "B", 9)
    pdf.set_text_color(*BRAND)
    pdf.cell(0, 12, "ABO Enterprise", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font(font, "B", 15)
    pdf.set_text_color(*BRAND_DARK)
    pdf.cell(0, 20, title, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font(font, "", 8.5)
    pdf.set_text_color(*MUTED)
    pdf.cell(0, 12, f"{meta} · Generated {generated}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    usable = pdf.w - 2 * margin
    n = max(1, len(headers))
    widths = [usable * w for w in col_widths] if col_widths else [usable / n] * n

    pdf.set_text_color(0, 0, 0)
    pdf.set_font(font, "", 7.5)
    pdf.set_draw_color(*GRID)
    pdf.set_line_width(0.4)
    with pdf.table(
        col_widths=tuple(widths),
        headings_style=FontFace(emphasis="BOLD", color=(255, 255, 255), fill_color=BRAND, size_pt=8),
        cell_fill_color=ROW_ALT,
        cell_fill_mode="ROWS",
        line_height=10,
        padding=3.5,
        text_align="LEFT",
        repeat_headings=1,
        first_row_as_headings=True,
    ) as table:
        head = table.row()
        for h in headers:
            head.cell(str(h))
        for r in rows:
            row = table.row()
            for c in r:
                row.cell("" if c is None else str(c))
    return bytes(pdf.output())
