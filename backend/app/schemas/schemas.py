import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel, EmailStr, field_validator
import re


def bd_phone(v: str) -> str:
    if not re.match(r"^0[13-9]\d{9}$", v):
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
    seo_title: str | None = None
    seo_description: str | None = None
    seo_keywords: str | None = None
    canonical_url: str | None = None
    og_image: str | None = None
    sku: str | None = None
    barcode: str | None = None
    brand: str | None = None
    sub_category: str | None = None
    tags: list[str] = []
    weight: float | None = None
    warranty_info: str | None = None
    delivery_info: str | None = None
    is_flash_sale: bool = False
    flash_sale_price: float | None = None
    flash_sale_ends_at: datetime | None = None
    low_stock_threshold: int = 5
    is_best_seller: bool = False
    rating: float | None = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name_en: str | None = None
    name_bn: str | None = None
    description_en: str | None = None
    description_bn: str | None = None
    price: float | None = None
    original_price: float | None = None
    category: str | None = None
    stock_quantity: int | None = None
    is_active: bool | None = None
    is_featured: bool | None = None
    badge: str | None = None
    image_url: str | None = None
    images: list[str] | None = None
    sort_order: int | None = None
    seo_title: str | None = None
    seo_description: str | None = None
    seo_keywords: str | None = None
    canonical_url: str | None = None
    og_image: str | None = None
    sku: str | None = None
    barcode: str | None = None
    brand: str | None = None
    sub_category: str | None = None
    tags: list[str] | None = None
    weight: float | None = None
    warranty_info: str | None = None
    delivery_info: str | None = None
    is_flash_sale: bool | None = None
    flash_sale_price: float | None = None
    flash_sale_ends_at: datetime | None = None
    specifications: dict | None = None
    low_stock_threshold: int | None = None
    is_best_seller: bool | None = None
    rating: float | None = None


class ProductOut(ProductBase):
    id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("images", mode="before")
    @classmethod
    def coerce_images(cls, v: Any) -> list:
        return v if v is not None else []

    @field_validator("specifications", mode="before")
    @classmethod
    def coerce_specs(cls, v: Any) -> dict:
        return v if v is not None else {}

    @field_validator("tags", mode="before")
    @classmethod
    def coerce_tags(cls, v: Any) -> list:
        return v if v is not None else []


# ---- Review ----

class ReviewCreate(BaseModel):
    product_id: uuid.UUID | None = None
    customer_name: str
    company: str | None = None
    rating: int
    review_en: str
    review_bn: str | None = None
    photo_url: str | None = None
    source: str = "direct"

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("Rating must be 1-5")
        return v


class ReviewOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID | None
    customer_name: str
    company: str | None
    rating: int
    review_en: str
    review_bn: str | None
    photo_url: str | None
    source: str
    is_verified: bool
    is_featured: bool
    is_active: bool
    admin_reply: str | None = None
    admin_reply_at: datetime | None = None
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
    discount_amount: float = 0
    coupon_code: str | None = None
    delivery_charge: float = 0
    total: float
    notes: str | None = None

    @field_validator("customer_phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return bd_phone(v)


class OrderStatusUpdate(BaseModel):
    status: str


class OrderCourierUpdate(BaseModel):
    courier_provider: str | None = None
    courier_tracking_id: str | None = None


class BulkOrderStatusUpdate(BaseModel):
    order_ids: list[uuid.UUID]
    status: str


class OrderItemOut(BaseModel):
    # Standalone (not inheriting OrderItemCreate): DB rows have product_id as
    # UUID | None, which fails OrderItemCreate's required `product_id: str`.
    id: uuid.UUID
    product_id: uuid.UUID | None = None
    product_name: str
    product_price: float
    quantity: int
    subtotal: float

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
    discount_amount: float = 0
    coupon_code: str | None = None
    delivery_charge: float
    total: float
    courier_provider: str | None = None
    courier_tracking_id: str | None = None
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
    estimated_price: str | None = None

    @field_validator("customer_phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return bd_phone(v)


class BookingStatusUpdate(BaseModel):
    status: str


class BookingOut(BaseModel):
    # Standalone (not inheriting BookingCreate): output must not re-run input
    # validators like bd_phone, or one legacy row breaks the whole list.
    id: uuid.UUID
    booking_number: str
    service_type: str
    service_subtype: str | None = None
    customer_name: str
    customer_phone: str
    customer_email: str | None = None
    details: str | None = None
    estimated_price: str | None = None
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


class LeadOut(BaseModel):
    # Standalone (not inheriting LeadCreate): output must not re-run input
    # validators like bd_phone, or one legacy row breaks the whole list.
    id: uuid.UUID
    source: str
    lead_type: str
    name: str
    company: str | None = None
    phone: str
    email: str | None = None
    budget_range: str | None = None
    project_description: str | None = None
    requirements: str | None = None
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


class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "admin"


class AdminUserUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    password: str | None = None


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


# ---- Settings ----

class SettingBase(BaseModel):
    key: str
    value: str
    data_type: str = "string"
    description: str | None = None
    is_secret: bool = False
    is_editable: bool = True


class SettingCreate(SettingBase):
    pass


class SettingUpdate(BaseModel):
    value: str
    is_editable: bool | None = None


class SettingOut(SettingBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ==================== SERVICE SCHEMAS ====================

class ServicePricingTierBase(BaseModel):
    tier_name: str
    description_en: str | None = None
    description_bn: str | None = None
    price: float
    duration_days: int | None = None
    features: list[str] = []
    includes: str | None = None
    is_active: bool = True
    sort_order: int | None = None


class ServicePricingTierCreate(ServicePricingTierBase):
    pass


class ServicePricingTierOut(ServicePricingTierBase):
    id: uuid.UUID
    service_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ServiceBookingFormBase(BaseModel):
    field_name: str
    field_type: str
    field_label_en: str
    field_label_bn: str
    is_required: bool = True
    placeholder: str | None = None
    options: list[str] | None = None
    default_value: str | None = None
    validation_rules: dict | None = None
    conditional_logic: dict | None = None
    sort_order: int | None = None
    is_active: bool = True


class ServiceBookingFormCreate(ServiceBookingFormBase):
    pass


class ServiceBookingFormOut(ServiceBookingFormBase):
    id: uuid.UUID
    service_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ServiceBase(BaseModel):
    slug: str
    name_en: str
    name_bn: str
    description_en: str | None = None
    description_bn: str | None = None
    short_description_en: str | None = None
    short_description_bn: str | None = None
    long_description_en: str | None = None
    long_description_bn: str | None = None
    category: str
    icon_url: str | None = None
    featured_image_url: str | None = None
    icon_color: str | None = None
    pricing_type: str
    base_price: float | None = None
    min_price: float | None = None
    max_price: float | None = None
    hourly_rate: float | None = None
    is_active: bool = True
    is_featured: bool = False
    sort_order: int = 0
    lead_priority: int = 5
    lead_qualification_score: int = 0
    tags: list[str] = []
    seo_title: str | None = None
    seo_description: str | None = None
    seo_keywords: str | None = None
    canonical_url: str | None = None
    og_image: str | None = None
    process_steps: list[dict] = []
    benefits: list[str] = []
    requirements: list[str] = []
    required_documents: list[str] = []
    faq: list[dict] = []


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(BaseModel):
    name_en: str | None = None
    name_bn: str | None = None
    description_en: str | None = None
    description_bn: str | None = None
    short_description_en: str | None = None
    short_description_bn: str | None = None
    long_description_en: str | None = None
    long_description_bn: str | None = None
    category: str | None = None
    pricing_type: str | None = None
    base_price: float | None = None
    min_price: float | None = None
    max_price: float | None = None
    hourly_rate: float | None = None
    is_active: bool | None = None
    is_featured: bool | None = None
    lead_priority: int | None = None
    seo_title: str | None = None
    seo_description: str | None = None
    seo_keywords: str | None = None
    canonical_url: str | None = None
    og_image: str | None = None
    sort_order: int | None = None
    icon_url: str | None = None
    featured_image_url: str | None = None
    icon_color: str | None = None
    tags: list[str] | None = None
    process_steps: list[dict] | None = None
    benefits: list[str] | None = None
    requirements: list[str] | None = None
    required_documents: list[str] | None = None
    faq: list[dict] | None = None


class ServiceOut(ServiceBase):
    id: uuid.UUID
    pricing_tiers: list[ServicePricingTierOut] = []
    booking_forms: list[ServiceBookingFormOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ==================== BOOKING V2 SCHEMAS ====================

class BookingV2Create(BaseModel):
    service_id: uuid.UUID
    service_tier: str | None = None
    customer_name: str
    customer_phone: str
    customer_email: str | None = None
    customer_company: str | None = None
    booking_date: datetime | None = None
    estimated_completion_date: datetime | None = None
    pricing_type: str
    quoted_price: float | None = None
    details: str | None = None
    requirements: str | None = None
    attachments: list[str] = []

    @field_validator("customer_phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return bd_phone(v)


class BookingV2StatusUpdate(BaseModel):
    status: str


class BookingV2Out(BaseModel):
    id: uuid.UUID
    booking_number: str
    service_id: uuid.UUID
    service_name: str
    service_tier: str | None
    customer_name: str
    customer_phone: str
    customer_email: str | None
    customer_company: str | None
    booking_date: datetime | None
    estimated_completion_date: datetime | None
    pricing_type: str
    quoted_price: float | None
    final_price: float | None
    hours_worked: float | None
    details: str | None
    requirements: str | None
    status: str
    payment_status: str
    payment_method: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


# ==================== LEAD V2 SCHEMAS ====================

class LeadV2Create(BaseModel):
    service_id: uuid.UUID | None = None
    lead_type: str
    name: str
    email: str | None = None
    phone: str
    company: str | None = None
    job_title: str | None = None
    company_size: str | None = None
    project_description: str | None = None
    requirements: str | None = None
    budget_range: str | None = None
    budget_min: float | None = None
    budget_max: float | None = None
    timeline: str | None = None
    attachments: list[str] = []

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return bd_phone(v)


class LeadV2StatusUpdate(BaseModel):
    status: str
    reason_lost: str | None = None


class LeadV2Out(BaseModel):
    id: uuid.UUID
    lead_number: str
    service_id: uuid.UUID | None
    lead_type: str
    source: str
    name: str
    email: str | None
    phone: str
    company: str | None
    project_description: str | None
    requirements: str | None
    budget_range: str | None
    budget_min: float | None
    budget_max: float | None
    timeline: str | None
    qualification_score: int
    status: str
    assigned_to: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
    converted_at: datetime | None

    model_config = {"from_attributes": True}


# ==================== INVOICE SCHEMAS ====================

class InvoiceItemBase(BaseModel):
    name: str
    quantity: int
    price: float


class InvoiceCreate(BaseModel):
    order_id: uuid.UUID | None = None
    booking_id: uuid.UUID | None = None
    customer_name: str
    customer_email: str | None = None
    customer_phone: str | None = None
    items: list[InvoiceItemBase]
    subtotal: float
    tax: float = 0
    total: float
    payment_method: str | None = None
    notes: str | None = None


class InvoiceOut(BaseModel):
    id: uuid.UUID
    invoice_number: str
    order_id: uuid.UUID | None
    booking_id: uuid.UUID | None
    customer_name: str
    customer_email: str | None
    customer_phone: str | None
    items: list[dict]
    subtotal: float
    tax: float
    total: float
    payment_method: str | None
    payment_status: str
    issued_date: datetime | None
    due_date: datetime | None
    paid_date: datetime | None
    pdf_url: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ==================== PAYMENT SCHEMAS ====================

class PaymentMethodBase(BaseModel):
    payment_gateway: str
    is_active: bool = True
    account_identifier: str | None = None
    commission_percentage: float = 0
    min_amount: float | None = None
    max_amount: float | None = None
    description: str | None = None
    sort_order: int | None = None


class PaymentMethodCreate(PaymentMethodBase):
    pass


class PaymentMethodUpdate(BaseModel):
    payment_gateway: str | None = None
    is_active: bool | None = None
    account_identifier: str | None = None
    commission_percentage: float | None = None
    min_amount: float | None = None
    max_amount: float | None = None
    description: str | None = None
    sort_order: int | None = None


class PaymentMethodOut(PaymentMethodBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ==================== ADMIN SETTINGS SCHEMAS ====================

class AdminSettingBase(BaseModel):
    category: str
    key: str
    value: str
    data_type: str
    description_en: str | None = None
    description_bn: str | None = None
    is_editable: bool = True
    is_secret: bool = False
    display_type: str | None = None
    sort_order: int | None = None


class AdminSettingCreate(AdminSettingBase):
    pass


class AdminSettingUpdate(BaseModel):
    value: str
    description_en: str | None = None
    description_bn: str | None = None


class AdminSettingOut(AdminSettingBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ==================== EMAIL TEMPLATE SCHEMAS ====================

class EmailTemplateBase(BaseModel):
    template_name: str
    subject_en: str
    subject_bn: str
    body_en: str
    body_bn: str
    variables: list[str] = []
    is_active: bool = True


class EmailTemplateCreate(EmailTemplateBase):
    pass


class EmailTemplateUpdate(BaseModel):
    subject_en: str | None = None
    subject_bn: str | None = None
    body_en: str | None = None
    body_bn: str | None = None
    is_active: bool | None = None


class EmailTemplateOut(EmailTemplateBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# Payment Schemas
from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal
from uuid import UUID
from datetime import datetime

class PaymentInitiateRequest(BaseModel):
    order_id: UUID
    payment_gateway: str = Field(..., pattern="^(bkash|nagad|sslcommerz)$")
    success_url: str | None = None
    fail_url: str | None = None
    cancel_url: str | None = None
    
    class Config:
        from_attributes = True


class PaymentVerifyRequest(BaseModel):
    payment_id: str
    payment_gateway: str = Field(..., pattern="^(bkash|nagad)$")
    
    class Config:
        from_attributes = True


class PaymentResponseModel(BaseModel):
    success: bool
    payment_url: Optional[str] = None
    payment_gateway: str
    transaction_id: Optional[str] = None
    status: Optional[str] = None
    message: Optional[str] = None
    order_number: Optional[str] = None
    customer_phone: Optional[str] = None
    
    class Config:
        from_attributes = True


class PaymentWebhookRequest(BaseModel):
    transaction_id: str
    status: str
    amount: Optional[Decimal] = None
    timestamp: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class BkashTransactionOut(BaseModel):
    id: UUID
    order_id: Optional[UUID]
    booking_id: Optional[UUID]
    bkash_transaction_id: str
    payment_id: Optional[str]
    amount: Decimal
    status: str
    payment_execute_time: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


class NagadTransactionOut(BaseModel):
    id: UUID
    order_id: Optional[UUID]
    booking_id: Optional[UUID]
    nagad_reference_id: str
    merchant_order_id: str
    amount: Decimal
    status: str
    payment_completion_time: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


class PaymentReconciliationOut(BaseModel):
    id: UUID
    reconciliation_date: datetime
    payment_gateway: str
    total_transactions: int
    total_amount: Decimal
    successful_count: int
    failed_count: int
    pending_count: int
    reconciliation_status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== BLOG SCHEMAS ====================

class BlogPostBase(BaseModel):
    slug: str
    title_en: str
    title_bn: str | None = None
    content_en: str
    content_bn: str | None = None
    excerpt_en: str | None = None
    excerpt_bn: str | None = None
    featured_image_url: str | None = None
    category: str | None = None
    tags: list[str] = []
    author_name: str = "ABO Enterprise"
    status: str = "draft"
    is_featured: bool = False
    sort_order: int = 0
    published_at: datetime | None = None
    seo_title: str | None = None
    seo_description: str | None = None
    seo_keywords: str | None = None
    canonical_url: str | None = None
    og_image: str | None = None


class BlogPostCreate(BlogPostBase):
    pass


class BlogPostUpdate(BaseModel):
    title_en: str | None = None
    title_bn: str | None = None
    content_en: str | None = None
    content_bn: str | None = None
    excerpt_en: str | None = None
    excerpt_bn: str | None = None
    featured_image_url: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    author_name: str | None = None
    status: str | None = None
    is_featured: bool | None = None
    sort_order: int | None = None
    published_at: datetime | None = None
    seo_title: str | None = None
    seo_description: str | None = None
    seo_keywords: str | None = None
    canonical_url: str | None = None
    og_image: str | None = None


class BlogPostOut(BlogPostBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---- Assistant ----

class AssistantChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    customer_name: str | None = None
    customer_phone: str | None = None
    customer_email: str | None = None
    language: str | None = None
    page_path: str | None = None  # current site path — powers context awareness

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        if len(v) > 2000:
            raise ValueError("Message exceeds 2000 characters")
        return v

    @field_validator("customer_phone")
    @classmethod
    def validate_phone_optional(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        return bd_phone(v)


class AssistantChatResponse(BaseModel):
    message: str
    intent: str
    language: str
    session_id: str
    data: dict | None = None
    suggestions: list[str] | None = None


class AssistantMessageOut(BaseModel):
    role: str
    content: str
    intent: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AssistantActionLogOut(BaseModel):
    id: UUID
    session_id: str | None
    intent: str | None
    action: str
    status: str
    details: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class AssistantConversationOut(BaseModel):
    id: UUID
    session_id: str
    customer_name: str | None
    customer_phone: str | None
    customer_email: str | None
    language: str
    last_intent: str | None
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    model_config = {"from_attributes": True}


class AssistantConfigOut(BaseModel):
    feature_assistant_chat: bool = True
    feature_assistant_whatsapp: bool = True
    whatsapp_number: str = ""
    assistant_welcome_en: str = ""
    assistant_welcome_bn: str = ""
    assistant_feature_orders: bool = True
    assistant_feature_order_tracking: bool = True
    assistant_feature_bookings: bool = True
    assistant_feature_booking_tracking: bool = True
    assistant_feature_leads: bool = True
    assistant_feature_lead_tracking: bool = True
    assistant_feature_product_search: bool = True
    assistant_feature_service_info: bool = True
    assistant_feature_coupons: bool = True
    assistant_feature_invoices: bool = True
    assistant_feature_delivery_info: bool = True
    assistant_feature_faq: bool = True
    assistant_feature_blog: bool = True
    assistant_feature_web_search: bool = True
    assistant_feature_complaints: bool = True


class AssistantConfigUpdate(BaseModel):
    feature_assistant_chat: bool | None = None
    feature_assistant_whatsapp: bool | None = None
    whatsapp_number: str | None = None
    assistant_welcome_en: str | None = None
    assistant_welcome_bn: str | None = None
    assistant_feature_orders: bool | None = None
    assistant_feature_order_tracking: bool | None = None
    assistant_feature_bookings: bool | None = None
    assistant_feature_booking_tracking: bool | None = None
    assistant_feature_leads: bool | None = None
    assistant_feature_lead_tracking: bool | None = None
    assistant_feature_product_search: bool | None = None
    assistant_feature_service_info: bool | None = None
    assistant_feature_coupons: bool | None = None
    assistant_feature_invoices: bool | None = None
    assistant_feature_delivery_info: bool | None = None
    assistant_feature_faq: bool | None = None
    assistant_feature_blog: bool | None = None
    assistant_feature_web_search: bool | None = None
    assistant_feature_complaints: bool | None = None


class AssistantFaqEntry(BaseModel):
    key: str
    topic: str = ""
    answer_en: str
    answer_bn: str = ""
    # Customer questions/keywords (any language, one per line) that should
    # trigger this answer — lets admins teach the assistant without code.
    questions: str = ""


class AssistantFaqUpdate(BaseModel):
    topic: str | None = None
    answer_en: str | None = None
    answer_bn: str | None = None
    questions: str | None = None


class CareerApplicationCreate(BaseModel):
    name: str
    email: str | None = None
    phone: str
    position: str
    cover_letter: str | None = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return bd_phone(v)


class CareerApplicationUpdate(BaseModel):
    status: str | None = None
    notes: str | None = None


class CareerApplicationResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str | None
    phone: str
    position: str
    cover_letter: str | None
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
