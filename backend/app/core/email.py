import smtplib
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings


def _send_sync(to: str, subject: str, html: str) -> None:
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"ABO Enterprise <{settings.SMTP_FROM}>"
    msg["To"] = to
    msg.attach(MIMEText(html, "html", "utf-8"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.ehlo()
        if settings.SMTP_TLS:
            server.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM, to, msg.as_string())


async def send_email(to: str, subject: str, html: str) -> None:
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(None, _send_sync, to, subject, html)
    except Exception:
        pass  # Email is non-critical; never fail the main request


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
