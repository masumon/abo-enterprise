import smtplib
import asyncio
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.models.models import EmailTemplate, ActivityLog

logger = logging.getLogger(__name__)


def _send_sync(
    to: str,
    subject: str,
    html: str,
    attachments: Optional[list] = None,
) -> None:
    """Send email synchronously"""
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.warning("SMTP not configured, skipping email send")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAIL_SENDER_NAME} <{settings.SMTP_FROM}>"
        msg["To"] = to

        # Add HTML body
        msg.attach(MIMEText(html, "html", "utf-8"))

        # Add attachments if any
        if attachments:
            for attachment in attachments:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(attachment["content"])
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    f'attachment; filename= {attachment["filename"]}',
                )
                msg.attach(part)

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            if settings.SMTP_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, to, msg.as_string())

        logger.info(f"Email sent successfully to {to}")
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {str(e)}")


async def send_email(
    to: str,
    subject: str,
    html: str,
    attachments: Optional[list] = None,
) -> None:
    """Send email asynchronously"""
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(
            None, _send_sync, to, subject, html, attachments
        )
    except Exception as e:
        logger.error(f"Async email failed: {str(e)}")
        # Email is non-critical; never fail the main request


async def send_template_email(
    db: AsyncSession,
    template_name: str,
    to: str,
    variables: Dict[str, Any],
    language: str = "en",
    attachments: Optional[list] = None,
) -> bool:
    """Send email using configurable template"""
    try:
        # Get template from database
        result = await db.execute(
            select(EmailTemplate).where(
                EmailTemplate.template_name == template_name,
                EmailTemplate.is_active == True,
            )
        )
        template = result.scalar_one_or_none()

        if not template:
            logger.warning(f"Email template '{template_name}' not found")
            return False

        # Get subject and body based on language
        if language == "bn":
            subject = template.subject_bn
            body = template.body_bn
        else:
            subject = template.subject_en
            body = template.body_en

        # Replace variables in subject and body
        for key, value in variables.items():
            placeholder = f"{{{{{key}}}}}"
            subject = subject.replace(placeholder, str(value))
            body = body.replace(placeholder, str(value))

        # Send email
        await send_email(to, subject, body, attachments)
        return True

    except Exception as e:
        logger.error(f"Template email failed: {str(e)}")
        return False


def order_notification_html(order_number: str, customer_name: str, phone: str, total: float, items_summary: str) -> str:
    return f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1e5ba8;margin-bottom:8px">🛒 New Order — {order_number}</h2>
      <p style="color:#555">A new order has been placed on ABO Enterprise.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;color:#888;width:120px">Customer</td><td style="padding:8px;font-weight:600">{customer_name}</td></tr>
        <tr style="background:#f9fafb"><td style="padding:8px;color:#888">Phone</td><td style="padding:8px">{phone}</td></tr>
        <tr><td style="padding:8px;color:#888">Items</td><td style="padding:8px">{items_summary}</td></tr>
        <tr style="background:#f9fafb"><td style="padding:8px;color:#888">Total</td><td style="padding:8px;font-weight:700;color:#e91e63">৳{total:,.0f}</td></tr>
      </table>
      <p style="color:#888;font-size:13px">Log in to your admin panel to view full details and update the order status.</p>
    </div>
    """


def booking_notification_html(booking_number: str, customer_name: str, phone: str, service_type: str, details: str) -> str:
    return f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1e5ba8;margin-bottom:8px">📋 New Booking — {booking_number}</h2>
      <p style="color:#555">A new service booking has been submitted.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;color:#888;width:120px">Customer</td><td style="padding:8px;font-weight:600">{customer_name}</td></tr>
        <tr style="background:#f9fafb"><td style="padding:8px;color:#888">Phone</td><td style="padding:8px">{phone}</td></tr>
        <tr><td style="padding:8px;color:#888">Service</td><td style="padding:8px;text-transform:capitalize">{service_type.replace("_", " ")}</td></tr>
        <tr style="background:#f9fafb"><td style="padding:8px;color:#888">Details</td><td style="padding:8px">{details or "—"}</td></tr>
      </table>
      <p style="color:#888;font-size:13px">Log in to your admin panel to view and update the booking status.</p>
    </div>
    """


def lead_notification_html(name: str, phone: str, lead_type: str, description: str, budget: str) -> str:
    return f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1e5ba8;margin-bottom:8px">🎯 New Project Lead</h2>
      <p style="color:#555">A new lead has been submitted on ABO Enterprise.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;color:#888;width:120px">Name</td><td style="padding:8px;font-weight:600">{name}</td></tr>
        <tr style="background:#f9fafb"><td style="padding:8px;color:#888">Phone</td><td style="padding:8px">{phone}</td></tr>
        <tr><td style="padding:8px;color:#888">Type</td><td style="padding:8px;text-transform:capitalize">{lead_type.replace("_", " ")}</td></tr>
        <tr style="background:#f9fafb"><td style="padding:8px;color:#888">Budget</td><td style="padding:8px">{budget or "—"}</td></tr>
        <tr><td style="padding:8px;color:#888">Description</td><td style="padding:8px">{description or "—"}</td></tr>
      </table>
      <p style="color:#888;font-size:13px">Log in to your admin panel to view and manage this lead.</p>
    </div>
    """


# Customer confirmation emails

def customer_order_confirmation_html(
    order_number: str,
    customer_name: str,
    items: list,
    total: float,
    whatsapp_number: str
) -> str:
    items_html = "".join([
        f"<tr><td style='padding:8px;border-bottom:1px solid #eee'>{item['name']}</td>"
        f"<td style='padding:8px;border-bottom:1px solid #eee;text-align:center'>{item['quantity']}</td>"
        f"<td style='padding:8px;border-bottom:1px solid #eee;text-align:right'>৳{item['price']}</td></tr>"
        for item in items
    ])

    whatsapp_link = f"https://wa.me/{whatsapp_number.replace('+', '')}?text=My order number is {order_number}"

    return f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9fafb">
      <div style="background:white;border-radius:8px;padding:24px">
        <h2 style="color:#1e5ba8;margin:0 0 16px">✅ Order Confirmation</h2>
        <p style="color:#555;margin:0 0 16px">Dear {customer_name},</p>
        <p style="color:#666">Thank you for your order! Your order has been received and is being processed.</p>

        <div style="background:#f0f8ff;padding:16px;border-left:4px solid #1e5ba8;margin:16px 0">
          <p style="margin:0;color:#1e5ba8;font-weight:600">Order Number: {order_number}</p>
        </div>

        <h3 style="color:#333;margin-top:20px">Order Details</h3>
        <table style="width:100%;border-collapse:collapse">
          <tr style="background:#f5f5f5">
            <th style="padding:8px;text-align:left;color:#555">Product</th>
            <th style="padding:8px;text-align:center;color:#555">Qty</th>
            <th style="padding:8px;text-align:right;color:#555">Price</th>
          </tr>
          {items_html}
          <tr style="background:#f9fafb;font-weight:700">
            <td colspan="2" style="padding:8px">Total</td>
            <td style="padding:8px;text-align:right;color:#e91e63">৳{total:,.0f}</td>
          </tr>
        </table>

        <a href="{whatsapp_link}" style="display:inline-block;margin-top:20px;background:#25d366;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:600">
          Chat on WhatsApp
        </a>

        <p style="color:#999;font-size:12px;margin-top:24px;border-top:1px solid #eee;padding-top:16px">
          We will contact you soon with delivery updates. Thank you for shopping with ABO Enterprise!
        </p>
      </div>
    </div>
    """


def customer_booking_confirmation_html(
    booking_number: str,
    customer_name: str,
    service_type: str,
    estimated_price: str,
    whatsapp_number: str
) -> str:

    whatsapp_link = f"https://wa.me/{whatsapp_number.replace('+', '')}?text=My booking number is {booking_number}"

    return f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9fafb">
      <div style="background:white;border-radius:8px;padding:24px">
        <h2 style="color:#1e5ba8;margin:0 0 16px">✅ Booking Confirmation</h2>
        <p style="color:#555;margin:0 0 16px">Dear {customer_name},</p>
        <p style="color:#666">Your booking has been confirmed! We will contact you shortly to finalize the details.</p>

        <div style="background:#f0f8ff;padding:16px;border-left:4px solid #1e5ba8;margin:16px 0">
          <p style="margin:0;color:#1e5ba8;font-weight:600">Booking Number: {booking_number}</p>
        </div>

        <h3 style="color:#333;margin-top:20px">Booking Details</h3>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;color:#888;width:120px">Service</td><td style="padding:8px;font-weight:600">{service_type}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px;color:#888">Estimated Price</td><td style="padding:8px">{estimated_price}</td></tr>
        </table>

        <a href="{whatsapp_link}" style="display:inline-block;margin-top:20px;background:#25d366;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:600">
          Chat on WhatsApp
        </a>

        <p style="color:#999;font-size:12px;margin-top:24px;border-top:1px solid #eee;padding-top:16px">
          We will confirm your booking details via WhatsApp or call. Thank you for choosing ABO Enterprise!
        </p>
      </div>
    </div>
    """


def customer_lead_confirmation_html(
    lead_number: str,
    customer_name: str,
    lead_type: str,
    whatsapp_number: str,
) -> str:
    whatsapp_link = f"https://wa.me/{whatsapp_number.replace('+', '')}?text=My inquiry reference is {lead_number}"

    return f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9fafb">
      <div style="background:white;border-radius:8px;padding:24px">
        <h2 style="color:#1e5ba8;margin:0 0 16px">Thank You for Your Inquiry!</h2>
        <p style="color:#555;margin:0 0 16px">Dear {customer_name},</p>
        <p style="color:#666">We have received your project inquiry and our team will review it shortly. We typically respond within 24 hours.</p>

        <div style="background:#f0f8ff;padding:16px;border-left:4px solid #1e5ba8;margin:16px 0">
          <p style="margin:0;color:#1e5ba8;font-weight:600">Reference Number: {lead_number}</p>
          <p style="margin:8px 0 0;color:#555;font-size:14px">Service Type: {lead_type.replace("_", " ").title()}</p>
        </div>

        <p style="color:#666">Want to discuss your project immediately?</p>
        <a href="{whatsapp_link}" style="display:inline-block;margin-top:8px;background:#25d366;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:600">
          Chat on WhatsApp
        </a>

        <p style="color:#999;font-size:12px;margin-top:24px;border-top:1px solid #eee;padding-top:16px">
          Thank you for considering ABO Enterprise. We look forward to working with you!
        </p>
      </div>
    </div>
    """
