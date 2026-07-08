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
_COMPANY_EMAIL = "abo.enterprise@gmail.com"


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

    async def generate_pdf(self, invoice: Invoice) -> bytes:
        """Generate premium branded PDF invoice with logo."""
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch
            from reportlab.platypus import (
                SimpleDocTemplate,
                Table,
                TableStyle,
                Paragraph,
                Spacer,
                Image as RLImage,
            )
            from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
            from reportlab.lib import colors
        except ImportError:
            raise ImportError("reportlab library required for PDF generation. Install: pip install reportlab")

        _register_pdf_fonts()

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

        pdf_buffer = BytesIO()
        doc = SimpleDocTemplate(
            pdf_buffer,
            pagesize=A4,
            leftMargin=0.55 * inch,
            rightMargin=0.55 * inch,
            topMargin=0.45 * inch,
            bottomMargin=0.5 * inch,
        )
        page_w = A4[0] - doc.leftMargin - doc.rightMargin

        styles = getSampleStyleSheet()
        brand = colors.HexColor(_BRAND)
        brand_dark = colors.HexColor(_BRAND_DARK)
        muted = colors.HexColor(_MUTED)
        ink = colors.HexColor("#1e293b")
        border = colors.HexColor(_BORDER)
        row_alt = colors.HexColor(_ROW_ALT)

        # ── Typography scale ──
        co_name = ParagraphStyle(
            "CoName", parent=styles["Normal"], fontSize=16, leading=19,
            textColor=colors.white, fontName=_FONT_BOLD,
        )
        co_tag = ParagraphStyle(
            "CoTag", parent=styles["Normal"], fontSize=8, leading=11,
            textColor=colors.HexColor("#bfdbfe"),
        )
        inv_title = ParagraphStyle(
            "InvTitle", parent=styles["Normal"], fontSize=26, leading=30,
            textColor=colors.white, fontName=_FONT_BOLD, alignment=TA_RIGHT,
        )
        inv_meta_r = ParagraphStyle(
            "InvMetaR", parent=styles["Normal"], fontSize=9, leading=13,
            textColor=colors.HexColor("#dbeafe"), alignment=TA_RIGHT,
        )
        label = ParagraphStyle(
            "Label", parent=styles["Normal"], fontSize=7.5, leading=10,
            textColor=muted, fontName=_FONT_BOLD,
        )
        label_r = ParagraphStyle("LabelR", parent=label, alignment=TA_RIGHT)
        value = ParagraphStyle(
            "Value", parent=styles["Normal"], fontSize=10, leading=14,
            textColor=ink, fontName=_FONT,
        )
        value_r = ParagraphStyle("ValueR", parent=value, alignment=TA_RIGHT)
        bill_name = ParagraphStyle(
            "BillName", parent=styles["Normal"], fontSize=11.5, leading=15,
            textColor=ink, fontName=_FONT_BOLD,
        )
        footer = ParagraphStyle(
            "Footer", parent=styles["Normal"], fontSize=8, leading=11.5,
            textColor=muted, alignment=TA_CENTER, fontName=_FONT,
        )
        thank = ParagraphStyle(
            "Thank", parent=styles["Normal"], fontSize=11, leading=14,
            textColor=brand_dark, fontName=_FONT_BOLD, alignment=TA_CENTER,
        )

        elements: list = []

        # ── Header band: logo + company | INVOICE + number + status ──
        logo_path = _find_logo_path()
        logo_cell: object = ""
        if logo_path:
            try:
                logo_cell = RLImage(str(logo_path), width=46, height=46)
            except Exception:
                logo_cell = ""

        company_block = Table(
            [[Paragraph(_COMPANY_NAME, co_name)], [Paragraph(_COMPANY_TAGLINE, co_tag)]],
            colWidths=[page_w * 0.5 - (58 if logo_cell else 0)],
        )
        company_block.setStyle(TableStyle([
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ]))

        status = (invoice.payment_status or "pending").upper()
        is_paid = status in ("PAID", "COMPLETED")
        status_bg = "#059669" if is_paid else "#b45309"
        chip_text = ParagraphStyle(
            "ChipText", parent=styles["Normal"], fontSize=7.5, leading=9,
            textColor=colors.white, fontName=_FONT_BOLD, alignment=TA_CENTER,
        )
        chip = Table([[Paragraph(status, chip_text)]], colWidths=[54])
        chip.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(status_bg)),
            ("TOPPADDING", (0, 0), (-1, -1), 3.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("ROUNDEDCORNERS", [6, 6, 6, 6]),
        ]))
        chip_right = Table([["", chip]], colWidths=[page_w * 0.5 - 28 - 54, 54])
        chip_right.setStyle(TableStyle([
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))
        right_block = Table([
            [Paragraph("INVOICE", inv_title)],
            [Paragraph(invoice.invoice_number, inv_meta_r)],
            [chip_right],
        ], colWidths=[page_w * 0.5 - 28])
        right_block.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
            ("BOTTOMPADDING", (0, 1), (-1, 1), 6),
        ]))

        if logo_cell:
            left = Table([[logo_cell, company_block]], colWidths=[56, page_w * 0.5 - 56])
            left.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (0, 0), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]))
        else:
            left = company_block

        header = Table([[left, right_block]], colWidths=[page_w * 0.5, page_w * 0.5])
        header.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BACKGROUND", (0, 0), (-1, -1), brand),
            ("LEFTPADDING", (0, 0), (0, 0), 18),
            ("RIGHTPADDING", (1, 0), (1, 0), 18),
            ("TOPPADDING", (0, 0), (-1, -1), 16),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
            ("ROUNDEDCORNERS", [10, 10, 10, 10]),
        ]))
        elements.append(header)
        elements.append(Spacer(1, 0.26 * inch))

        # ── BILL TO card (left) + meta rows (right) ──
        issued = invoice.issued_date
        issued_str = issued.strftime("%d %b %Y") if hasattr(issued, "strftime") else str(issued or "—")

        bill_inner = [[Paragraph("BILL TO", label)], [Spacer(1, 3)], [Paragraph(invoice.customer_name or "—", bill_name)]]
        if invoice.customer_phone:
            bill_inner.append([Paragraph(invoice.customer_phone, value)])
        if invoice.customer_email:
            bill_inner.append([Paragraph(invoice.customer_email, value)])
        bill_box = Table(bill_inner, colWidths=[page_w * 0.46 - 24])
        bill_box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), row_alt),
            ("BOX", (0, 0), (-1, -1), 0.75, border),
            ("LEFTPADDING", (0, 0), (-1, -1), 14),
            ("RIGHTPADDING", (0, 0), (-1, -1), 14),
            ("TOPPADDING", (0, 0), (0, 0), 12),
            ("TOPPADDING", (0, 1), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -2), 1),
            ("BOTTOMPADDING", (0, -1), (-1, -1), 12),
            ("ROUNDEDCORNERS", [8, 8, 8, 8]),
        ]))

        meta_pairs = [("INVOICE NO", invoice.invoice_number), ("ISSUED", issued_str),
                      ("PAYMENT", (invoice.payment_method or "—").replace("_", " ").title())]
        if ref_label and ref_value:
            meta_pairs.append((ref_label.replace("#", "").strip().upper(), str(ref_value)))
        meta_rows = [[Paragraph(k, label), Paragraph(v, value_r)] for k, v in meta_pairs]
        meta_table = Table(meta_rows, colWidths=[page_w * 0.20, page_w * 0.26])
        meta_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LINEBELOW", (0, 0), (-1, -2), 0.5, border),
            ("LEFTPADDING", (0, 0), (-1, -1), 2),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]))

        top_row = Table(
            [[bill_box, "", meta_table]],
            colWidths=[page_w * 0.46, page_w * 0.08, page_w * 0.46],
        )
        top_row.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))
        elements.append(top_row)
        elements.append(Spacer(1, 0.3 * inch))

        # ── Line items ──
        desc_style = ParagraphStyle("Desc", parent=value, fontSize=9.5, leading=13)
        head_cell = ParagraphStyle("Head", parent=styles["Normal"], fontSize=8.5,
                                   textColor=colors.white, fontName=_FONT_BOLD)
        head_cell_r = ParagraphStyle("HeadR", parent=head_cell, alignment=TA_RIGHT)
        num_cell = ParagraphStyle("Num", parent=value, fontSize=9.5, alignment=TA_RIGHT)

        items_data = [[
            Paragraph("DESCRIPTION", head_cell),
            Paragraph("QTY", head_cell_r),
            Paragraph("UNIT PRICE", head_cell_r),
            Paragraph("AMOUNT", head_cell_r),
        ]]
        for item in invoice.items or []:
            price = float(item.get("price", 0) or 0)
            qty = int(item.get("quantity", 1) or 1)
            sub = float(item.get("subtotal", price * qty) or 0)
            name = str(item.get("name", ""))[:90]
            items_data.append([
                Paragraph(name, desc_style),
                Paragraph(str(qty), num_cell),
                Paragraph(f"৳{price:,.2f}", num_cell),
                Paragraph(f"৳{sub:,.2f}", num_cell),
            ])

        items_table = Table(
            items_data,
            colWidths=[page_w * 0.50, page_w * 0.10, page_w * 0.20, page_w * 0.20],
            repeatRows=1,
        )
        items_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), brand_dark),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, row_alt]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, 0), 9),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 9),
            ("TOPPADDING", (0, 1), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 1), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("LINEBELOW", (0, 1), (-1, -1), 0.5, border),
        ]))
        elements.append(items_table)
        elements.append(Spacer(1, 0.18 * inch))

        # ── Totals block (right-aligned, 42% width) ──
        subtotal = float(invoice.subtotal or 0)
        tax = float(invoice.tax or 0)
        total = float(invoice.total or 0)
        tot_label = ParagraphStyle("TotLabel", parent=value, textColor=muted, alignment=TA_RIGHT)
        tot_val = ParagraphStyle("TotVal", parent=value, alignment=TA_RIGHT)
        grand_label = ParagraphStyle("GrandL", parent=styles["Normal"], fontSize=11.5,
                                     textColor=colors.white, fontName=_FONT_BOLD, alignment=TA_RIGHT)
        grand_val = ParagraphStyle("GrandV", parent=styles["Normal"], fontSize=13,
                                   textColor=colors.white, fontName=_FONT, alignment=TA_RIGHT)

        totals_rows = [
            [Paragraph("Subtotal", tot_label), Paragraph(f"৳{subtotal:,.2f}", tot_val)],
        ]
        if tax > 0:
            totals_rows.append([Paragraph("Tax", tot_label), Paragraph(f"৳{tax:,.2f}", tot_val)])
        totals_rows.append([Paragraph("TOTAL", grand_label), Paragraph(f"৳{total:,.2f}", grand_val)])

        totals = Table(totals_rows, colWidths=[page_w * 0.21, page_w * 0.21])
        grand_row = len(totals_rows) - 1
        totals.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, grand_row - 1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, grand_row - 1), 6),
            ("TOPPADDING", (0, grand_row), (-1, grand_row), 10),
            ("BOTTOMPADDING", (0, grand_row), (-1, grand_row), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("LINEBELOW", (0, 0), (-1, grand_row - 2), 0.5, border) if grand_row > 1 else ("LEFTPADDING", (0, 0), (0, 0), 12),
            ("BACKGROUND", (0, grand_row), (-1, grand_row), brand_dark),
            ("ROUNDEDCORNERS", [0, 0, 8, 8]),
        ]))
        totals_wrap = Table([["", totals]], colWidths=[page_w * 0.58, page_w * 0.42])
        totals_wrap.setStyle(TableStyle([
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))
        elements.append(totals_wrap)

        if invoice.notes and "legacy_booking_id:" not in (invoice.notes or ""):
            elements.append(Spacer(1, 0.15 * inch))
            elements.append(Paragraph(f"<i>Notes: {invoice.notes}</i>", footer))

        # ── Footer ──
        elements.append(Spacer(1, 0.42 * inch))
        hr = Table([[""]], colWidths=[page_w])
        hr.setStyle(TableStyle([("LINEABOVE", (0, 0), (-1, 0), 0.6, border)]))
        elements.append(hr)
        elements.append(Spacer(1, 0.14 * inch))
        elements.append(Paragraph("Thank you for choosing ABO Enterprise!", thank))
        elements.append(Spacer(1, 0.07 * inch))
        elements.append(Paragraph(
            f"{_COMPANY_ADDRESS}<br/>{_COMPANY_PHONE} · {_COMPANY_EMAIL}",
            footer,
        ))

        doc.build(elements)
        pdf_buffer.seek(0)
        return pdf_buffer.getvalue()

    def format_currency(self, amount: float) -> str:
        """Format amount as Bangladeshi currency"""
        return f"৳{amount:,.2f}"

    def format_date(self, date) -> str:
        """Format date nicely"""
        if isinstance(date, str):
            return date
        return date.strftime("%B %d, %Y")
