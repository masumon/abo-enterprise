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


def generate_invoice_number():
    """Generate unique invoice number INV-YYYY-XXXXXX"""
    year = datetime.now(timezone.utc).year
    random_part = "".join(random.choices(string.digits, k=6))
    return f"INV-{year}-{random_part}"


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

        invoice_label = ParagraphStyle(
            "InvLabel",
            parent=styles["Normal"],
            fontSize=22,
            leading=26,
            textColor=brand_dark,
            fontName="Helvetica-Bold",
            alignment=TA_RIGHT,
        )
        invoice_num = ParagraphStyle(
            "InvNum",
            parent=styles["Normal"],
            fontSize=10,
            leading=13,
            textColor=muted,
            alignment=TA_RIGHT,
        )
        section = ParagraphStyle(
            "Section",
            parent=styles["Normal"],
            fontSize=9,
            leading=12,
            textColor=brand,
            fontName="Helvetica-Bold",
            spaceBefore=4,
            spaceAfter=6,
        )
        body = ParagraphStyle(
            "Body",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#1e293b"),
        )
        footer = ParagraphStyle(
            "Footer",
            parent=styles["Normal"],
            fontSize=8,
            leading=11,
            textColor=muted,
            alignment=TA_CENTER,
        )
        thank = ParagraphStyle(
            "Thank",
            parent=styles["Normal"],
            fontSize=11,
            leading=14,
            textColor=brand_dark,
            fontName="Helvetica-Bold",
            alignment=TA_CENTER,
            spaceBefore=8,
        )

        elements: list = []

        # ── Header band (logo + company | INVOICE) ──
        logo_path = _find_logo_path()
        logo_cell: object = ""
        if logo_path:
            try:
                logo_cell = RLImage(str(logo_path), width=52, height=52)
            except Exception:
                logo_cell = ""

        company_block = Paragraph(
            f"<b>{_COMPANY_NAME}</b><br/><font size='8' color='#dbeafe'>{_COMPANY_TAGLINE}</font>",
            ParagraphStyle("HdrCo", parent=styles["Normal"], fontSize=14, textColor=colors.white, fontName="Helvetica-Bold"),
        )

        status = (invoice.payment_status or "pending").upper()
        status_color = "#059669" if status in ("PAID", "COMPLETED") else "#d97706"
        inv_right = Paragraph(
            f"INVOICE<br/><font size='9' color='#64748b'>{invoice.invoice_number}</font>"
            f"<br/><font size='8' color='{status_color}'><b>{status}</b></font>",
            invoice_label,
        )

        if logo_cell:
            left = Table([[logo_cell, company_block]], colWidths=[58, page_w * 0.52 - 58])
            left.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (1, 0), (1, 0), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]))
            header_inner = Table([[left, inv_right]], colWidths=[page_w * 0.52, page_w * 0.48])
        else:
            header_inner = Table([[company_block, inv_right]], colWidths=[page_w * 0.52, page_w * 0.48])

        header_inner.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ("LEFTPADDING", (0, 0), (-1, -1), 14),
            ("RIGHTPADDING", (0, 0), (-1, -1), 14),
            ("TOPPADDING", (0, 0), (-1, -1), 14),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
            ("BACKGROUND", (0, 0), (-1, -1), brand),
            ("ROUNDEDCORNERS", [8, 8, 8, 8]),
        ]))
        elements.append(header_inner)
        elements.append(Spacer(1, 0.22 * inch))

        # ── Meta + Bill To ──
        issued = invoice.issued_date
        if hasattr(issued, "strftime"):
            issued_str = issued.strftime("%d %b %Y")
        else:
            issued_str = str(issued or "—")

        meta_rows = [
            [Paragraph("ISSUED", section), Paragraph("PAYMENT", section)],
            [Paragraph(issued_str, body), Paragraph((invoice.payment_method or "—").replace("_", " ").title(), body)],
        ]
        if ref_label and ref_value:
            meta_rows[0].append(Paragraph(ref_label.strip("#"), section))
            meta_rows[1].append(Paragraph(str(ref_value), body))
            meta_w = page_w / 3
            col_w = [meta_w] * 3
        else:
            meta_w = page_w / 2
            col_w = [meta_w] * 2

        meta_table = Table(meta_rows, colWidths=col_w)
        meta_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
        ]))

        bill_lines = f"<b>{invoice.customer_name}</b>"
        if invoice.customer_phone:
            bill_lines += f"<br/>{invoice.customer_phone}"
        if invoice.customer_email:
            bill_lines += f"<br/>{invoice.customer_email}"

        bill_box = Table(
            [[Paragraph("BILL TO", section)], [Paragraph(bill_lines, body)]],
            colWidths=[page_w * 0.48],
        )
        bill_box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(_ROW_ALT)),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor(_BORDER)),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("ROUNDEDCORNERS", [6, 6, 6, 6]),
        ]))

        top_row = Table([[bill_box, meta_table]], colWidths=[page_w * 0.48, page_w * 0.52])
        top_row.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
        elements.append(top_row)
        elements.append(Spacer(1, 0.2 * inch))

        # ── Line items ──
        elements.append(Paragraph("ITEMS", section))
        items_data = [["Description", "Qty", "Unit Price", "Amount"]]
        for item in invoice.items or []:
            price = float(item.get("price", 0) or 0)
            qty = int(item.get("quantity", 1) or 1)
            sub = float(item.get("subtotal", price * qty) or 0)
            name = str(item.get("name", ""))[:80]
            items_data.append([
                name,
                str(qty),
                f"৳{price:,.2f}",
                f"৳{sub:,.2f}",
            ])

        items_table = Table(
            items_data,
            colWidths=[page_w * 0.46, page_w * 0.12, page_w * 0.21, page_w * 0.21],
            repeatRows=1,
        )
        items_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), brand),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#334155")),
            ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
            ("ALIGN", (0, 0), (0, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor(_ROW_ALT)]),
            ("LINEBELOW", (0, 0), (-1, 0), 0, brand),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor(_BORDER)),
            ("LINEBELOW", (0, 1), (-1, -2), 0.25, colors.HexColor(_BORDER)),
        ]))
        elements.append(items_table)
        elements.append(Spacer(1, 0.15 * inch))

        # ── Totals ──
        subtotal = float(invoice.subtotal or 0)
        tax = float(invoice.tax or 0)
        total = float(invoice.total or 0)
        totals = Table(
            [
                ["Subtotal", f"৳{subtotal:,.2f}"],
                ["Tax", f"৳{tax:,.2f}"],
                ["TOTAL", f"৳{total:,.2f}"],
            ],
            colWidths=[page_w * 0.68, page_w * 0.32],
        )
        totals.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
            ("FONTNAME", (0, 0), (-1, 1), "Helvetica"),
            ("FONTNAME", (0, 2), (-1, 2), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 1), 10),
            ("FONTSIZE", (0, 2), (-1, 2), 13),
            ("TEXTCOLOR", (0, 0), (-1, 1), colors.HexColor("#475569")),
            ("TEXTCOLOR", (0, 2), (-1, 2), colors.white),
            ("BACKGROUND", (0, 2), (-1, 2), brand_dark),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor(_BORDER)),
            ("ROUNDEDCORNERS", [0, 0, 6, 6]),
        ]))
        elements.append(totals)

        if invoice.notes and "legacy_booking_id:" not in (invoice.notes or ""):
            elements.append(Spacer(1, 0.12 * inch))
            elements.append(Paragraph(f"<i>Notes: {invoice.notes}</i>", footer))

        elements.append(Spacer(1, 0.28 * inch))
        elements.append(Paragraph("Thank you for choosing ABO Enterprise!", thank))
        elements.append(Spacer(1, 0.08 * inch))
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
