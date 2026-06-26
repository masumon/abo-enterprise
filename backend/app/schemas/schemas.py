import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel, EmailStr, field_validator
import re


def bd_phone(v: str) -> str:
    if not re.match(r"^0[13-9]\d{8}$", v):
        raise ValueError("Invalid Bangladesh phone number. Format: 01XXXXXXXXX")
    return v


class ApiResponse(BaseModel):
    success: bool = True
    data: Any = None
    message: str = ""


class PaginatedMeta(BaseModel):
    page: int
    per_page: int
    total: int
    total_pages: int


class PaginatedResponse(BaseModel):
    success: bool = True
    data: list[Any]
    message: str = ""
    meta: PaginatedMeta


# ---- Product ----

class ProductBase(BaseModel):
    slug: str
    name_en: str
    name_bn: str
    description_en: str | None = None
    description_bn: str | None = None
    price: float
    original_price: float | None = None
    category: str
    badge: str | None = None
    image_url: str | None = None
    images: list[str] = []
    stock_quantity: int = 0
    is_active: bool = True
    is_featured: bool = False
    sort_order: int = 0
    specifications: dict = {}


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name_en: str | None = None
    name_bn: str | None = None
    price: float | None = None
    original_price: float | None = None
    stock_quantity: int | None = None
    is_active: bool | None = None
    is_featured: bool | None = None
    badge: str | None = None
    image_url: str | None = None


class ProductOut(ProductBase):
    id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# ---- Order ----

class OrderItemCreate(BaseModel):
    product_id: str
    product_name: str
    product_price: float
    quantity: int
    subtotal: float


class OrderCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: str | None = None
    delivery_address: str
    payment_method: str
    payment_number: str | None = None
    items: list[OrderItemCreate]
    subtotal: float
    delivery_charge: float = 0
    total: float
    notes: str | None = None

    @field_validator("customer_phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return bd_phone(v)


class OrderStatusUpdate(BaseModel):
    status: str


class OrderItemOut(OrderItemCreate):
    id: uuid.UUID
    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: uuid.UUID
    order_number: str
    customer_name: str
    customer_phone: str
    customer_email: str | None
    delivery_address: str
    payment_method: str
    payment_status: str
    order_status: str
    subtotal: float
    delivery_charge: float
    total: float
    notes: str | None
    items: list[OrderItemOut]
    created_at: datetime

    model_config = {"from_attributes": True}


# ---- Booking ----

class BookingCreate(BaseModel):
    service_type: str
    service_subtype: str | None = None
    customer_name: str
    customer_phone: str
    customer_email: str | None = None
    details: str | None = None

    @field_validator("customer_phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return bd_phone(v)


class BookingStatusUpdate(BaseModel):
    status: str


class BookingOut(BookingCreate):
    id: uuid.UUID
    booking_number: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ---- Lead ----

class LeadCreate(BaseModel):
    source: str = "website"
    lead_type: str
    name: str
    company: str | None = None
    phone: str
    email: str | None = None
    budget_range: str | None = None
    project_description: str | None = None
    requirements: str | None = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return bd_phone(v)


class LeadStatusUpdate(BaseModel):
    status: str


class LeadOut(LeadCreate):
    id: uuid.UUID
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ---- Auth ----

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---- Dashboard ----

class DashboardStats(BaseModel):
    total_orders: int
    pending_orders: int
    total_bookings: int
    pending_bookings: int
    new_leads: int
    total_leads: int
    total_products: int
    recent_orders: list[Any] = []
    recent_leads: list[Any] = []
