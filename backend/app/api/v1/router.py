from fastapi import APIRouter
from app.api.v1.routes import products, orders, bookings, leads, auth, admin

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(products.router)
api_router.include_router(orders.router)
api_router.include_router(bookings.router)
api_router.include_router(leads.router)
api_router.include_router(admin.router)
