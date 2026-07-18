import uuid
from datetime import datetime, timezone
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from typing import Optional, List, Dict, Any
import random
import string
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.models import Invoice, Order, BookingV2, Booking

# Brand palette (matches frontend)
_BRAND = "#1e5ba8"
_BRAND_DARK = "#153e75"
_ACCENT = "#e91e63"
_MUTED = "#64748b"
_ROW_ALT = "#f8faff"
_BORDER = "#e2e8f0"

_COMPANY_NAME = "ABO Enterprise"
_COMPANY_TAGLINE = "ABO ENTERPRISE : Simple Solution"
_COMPANY_ADDRESS = (
    "Hazi Bahar Uddin Market, Abdullapur, Bairagibazar-3170, "
    "Beanibazar, Sylhet, Bangladesh"
)
_COMPANY_PHONE = "+880 1825 007977"
_COMPANY_EMAIL = "info.aboenterprise@gmail.com"


def _find_logo_path() -> Path | None:
    """Resolve logo.jpg from backend assets or frontend public (monorepo)."""
    here = Path(__file__).resolve()
    for candidate in (
        here.parents[2] / "assets" / "logo.jpg",
        here.parents[3] / "frontend" / "public" / "logo.jpg",
    ):
        if candidate.is_file():
            return candidate
    return None


# PDF fonts: reportlab's built-in Helvetica has no ৳ (U+09F3) glyph — it used
# to render as a dingbat box on every invoice. GNU FreeSans (GPL + font
# exception, embedding permitted) ships in assets/fonts and includes the taka
# sign. Falls back to Helvetica if the files are ever missing.
_FONT = "Helvetica"
_FONT_BOLD = "Helvetica-Bold"


def _register_pdf_fonts() -> None:
    global _FONT, _FONT_BOLD
    if _FONT == "InvoiceSans":
        return
    try:
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont

        fonts_dir = Path(__file__).resolve().parents[2] / "assets" / "fonts"
        regular = fonts_dir / "FreeSans.ttf"
        bold = fonts_dir / "FreeSansBold.ttf"
        if regular.is_file() and bold.is_file():
            pdfmetrics.registerFont(TTFont("InvoiceSans", str(regular)))
            pdfmetrics.registerFont(TTFont("InvoiceSans-Bold", str(bold)))
            pdfmetrics.registerFontFamily(
                "InvoiceSans", normal="InvoiceSans", bold="InvoiceSans-Bold",
                italic="InvoiceSans", boldItalic="InvoiceSans-Bold",
            )
            _FONT = "InvoiceSans"
            _FONT_BOLD = "InvoiceSans-Bold"
    except Exception:
        pass  # keep Helvetica fallback


def generate_invoice_number():
    """Generate unique invoice number INV-YYYY-XXXXXX (hex — collision-safe)."""
    import secrets
    year = datetime.now(timezone.utc).year
    return f"INV-{year}-{secrets.token_hex(3).upper()}"


def _fpdf_font_paths() -> tuple[str, str] | None:
    """Resolve the bundled FreeSans TTFs used for the PDF (Bengali-capable)."""
    fonts_dir = Path(__file__).resolve().parents[2] / "assets" / "fonts"
    regular = fonts_dir / "FreeSans.ttf"
    bold = fonts_dir / "FreeSansBold.ttf"
    if regular.is_file() and bold.is_file():
        return str(regular), str(bold)
    return None


def _hx(color: str) -> tuple[int, int, int]:
    color = color.lstrip("#")
    return int(color[0:2], 16), int(color[2:4], 16), int(color[4:6], 16)


def _taka(amount: float) -> str:
    return f"৳{amount:,.2f}"


def _build_invoice_pdf(invoice, company: dict, ref_label, ref_value, logo_path) -> bytes:
    """Render the branded invoice with fpdf2 + HarfBuzz text shaping.

    reportlab cannot shape complex scripts, so Bengali (matras/conjuncts) broke
    on download. fpdf2's ``set_text_shaping`` runs uharfbuzz over the bundled
    FreeSans font, so Bengali — company address, product names, notes — renders
    correctly, alongside Latin and the ৳ sign.
    """
    from fpdf import FPDF

    BRAND, BRAND_DARK = "#1e5ba8", "#153e75"
    MUTED, INK, BORDER, ROW_ALT = "#64748b", "#1e293b", "#e2e8f0", "#f8faff"
    WHITE = "#ffffff"

    W, H, M = 595.28, 841.89, 40.0
    CW = W - 2 * M

    pdf = FPDF(unit="pt", format=(W, H))
    pdf.set_auto_page_break(False)
    pdf.set_margins(M, M, M)
    pdf.add_page()

    fonts = _fpdf_font_paths()
    if fonts:
        pdf.add_font("inv", "", fonts[0])
        pdf.add_font("inv", "B", fonts[1])
        # FreeSansBold ships without Bengali glyphs, so bold Bengali (customer
        # names, headings) rendered blank. Fall back to the Bengali-capable
        # regular FreeSans for any glyph the bold face is missing; exact_match
        # off lets a bold run borrow the regular face.
        pdf.add_font("invbn", "", fonts[0])
        pdf.set_fallback_fonts(["invbn"], exact_match=False)
        base = "inv"
        pdf.set_text_shaping(True)
    else:  # pragma: no cover — bundled fonts always present in the repo
        base = "helvetica"

    def fill(c): pdf.set_fill_color(*_hx(c))
    def draw(c): pdf.set_draw_color(*_hx(c))
    def ink(c): pdf.set_text_color(*_hx(c))
    def font(style="", size=10): pdf.set_font(base, style, size)

    def line(x, y, w, h, s, style="", size=10, color=INK, align="L"):
        ink(color); font(style, size)
        pdf.set_xy(x, y)
        pdf.cell(w, h, s, align=align)

    def fit(s, width, style="", size=10):
        """Truncate a string with an ellipsis so it fits `width` points."""
        font(style, size)
        if pdf.get_string_width(s) <= width:
            return s
        while s and pdf.get_string_width(s + "…") > width:
            s = s[:-1]
        return (s + "…") if s else s

    # ── Header band ──
    band_h = 84.0
    fill(BRAND)
    pdf.rect(M, M, CW, band_h, style="F", round_corners=True, corner_radius=10)

    tx = M + 18
    if logo_path:
        try:
            pdf.image(str(logo_path), x=M + 16, y=M + (band_h - 46) / 2, w=46, h=46)
            tx = M + 16 + 46 + 12
        except Exception:  # noqa: BLE001
            tx = M + 18
    line(tx, M + 24, 260, 20, company.get("name", "ABO Enterprise"), "B", 16, WHITE)
    line(tx, M + 45, 300, 12, "ABO ENTERPRISE : Simple Solution", "", 8, "#bfdbfe")

    line(M, M + 16, CW - 18, 30, "INVOICE", "B", 26, WHITE, align="R")
    line(M, M + 49, CW - 18, 12, invoice.invoice_number, "", 9, "#dbeafe", align="R")

    status = (invoice.payment_status or "pending").upper()
    status_bg = "#059669" if status in ("PAID", "COMPLETED") else "#b45309"
    font("B", 7.5)
    chip_w = pdf.get_string_width(status) + 18
    chip_h = 16.0
    chip_x = M + CW - 18 - chip_w
    chip_y = M + 62
    fill(status_bg)
    pdf.rect(chip_x, chip_y, chip_w, chip_h, style="F", round_corners=True, corner_radius=6)
    line(chip_x, chip_y + 4, chip_w, 9, status, "B", 7.5, WHITE, align="C")

    y = M + band_h + 22

    # ── BILL TO card (left) ──
    bill_w = CW * 0.52
    pad = 14.0
    extras = [t for t in (invoice.customer_phone, invoice.customer_email) if t]
    card_h = 12 + 10 + 6 + 16 + (14 * len(extras)) + 12
    fill(ROW_ALT); draw(BORDER); pdf.set_line_width(0.75)
    pdf.rect(M, y, bill_w, card_h, style="DF", round_corners=True, corner_radius=8)
    line(M + pad, y + 12, bill_w - 2 * pad, 10, "BILL TO", "B", 7.5, MUTED)
    cy = y + 12 + 10 + 6
    line(M + pad, cy, bill_w - 2 * pad, 16, fit(invoice.customer_name or "—", bill_w - 2 * pad, "B", 11.5), "B", 11.5, INK)
    cy += 16
    for extra in extras:
        line(M + pad, cy, bill_w - 2 * pad, 14, extra, "", 10, INK)
        cy += 14

    # ── Meta rows (right) ──
    mx = M + CW * 0.56
    mw = CW * 0.44
    issued = invoice.issued_date
    issued_str = issued.strftime("%d %b %Y") if hasattr(issued, "strftime") else str(issued or "—")
    meta = [
        ("INVOICE NO", invoice.invoice_number),
        ("ISSUED", issued_str),
        ("PAYMENT", (invoice.payment_method or "—").replace("_", " ").title()),
    ]
    if ref_label and ref_value:
        meta.append((ref_label.replace("#", "").strip().upper(), str(ref_value)))
    my = y
    row_h = 30.0
    for i, (k, v) in enumerate(meta):
        line(mx, my + 8, mw * 0.42, 12, k, "B", 7.5, MUTED)
        line(mx + mw * 0.42, my + 6, mw * 0.58, 14, fit(v, mw * 0.58, "", 10), "", 10, INK, align="R")
        if i < len(meta) - 1:
            draw(BORDER); pdf.set_line_width(0.5)
            pdf.line(mx, my + row_h, mx + mw, my + row_h)
        my += row_h

    y = max(y + card_h, my) + 24

    # ── Line items table ──
    c_desc, c_qty, c_unit, c_amt = CW * 0.50, CW * 0.10, CW * 0.20, CW * 0.20
    x_desc, x_qty, x_unit, x_amt = M, M + c_desc, M + c_desc + c_qty, M + c_desc + c_qty + c_unit
    head_h = 26.0
    fill(BRAND_DARK)
    pdf.rect(M, y, CW, head_h, style="F")
    line(x_desc + 12, y + 8, c_desc - 12, 10, "DESCRIPTION", "B", 8.5, WHITE)
    line(x_qty, y + 8, c_qty - 12, 10, "QTY", "B", 8.5, WHITE, align="R")
    line(x_unit, y + 8, c_unit - 12, 10, "UNIT PRICE", "B", 8.5, WHITE, align="R")
    line(x_amt, y + 8, c_amt - 12, 10, "AMOUNT", "B", 8.5, WHITE, align="R")
    y += head_h

    ry_h = 30.0
    for idx, item in enumerate(invoice.items or []):
        price = float(item.get("price", 0) or 0)
        qty = int(item.get("quantity", 1) or 1)
        sub = float(item.get("subtotal", price * qty) or 0)
        name = str(item.get("name", ""))
        fill(WHITE if idx % 2 == 0 else ROW_ALT)
        pdf.rect(M, y, CW, ry_h, style="F")
        line(x_desc + 12, y + 9, c_desc - 16, 12, fit(name, c_desc - 24, "", 9.5), "", 9.5, INK)
        line(x_qty, y + 9, c_qty - 12, 12, str(qty), "", 9.5, INK, align="R")
        line(x_unit, y + 9, c_unit - 12, 12, _taka(price), "", 9.5, INK, align="R")
        line(x_amt, y + 9, c_amt - 12, 12, _taka(sub), "", 9.5, INK, align="R")
        draw(BORDER); pdf.set_line_width(0.5)
        pdf.line(M, y + ry_h, M + CW, y + ry_h)
        y += ry_h

    y += 14

    # ── Totals block (right ~42%) ──
    subtotal = float(invoice.subtotal or 0)
    tax = float(invoice.tax or 0)
    total = float(invoice.total or 0)
    discount = float(getattr(invoice, "discount_amount", 0) or 0)
    delivery = float(getattr(invoice, "delivery_charge", 0) or 0)
    # Legacy invoices (pre delivery_charge column) — recover the delivery gap so
    # the line still shows the right figure.
    if delivery == 0 and (total - subtotal - tax + discount) > 0.005:
        delivery = round(total - subtotal - tax + discount, 2)

    rows: list[tuple[str, str]] = [("Subtotal", _taka(subtotal))]
    if discount > 0:
        rows.append(("Discount", f"-{_taka(discount)}"))
    # Delivery is ALWAYS shown — free orders read ৳0.00 rather than hiding it.
    rows.append(("Delivery" if delivery > 0 else "Delivery (Free)", _taka(delivery)))
    if tax > 0:
        rows.append(("Tax", _taka(tax)))

    tot_w = CW * 0.42
    tot_x = M + CW - tot_w
    ly = y
    for label_txt, val in rows:
        line(tot_x, ly + 6, tot_w * 0.5, 12, label_txt, "", 10, MUTED, align="R")
        line(tot_x + tot_w * 0.5, ly + 6, tot_w * 0.5 - 12, 12, val, "", 10, INK, align="R")
        draw(BORDER); pdf.set_line_width(0.5)
        pdf.line(tot_x, ly + 26, tot_x + tot_w, ly + 26)
        ly += 26
    grand_h = 34.0
    fill(BRAND_DARK)
    pdf.rect(tot_x, ly, tot_w, grand_h, style="F", round_corners=True, corner_radius=8)
    line(tot_x, ly + 11, tot_w * 0.5, 14, "TOTAL", "B", 11.5, WHITE, align="R")
    line(tot_x + tot_w * 0.5, ly + 10, tot_w * 0.5 - 14, 16, _taka(total), "", 13, WHITE, align="R")
    y = ly + grand_h

    if invoice.notes and "legacy_booking_id:" not in (invoice.notes or ""):
        y += 14
        ink(MUTED); font("", 8)
        pdf.set_xy(M, y)
        pdf.multi_cell(CW, 11, f"Notes: {invoice.notes}", align="L")
        y = pdf.get_y()

    # ── Footer ──
    fy = max(y + 40, H - 96)
    draw(BORDER); pdf.set_line_width(0.6)
    pdf.line(M, fy, M + CW, fy)
    line(M, fy + 14, CW, 14, "Thank you for choosing ABO Enterprise!", "B", 11, BRAND_DARK, align="C")
    ink(MUTED); font("", 8)
    pdf.set_xy(M, fy + 32)
    pdf.multi_cell(CW, 12, f"{company.get('address', '')}\n{company.get('phone', '')} · {company.get('email', '')}", align="C")

    out = pdf.output()
    return bytes(out)


class InvoiceService:
    """Service for generating and managing invoices"""

    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _parse_price(value: str | None) -> float:
        if not value:
            return 0.0
        match = re.search(r"[\d,.]+", value.replace(",", ""))
        if not match:
            return 0.0
        try:
            return float(match.group())
        except ValueError:
            return 0.0

    async def get_by_booking_v2_id(self, booking_id: uuid.UUID) -> Invoice | None:
        result = await self.db.execute(
            select(Invoice).where(
                Invoice.booking_id == booking_id,
                Invoice.is_deleted == False,  # noqa: E712
            )
        )
        return result.scalar_one_or_none()

    async def get_by_legacy_booking_id(self, booking_id: uuid.UUID) -> Invoice | None:
        marker = f"legacy_booking_id:{booking_id}"
        result = await self.db.execute(
            select(Invoice).where(
                Invoice.notes.ilike(f"%{marker}%"),
                Invoice.is_deleted == False,  # noqa: E712
            )
        )
        return result.scalar_one_or_none()

    async def get_by_order_id(self, order_id: uuid.UUID) -> Invoice | None:
        result = await self.db.execute(
            select(Invoice).where(
                Invoice.order_id == order_id,
                Invoice.is_deleted == False,  # noqa: E712
            )
        )
        return result.scalar_one_or_none()

    async def mark_order_invoice_paid(self, order_id: uuid.UUID) -> None:
        """Sync invoice payment_status when order payment completes."""
        invoice = await self.get_by_order_id(order_id)
        if not invoice or invoice.payment_status == "paid":
            return
        invoice.payment_status = "paid"
        invoice.paid_date = datetime.now(timezone.utc)

    async def create_order_invoice(
        self,
        order_id: uuid.UUID,
        payment_method: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Invoice:
        """Create invoice for an order"""
        existing = await self.get_by_order_id(order_id)
        if existing:
            return existing

        result = await self.db.execute(
            select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
        )
        order = result.scalar_one_or_none()

        if not order:
            raise ValueError("Order not found")

        items = []
        for item in order.items:
            items.append({
                "name": item.product_name,
                "quantity": item.quantity,
                "price": float(item.product_price),
                "subtotal": float(item.subtotal),
            })

        # Create invoice
        invoice_number = generate_invoice_number()
        invoice = Invoice(
            invoice_number=invoice_number,
            order_id=order_id,
            customer_name=order.customer_name,
            customer_email=order.customer_email,
            customer_phone=order.customer_phone,
            items=items,
            subtotal=float(order.subtotal),
            tax=0,
            discount_amount=float(order.discount_amount or 0),
            delivery_charge=float(order.delivery_charge or 0),
            total=float(order.total),
            payment_method=payment_method or order.payment_method,
            payment_status="paid" if order.payment_status == "completed" else "pending",
            issued_date=datetime.now(timezone.utc),
            due_date=None,  # No due date for orders
            notes=notes,
        )

        self.db.add(invoice)
        await self.db.commit()
        await self.db.refresh(invoice)

        return invoice

    async def create_legacy_booking_invoice(
        self,
        booking: Booking,
        payment_method: Optional[str] = None,
    ) -> Invoice:
        """Create invoice/receipt for a legacy v1 booking."""
        existing = await self.get_by_legacy_booking_id(booking.id)
        if existing:
            return existing

        service_label = booking.service_type.replace("_", " ").title()
        if booking.service_subtype:
            service_label = f"{service_label} — {booking.service_subtype.replace('_', ' ').title()}"

        amount = self._parse_price(booking.estimated_price)
        items = [{
            "name": service_label,
            "quantity": 1,
            "price": amount,
            "subtotal": amount,
        }]

        invoice = Invoice(
            invoice_number=generate_invoice_number(),
            customer_name=booking.customer_name,
            customer_email=booking.customer_email,
            customer_phone=booking.customer_phone,
            items=items,
            subtotal=amount,
            tax=0,
            total=amount,
            payment_method=payment_method or "pending",
            payment_status="pending",
            issued_date=datetime.now(timezone.utc),
            notes=(
                f"Service booking receipt for {booking.booking_number}. "
                f"legacy_booking_id:{booking.id}"
            ),
        )

        self.db.add(invoice)
        await self.db.commit()
        await self.db.refresh(invoice)
        return invoice

    async def create_booking_invoice(
        self,
        booking_id: uuid.UUID,
        payment_method: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Invoice:
        """Create invoice for a booking"""
        existing = await self.get_by_booking_v2_id(booking_id)
        if existing:
            return existing

        result = await self.db.execute(
            select(BookingV2).where(BookingV2.id == booking_id)
        )
        booking = result.scalar_one_or_none()

        if not booking:
            raise ValueError("Booking not found")

        # Prepare items
        items = [{
            "name": booking.service_name,
            "quantity": 1,
            "price": float(booking.final_price or booking.quoted_price or 0),
            "subtotal": float(booking.final_price or booking.quoted_price or 0),
        }]

        total = float(booking.final_price or booking.quoted_price or 0)

        # Create invoice
        invoice_number = generate_invoice_number()
        invoice = Invoice(
            invoice_number=invoice_number,
            booking_id=booking_id,
            customer_name=booking.customer_name,
            customer_email=booking.customer_email,
            customer_phone=booking.customer_phone,
            items=items,
            subtotal=total,
            tax=0,
            total=total,
            payment_method=payment_method or booking.payment_method,
            payment_status="paid" if booking.payment_status in ("completed", "paid") else "pending",
            issued_date=datetime.now(timezone.utc),
            due_date=None,
            notes=f"Service booking receipt for {booking.booking_number}.",
        )

        self.db.add(invoice)
        await self.db.commit()
        await self.db.refresh(invoice)

        return invoice

    async def _company_info(self) -> dict:
        """Company details for the invoice — admin-editable settings first,
        module constants as fallback (nothing hardcoded on the rendered PDF)."""
        info = {
            "name": _COMPANY_NAME,
            "address": _COMPANY_ADDRESS,
            "phone": _COMPANY_PHONE,
            "email": _COMPANY_EMAIL,
        }
        try:
            from app.models.models import Setting

            keys = ["site_name", "contact_address", "business_address",
                    "contact_phone", "business_phone", "contact_email", "business_email"]
            rows = (await self.db.execute(
                select(Setting).where(Setting.key.in_(keys), Setting.is_deleted == False)  # noqa: E712
            )).scalars().all()
            s = {r.key: (r.value or "").strip() for r in rows if (r.value or "").strip()}
            info["name"] = s.get("site_name") or info["name"]
            info["address"] = s.get("contact_address") or s.get("business_address") or info["address"]
            info["phone"] = s.get("contact_phone") or s.get("business_phone") or info["phone"]
            info["email"] = s.get("contact_email") or s.get("business_email") or info["email"]
        except Exception:  # noqa: BLE001 — never let settings break invoice rendering
            pass
        return info

    async def generate_pdf(self, invoice: Invoice) -> bytes:
        """Generate the premium branded PDF invoice (fpdf2 + Bengali shaping)."""
        company = await self._company_info()

        ref_label = None
        ref_value = None
        if invoice.order_id:
            order_result = await self.db.execute(
                select(Order.order_number).where(Order.id == invoice.order_id)
            )
            ref_value = order_result.scalar_one_or_none()
            ref_label = "Order #"
        elif invoice.booking_id:
            bk_result = await self.db.execute(
                select(BookingV2.booking_number).where(BookingV2.id == invoice.booking_id)
            )
            ref_value = bk_result.scalar_one_or_none()
            ref_label = "Booking #"

        return _build_invoice_pdf(
            invoice, company, ref_label, ref_value, _find_logo_path()
        )

    def format_currency(self, amount: float) -> str:
        """Format amount as Bangladeshi currency"""
        return f"৳{amount:,.2f}"

    def format_date(self, date) -> str:
        """Format date nicely"""
        if isinstance(date, str):
            return date
        return date.strftime("%B %d, %Y")
