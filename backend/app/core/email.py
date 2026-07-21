import smtplib
import asyncio
import logging
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.models.models import EmailTemplate

logger = logging.getLogger(__name__)


def _send_sync(
    cfg: dict,
    to: str,
    subject: str,
    html: str,
    attachments: Optional[list] = None,
) -> None:
    """Send email synchronously using a resolved config (DB → env)."""
    if not cfg.get("host") or not cfg.get("user"):
        logger.warning("SMTP not configured, skipping email send")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{cfg['from_name']} <{cfg['from_addr']}>"
    msg["To"] = to
    msg.attach(MIMEText(html, "html", "utf-8"))

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

    # Raises on failure so send_email's retry/failure logging can act on it.
    _timeout = 30  # seconds — prevents indefinite hangs on unreachable hosts
    if settings.DEBUG:
        logger.debug(
            "SMTP connect: host=%s port=%s tls=%s timeout=%s",
            cfg["host"], cfg["port"], cfg.get("tls"), _timeout,
        )
    use_ssl = int(cfg.get("port") or 587) == 465
    if use_ssl:
        # Port 465 uses implicit SSL (SMTP_SSL); starttls not called.
        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=_timeout, context=ctx) as server:
            server.ehlo()
            if cfg.get("user") and cfg.get("password"):
                server.login(cfg["user"], cfg["password"])
            server.sendmail(cfg["from_addr"], to, msg.as_string())
    else:
        with smtplib.SMTP(cfg["host"], cfg["port"], timeout=_timeout) as server:
            server.ehlo()
            if cfg.get("tls"):
                server.starttls()
            if cfg.get("user") and cfg.get("password"):
                server.login(cfg["user"], cfg["password"])
            server.sendmail(cfg["from_addr"], to, msg.as_string())
    logger.info("Email sent successfully to %s", to)


async def _resolve_cfg() -> dict:
    """Effective SMTP config: DB admin overrides, else env. Never raises."""
    from app.core.email_config import env_email_config, resolve_email_config

    try:
        from app.core.database import AsyncSessionLocal

        async with AsyncSessionLocal() as db:
            return await resolve_email_config(db)
    except Exception:  # noqa: BLE001 — fall back to env if DB is unavailable
        logger.warning("Email config: DB unavailable, using env values", exc_info=True)
        return env_email_config()


async def send_email(
    to: str,
    subject: str,
    html: str,
    attachments: Optional[list] = None,
    *,
    retries: int = 2,
) -> None:
    """Send email asynchronously with bounded exponential-backoff retries.

    SMTP failures (network blip, temp reject) shouldn't lose a customer
    notification; retry twice with 2s / 5s spacing before giving up. Runs
    inside a FastAPI BackgroundTask, so retries don't extend the API response.

    Uses configured EMAIL_PROVIDER (resend, smtp, etc).
    """
    from app.core.email_factory import get_email_provider

    delays = [2.0, 5.0]
    provider = None

    for attempt in range(retries + 1):
        try:
            if provider is None:
                provider = await get_email_provider()

            await provider.send(to, subject, html, attachments)
            if attempt:
                logger.info("Email to %s delivered on retry %d", to, attempt)
            return
        except Exception as e:
            if attempt >= retries:
                logger.error(
                    "Email to %s failed after %d attempts: %s", to, attempt + 1, e
                )
                from app.core.ops_events import record_failed_email
                record_failed_email(to, subject, str(e))
                return
            logger.warning(
                "Email to %s failed on attempt %d (%s); retrying in %.0fs",
                to, attempt + 1, e, delays[attempt],
            )
            await asyncio.sleep(delays[attempt])


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


def order_notification_html(
    order_number: str,
    customer_name: str,
    phone: str,
    total: float,
    items_summary: str,
    payment_method: str = "",
    admin_orders_url: str = "",
    customer_whatsapp_url: str = "",
) -> str:
    payment_row = ""
    if payment_method:
        payment_row = f'<tr style="background:#f9fafb"><td style="padding:8px;color:#888">Payment</td><td style="padding:8px;text-transform:capitalize">{payment_method}</td></tr>'

    actions = ""
    if admin_orders_url or customer_whatsapp_url:
        buttons = []
        if admin_orders_url:
            buttons.append(
                f'<a href="{admin_orders_url}" style="display:inline-block;background:#1e5ba8;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:600;margin-right:8px">View in Admin</a>'
            )
        if customer_whatsapp_url:
            buttons.append(
                f'<a href="{customer_whatsapp_url}" style="display:inline-block;background:#25d366;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:600">WhatsApp Customer</a>'
            )
        actions = f'<div style="margin:20px 0">{"".join(buttons)}</div>'

    return f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1e5ba8;margin-bottom:8px">🛒 New Order — {order_number}</h2>
      <p style="color:#555">A new order has been placed on ABO Enterprise. Contact the customer via WhatsApp or email from your admin panel.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;color:#888;width:120px">Customer</td><td style="padding:8px;font-weight:600">{customer_name}</td></tr>
        <tr style="background:#f9fafb"><td style="padding:8px;color:#888">Phone</td><td style="padding:8px">{phone}</td></tr>
        <tr><td style="padding:8px;color:#888">Items</td><td style="padding:8px">{items_summary}</td></tr>
        {payment_row}
        <tr style="background:#f9fafb"><td style="padding:8px;color:#888">Total</td><td style="padding:8px;font-weight:700;color:#e91e63">৳{total:,.0f}</td></tr>
      </table>
      {actions}
      <p style="color:#888;font-size:13px">Invoice was auto-created. Open the order in admin to download PDF or update status.</p>
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


def customer_order_status_html(
    order_number: str,
    customer_name: str,
    new_status: str,
    total: float | None = None,
    courier_provider: str | None = None,
    tracking_id: str | None = None,
    track_url: str | None = None,
) -> str:
    """Status-change notification: confirmed / processing / shipped / delivered / cancelled."""
    status_meta = {
        "confirmed":  ("✅ Order Confirmed",  "#059669", "Your order has been confirmed and will be processed shortly."),
        "processing": ("📦 Order In Processing", "#0284c7", "Your order is being prepared for shipment."),
        "shipped":    ("🚚 Order Shipped",    "#7c3aed", "Your order is on its way!"),
        "delivered":  ("🎉 Order Delivered",  "#059669", "Your order has been delivered. Thank you for choosing ABO Enterprise!"),
        "cancelled":  ("⚠️ Order Cancelled",  "#dc2626", "Your order has been cancelled. Contact us if this was unexpected."),
    }
    title, colour, blurb = status_meta.get(
        new_status,
        (f"Order Update — {new_status.title()}", "#1e5ba8", "Your order status has changed."),
    )

    tracking_html = ""
    if new_status == "shipped" and tracking_id:
        provider = (courier_provider or "courier").replace("_", " ").title()
        tracking_html = f"""
        <div style="background:#f5f3ff;padding:14px 16px;border-left:4px solid #7c3aed;margin:16px 0;border-radius:4px">
          <p style="margin:0 0 4px;color:#5b21b6;font-weight:600;font-size:13px">🚚 {provider} Tracking</p>
          <p style="margin:0;color:#1f2937;font-family:monospace;font-size:15px;font-weight:700">{tracking_id}</p>
        </div>"""

    total_html = ""
    if total is not None:
        total_html = f"<p style='color:#666;margin:12px 0 0'>Order total: <b style='color:#e91e63'>৳{total:,.0f}</b></p>"

    action_html = ""
    if track_url:
        action_html = (
            f'<a href="{track_url}" style="display:inline-block;margin-top:20px;background:#1e5ba8;color:white;'
            f'padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600">Track Order</a>'
        )

    return f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9fafb">
      <div style="background:white;border-radius:8px;padding:24px">
        <h2 style="color:{colour};margin:0 0 16px">{title}</h2>
        <p style="color:#555;margin:0 0 16px">Dear {customer_name},</p>
        <p style="color:#666;margin:0 0 12px">{blurb}</p>
        <div style="background:#f0f8ff;padding:14px 16px;border-left:4px solid #1e5ba8;margin:16px 0;border-radius:4px">
          <p style="margin:0;color:#1e5ba8;font-weight:600">Order #: {order_number}</p>
        </div>
        {tracking_html}
        {total_html}
        {action_html}
        <p style="color:#999;font-size:12px;margin-top:24px;border-top:1px solid #eee;padding-top:16px">
          Questions? Reply to this email or WhatsApp us. — ABO Enterprise
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
