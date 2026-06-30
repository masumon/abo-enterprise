from fastapi import APIRouter
from app.api.v1.routes import (
    products,
    orders,
    bookings,
    leads,
    auth,
    admin,
    settings,
    services,
    admin_settings,
    bookings_v2,
    leads_v2,
    invoices,
    payments,
    analytics,
    bulk,
    reviews,
    blog,
    public,
    assistant,
    email_templates,
    customer_otp,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(products.router)
api_router.include_router(orders.router)
api_router.include_router(bookings.router)
api_router.include_router(bookings_v2.router)
api_router.include_router(leads.router)
api_router.include_router(leads_v2.router)
api_router.include_router(services.router)
api_router.include_router(settings.router)
api_router.include_router(invoices.router)
api_router.include_router(payments.router)
api_router.include_router(analytics.router)
api_router.include_router(bulk.router)
api_router.include_router(admin.router)
api_router.include_router(admin_settings.router)
api_router.include_router(reviews.router)
api_router.include_router(blog.router)
api_router.include_router(public.router)
api_router.include_router(assistant.router)
api_router.include_router(email_templates.router)
api_router.include_router(customer_otp.router)
