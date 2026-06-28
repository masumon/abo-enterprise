import uuid
from datetime import datetime, timezone
from decimal import Decimal
from io import BytesIO
from typing import Optional, List, Dict, Any
import random
import string
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.models import Invoice, Order, BookingV2, Booking


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
            payment_status="completed" if order.payment_status == "completed" else "pending",
            issued_date=datetime.now(timezone.utc).date(),
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
            issued_date=datetime.now(timezone.utc).date(),
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
            payment_status="completed" if booking.payment_status == "completed" else "pending",
            issued_date=datetime.now(timezone.utc).date(),
            due_date=None,
            notes=f"Service booking receipt for {booking.booking_number}.",
        )

        self.db.add(invoice)
        await self.db.commit()
        await self.db.refresh(invoice)

        return invoice

    async def generate_pdf(self, invoice: Invoice) -> bytes:
        """Generate PDF for invoice using reportlab"""
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
            from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
            from reportlab.lib import colors
        except ImportError:
            raise ImportError("reportlab library required for PDF generation. Install: pip install reportlab")

        # Create PDF in memory
        pdf_buffer = BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=letter)

        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "CustomTitle",
            parent=styles["Heading1"],
            fontSize=24,
            textColor=colors.HexColor("#1F2937"),
            spaceAfter=6,
        )
        heading_style = ParagraphStyle(
            "CustomHeading",
            parent=styles["Heading2"],
            fontSize=12,
            textColor=colors.HexColor("#374151"),
            spaceAfter=6,
        )

        # Build PDF content
        elements = []

        # Header
        elements.append(Paragraph("INVOICE", title_style))
        elements.append(Spacer(1, 0.2 * inch))

        # Invoice details
        details_data = [
            ["Invoice #", invoice.invoice_number],
            ["Date", str(invoice.issued_date)],
            ["Status", invoice.payment_status.upper()],
        ]
        details_table = Table(details_data, colWidths=[2 * inch, 2 * inch])
        details_table.setStyle(
            TableStyle([
                ("FONT", (0, 0), (-1, -1), "Helvetica", 10),
                ("FONT", (0, 0), (0, -1), "Helvetica-Bold", 10),
            ])
        )
        elements.append(details_table)
        elements.append(Spacer(1, 0.3 * inch))

        # Customer info
        elements.append(Paragraph("BILL TO", heading_style))
        customer_info = f"{invoice.customer_name}<br/>"
        if invoice.customer_email:
            customer_info += f"{invoice.customer_email}<br/>"
        if invoice.customer_phone:
            customer_info += f"{invoice.customer_phone}<br/>"
        elements.append(Paragraph(customer_info, styles["Normal"]))
        elements.append(Spacer(1, 0.3 * inch))

        # Items table
        elements.append(Paragraph("ITEMS", heading_style))
        items_data = [["Description", "Qty", "Price", "Subtotal"]]
        for item in invoice.items:
            items_data.append([
                item.get("name", ""),
                str(item.get("quantity", 1)),
                f"৳{item.get('price', 0):.2f}",
                f"৳{item.get('subtotal', 0):.2f}",
            ])

        items_table = Table(items_data, colWidths=[3 * inch, 1 * inch, 1.5 * inch, 1.5 * inch])
        items_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E5E7EB")),
                ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 10),
                ("FONT", (0, 1), (-1, -1), "Helvetica", 10),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("GRID", (0, 0), (-1, -1), 1, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
            ])
        )
        elements.append(items_table)
        elements.append(Spacer(1, 0.3 * inch))

        # Totals
        totals_data = [
            ["Subtotal", f"৳{invoice.subtotal:.2f}"],
            ["Tax", f"৳{invoice.tax:.2f}"],
            ["TOTAL", f"৳{invoice.total:.2f}"],
        ]
        totals_table = Table(totals_data, colWidths=[4 * inch, 2 * inch])
        totals_table.setStyle(
            TableStyle([
                ("FONT", (0, 0), (-1, -1), "Helvetica", 10),
                ("FONT", (0, 2), (-1, 2), "Helvetica-Bold", 12),
                ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
                ("BACKGROUND", (0, 2), (-1, 2), colors.HexColor("#F3F4F6")),
            ])
        )
        elements.append(totals_table)
        elements.append(Spacer(1, 0.3 * inch))

        # Footer
        footer_text = "Thank you for your business!"
        elements.append(Paragraph(footer_text, styles["Normal"]))

        # Build PDF
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
