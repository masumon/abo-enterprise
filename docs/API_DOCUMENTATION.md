# ABO Enterprise — API Documentation

**Base URL:** `https://your-backend-url.onrender.com/api/v1`  
**Version:** 1.0.0  
**Last Updated:** 2026-06-26

---

## TABLE OF CONTENTS

1. [Authentication](#authentication)
2. [Services](#services)
3. [Bookings](#bookings)
4. [Leads](#leads)
5. [Invoices](#invoices)
6. [Admin Settings](#admin-settings)
7. [Payment Methods](#payment-methods)
8. [Error Handling](#error-handling)

---

## AUTHENTICATION

### Login

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer"
  },
  "message": "Login successful"
}
```

**Errors:**
- `401`: Invalid credentials

---

### Get Current User

**Endpoint:** `GET /auth/me`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "super_admin"
  },
  "message": "User fetched successfully"
}
```

---

## SERVICES

### List Services (Public)

**Endpoint:** `GET /services`

**Query Parameters:**
- `page` (int, default: 1) - Page number
- `per_page` (int, default: 10) - Items per page
- `category` (string, optional) - Filter by category
- `featured` (boolean, optional) - Filter featured only

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "slug": "website-development",
      "name_en": "Website Development",
      "name_bn": "ওয়েবসাইট ডেভেলপমেন্ট",
      "category": "web",
      "pricing_type": "package",
      "base_price": 50000,
      "is_active": true,
      "is_featured": true,
      "lead_priority": 2,
      "pricing_tiers": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "tier_name": "Basic",
          "price": 15000,
          "features": ["5 pages", "Contact form", "Basic SEO"]
        }
      ]
    }
  ],
  "message": "Services fetched successfully",
  "meta": {
    "page": 1,
    "per_page": 10,
    "total": 12,
    "total_pages": 2
  }
}
```

---

### Get Service Details

**Endpoint:** `GET /services/{slug}`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "slug": "website-development",
    "name_en": "Website Development",
    "category": "web",
    "pricing_type": "package",
    "description_en": "Professional website development...",
    "pricing_tiers": [...]
  },
  "message": "Service fetched successfully"
}
```

**Errors:**
- `404`: Service not found

---

### Create Service (Admin)

**Endpoint:** `POST /admin/services`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "slug": "website-development",
  "name_en": "Website Development",
  "name_bn": "ওয়েবসাইট ডেভেলপমেন্ট",
  "category": "web",
  "pricing_type": "package",
  "base_price": 50000,
  "is_featured": true,
  "lead_priority": 2
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {...},
  "message": "Service created successfully"
}
```

**Errors:**
- `400`: Slug already exists
- `401`: Unauthorized

---

### Update Service (Admin)

**Endpoint:** `PUT /admin/services/{service_id}`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name_en": "Website Development Pro",
  "base_price": 75000,
  "is_featured": false
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {...},
  "message": "Service updated successfully"
}
```

---

### Create Pricing Tier (Admin)

**Endpoint:** `POST /admin/services/{service_id}/tiers`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "tier_name": "Professional",
  "price": 50000,
  "features": ["10 pages", "Advanced features", "Premium support"],
  "duration_days": 30
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {...},
  "message": "Pricing tier created successfully"
}
```

---

## BOOKINGS

### Create Booking (Public)

**Endpoint:** `POST /bookings`

**Request Body:**
```json
{
  "service_id": "550e8400-e29b-41d4-a716-446655440000",
  "service_tier": "Professional",
  "customer_name": "John Doe",
  "customer_phone": "01800000000",
  "customer_email": "john@example.com",
  "customer_company": "ABC Ltd",
  "booking_date": "2026-07-01",
  "details": "Need a professional website",
  "requirements": "Must be mobile responsive"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "booking_number": "BK-2026-123456",
    "service_id": "550e8400-e29b-41d4-a716-446655440000",
    "service_name": "Website Development",
    "status": "pending",
    "payment_status": "pending",
    "created_at": "2026-06-26T10:30:00Z"
  },
  "message": "Booking created successfully"
}
```

---

### List Bookings (Admin)

**Endpoint:** `GET /admin/bookings`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (int, default: 1)
- `per_page` (int, default: 20)
- `status` (string, optional) - pending|confirmed|in_progress|completed
- `service_id` (UUID, optional)
- `payment_status` (string, optional) - pending|completed

**Response (200):**
```json
{
  "success": true,
  "data": [...],
  "message": "Bookings fetched successfully",
  "meta": {...}
}
```

---

### Update Booking Status (Admin)

**Endpoint:** `PATCH /admin/bookings/{booking_id}/status`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "confirmed"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {...},
  "message": "Booking status updated successfully"
}
```

---

## LEADS

### Submit Lead (Public)

**Endpoint:** `POST /leads`

**Request Body:**
```json
{
  "lead_type": "software_development",
  "name": "Jane Smith",
  "email": "jane@company.com",
  "phone": "01800000001",
  "company": "Tech Company Ltd",
  "project_description": "We need a custom ERP system",
  "requirements": "Must integrate with existing databases",
  "budget_min": 500000,
  "budget_max": 1000000,
  "timeline": "3-6 months"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "lead_number": "LF-2026-123456",
    "lead_type": "software_development",
    "name": "Jane Smith",
    "qualification_score": 85,
    "status": "new",
    "created_at": "2026-06-26T10:30:00Z"
  },
  "message": "Lead submitted successfully"
}
```

---

### List Leads (Admin)

**Endpoint:** `GET /admin/leads`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (int, default: 1)
- `per_page` (int, default: 20)
- `status` (string, optional) - new|contacted|qualified|proposal_sent|won|lost
- `lead_type` (string, optional)
- `min_score` (int, optional) - 0-100

**Response (200):**
```json
{
  "success": true,
  "data": [...],
  "message": "Leads fetched successfully",
  "meta": {...}
}
```

---

### Update Lead Status (Admin)

**Endpoint:** `PATCH /admin/leads/{lead_id}/status`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "qualified",
  "reason_lost": null
}
```

---

### Update Lead Score (Admin)

**Endpoint:** `PATCH /admin/leads/{lead_id}/score?score=90`

**Headers:** `Authorization: Bearer <token>`

---

## INVOICES

### Create Invoice

**Endpoint:** `POST /invoices`

**Request Body:**
```json
{
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "payment_method": "bkash",
  "notes": "Invoice for order"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "invoice_number": "INV-2026-123456",
    "customer_name": "John Doe",
    "total": 50000,
    "payment_status": "pending",
    "issued_date": "2026-06-26"
  },
  "message": "Invoice created successfully"
}
```

---

### Download Invoice PDF

**Endpoint:** `GET /invoices/{invoice_id}/pdf`

**Response:** PDF file download

---

### List Invoices (Admin)

**Endpoint:** `GET /admin/invoices`

**Headers:** `Authorization: Bearer <token>`

---

## ADMIN SETTINGS

### Get Settings

**Endpoint:** `GET /admin/settings`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "business": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "key": "business_name",
        "value": "ABO Enterprise",
        "category": "business"
      }
    ],
    "payment": [...],
    "email": [...]
  },
  "message": "Settings fetched successfully"
}
```

---

### Update Setting

**Endpoint:** `PUT /admin/settings/{key}`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "value": "ABO Enterprise Bangladesh",
  "description_en": "Business name in English"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {...},
  "message": "Setting updated successfully"
}
```

---

## PAYMENT METHODS

### List Payment Methods (Public)

**Endpoint:** `GET /payment-methods-public`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "payment_gateway": "bkash",
      "description": "bKash Mobile Payment",
      "is_active": true
    }
  ],
  "message": "Payment methods fetched successfully"
}
```

---

### List Payment Methods (Admin)

**Endpoint:** `GET /admin/payment-methods`

**Headers:** `Authorization: Bearer <token>`

---

## ERROR HANDLING

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error_code": "ERROR_CODE",
  "details": {
    "field": "value",
    "reason": "explanation"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `NOT_FOUND` | 404 | Resource not found |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Access denied |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INVALID_STATE` | 422 | Cannot perform action in current state |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

---

## RATE LIMITING

All endpoints are rate limited to prevent abuse:
- **Default:** 100 requests per minute per IP
- **Burst:** 1000 requests per 15 minutes

When rate limited, you'll receive a `429` response with `Retry-After` header.

---

## AUTHENTICATION

Use Bearer token authentication for all protected endpoints:

```
Authorization: Bearer <your_access_token>
```

Tokens are valid for 15 minutes. Use refresh endpoints for extending sessions.

---

## PAGINATION

All list endpoints support pagination:

```json
{
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

---

**For more information, visit:** `https://your-backend-url.onrender.com/docs`

