"""Intent and entity constants for the Enterprise Automation Assistant."""

from enum import Enum


class Intent(str, Enum):
    GREETING = "greeting"
    PRODUCT_SEARCH = "product_search"
    PRODUCT_DETAILS = "product_details"
    PRODUCT_PRICE = "product_price"
    PRODUCT_STOCK = "product_stock"
    PRODUCT_AVAILABILITY = "product_availability"
    CATEGORY = "category"
    BRAND = "brand"
    SERVICE_INFO = "service_information"
    SERVICE_PRICE = "service_price"
    SERVICE_BOOKING = "service_booking"
    QUOTE = "quote"
    ORDER_CREATION = "order_creation"
    ORDER_CONFIRMATION = "order_confirmation"
    ORDER_TRACKING = "order_tracking"
    ORDER_STATUS = "order_status"
    DELIVERY = "delivery"
    WARRANTY = "warranty"
    RETURN_POLICY = "return_policy"
    PAYMENT = "payment"
    INVOICE = "invoice"
    CONTACT = "contact"
    COMPANY_INFO = "company_information"
    FAQ = "faq"
    BLOG = "blog"
    PORTFOLIO = "portfolio"
    CUSTOMER_SUPPORT = "customer_support"
    COMPLAINT = "complaint"
    LEAD_CREATION = "lead_creation"
    REVIEW_REQUEST = "review_request"
    UNKNOWN = "unknown"


class EntityType(str, Enum):
    PRODUCT = "product"
    SERVICE = "service"
    BRAND = "brand"
    CATEGORY = "category"
    SKU = "sku"
    BARCODE = "barcode"
    ORDER_NUMBER = "order_number"
    INVOICE_NUMBER = "invoice_number"
    CUSTOMER = "customer"
    PHONE = "phone"
    EMAIL = "email"
    QUANTITY = "quantity"
    PRICE = "price"
    DATE = "date"


# Intents that may trigger write/automation workflows
SENSITIVE_INTENTS = frozenset({
    Intent.ORDER_CREATION,
    Intent.SERVICE_BOOKING,
    Intent.LEAD_CREATION,
    Intent.INVOICE,
    Intent.QUOTE,
})

# Intents requiring additional customer identity for automation
IDENTITY_REQUIRED_INTENTS = frozenset({
    Intent.ORDER_CREATION,
    Intent.SERVICE_BOOKING,
    Intent.LEAD_CREATION,
    Intent.ORDER_TRACKING,
    Intent.ORDER_STATUS,
    Intent.INVOICE,
})
