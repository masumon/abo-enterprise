# ABO Enterprise E2E Testing Guide

## Overview

This document outlines the E2E (End-to-End) testing strategy for ABO Enterprise, covering all critical user journeys and API integration points.

## Test Structure

```
frontend/src/__tests__/
├── HomePage.test.tsx              # Homepage navigation & hero
├── Services.test.tsx              # Services listing & filtering
├── BookingForm.test.tsx           # Service booking flow
├── LeadForm.test.tsx              # Project inquiry flow
├── AdminDashboard.test.tsx        # Admin stats & management
└── api.integration.test.ts        # Backend API integration
```

## Test Coverage

### 1. User Journey: Browse → Book Service

**File:** `Services.test.tsx`, `BookingForm.test.tsx`

**Flow:**
1. User visits `/services`
2. Views list of available services
3. Filters services by category
4. Clicks on service → navigates to `/services/[slug]`
5. Views pricing, features, requirements
6. Submits booking form with contact details
7. System validates Bangladesh phone number format
8. API creates booking with unique booking_number (BK-YYYY-XXXXXX)
9. User sees success notification
10. Backend sends email & WhatsApp notification

**Test Cases:**
- ✅ Services load successfully
- ✅ Category filtering works
- ✅ Service detail page loads dynamic content
- ✅ Booking form validates required fields
- ✅ BD phone validation rejects invalid formats
- ✅ Booking submission creates record with correct status
- ✅ API returns unique booking_number

### 2. User Journey: Submit Project Inquiry

**File:** `LeadForm.test.tsx`

**Flow:**
1. User visits `/projects`
2. Views "How It Works" section
3. Clicks "Get Started Today"
4. Fills inquiry form with:
   - Service type selection
   - Project description (min 20 chars)
   - Detailed requirements (min 10 chars)
   - Budget range (optional)
   - Timeline (optional)
5. Submits form
6. Backend calculates qualification_score (0-100)
7. Creates lead with unique lead_number (LF-YYYY-XXXXXX)
8. Sends notification email

**Test Cases:**
- ✅ Form fields render correctly
- ✅ Service type dropdown functional
- ✅ Minimum length validation enforced
- ✅ Budget range optional but accepts valid numbers
- ✅ Timeline selector functional
- ✅ Form submission creates lead with score
- ✅ Success message displayed

### 3. Admin Journey: Dashboard & Management

**File:** `AdminDashboard.test.tsx`

**Flow:**
1. Admin navigates to `/admin/dashboard`
2. Views real-time statistics:
   - Total orders, pending orders
   - Total bookings, pending bookings
   - New leads, total leads
   - Total products
3. Reviews recent orders & leads with scores
4. Clicks "View all leads" → `/admin/leads`
5. Filters leads by qualification score (new/warm/hot)
6. Updates lead status (new → contacted → qualified)
7. Navigates to `/admin/bookings`
8. Updates booking status (pending → confirmed → completed)
9. Accesses `/admin/settings` for configuration

**Test Cases:**
- ✅ Dashboard loads stats from API
- ✅ Stats display correct counts
- ✅ Recent items paginated (5 per section)
- ✅ Leads show qualification scores
- ✅ Status transitions valid
- ✅ Quick action buttons functional
- ✅ Settings management accessible

### 4. API Integration Tests

**File:** `api.integration.test.ts`

**Endpoints Tested:**
- `GET /services` - List services with pagination
- `GET /services/slug/{slug}` - Fetch single service
- `POST /bookings` - Create booking
- `GET /bookings/{id}` - Fetch booking details
- `PATCH /bookings/{id}/status` - Update status
- `POST /leads` - Create lead with qualification score
- `GET /leads` - List leads with filters
- `PATCH /leads/{id}/status` - Update lead status
- `GET /admin/stats` - Dashboard statistics
- Error handling for validation & API errors

## Running Tests

### Install Dependencies
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Coverage Report
```bash
npm run test:coverage
```

### Run E2E Tests Only
```bash
npm run test:e2e
```

## Critical Test Scenarios

### Scenario 1: Booking Flow (Priority: HIGH)
```
1. Visit /services
2. Select "Web Development" service
3. Click "Book Now"
4. Fill form: name, phone (01712345678), email
5. Submit
6. Assert: Success message + API call logged
7. Assert: booking_number generated (BK-YYYY-XXXXXX)
8. Assert: Email notification sent
```

### Scenario 2: Lead Qualification (Priority: HIGH)
```
1. Visit /projects
2. Click "Get Started Today"
3. Select "software_development"
4. Fill all fields with quality data
5. Enter budget: 500000-1000000
6. Submit
7. Assert: Lead created with qualification_score >= 50
8. Assert: lead_number generated (LF-YYYY-XXXXXX)
9. Assert: Email notification sent
```

### Scenario 3: Admin Lead Management (Priority: HIGH)
```
1. Login to /admin/dashboard
2. Navigate to /admin/leads
3. View leads sorted by qualification_score
4. Filter "Hot leads" (score >= 70)
5. Click lead → View details
6. Update status: new → contacted
7. Update status: contacted → qualified
8. Assert: Activity logged + timestamp updated
```

### Scenario 4: Service Pricing Display (Priority: MEDIUM)
```
1. Service with pricing_type="fixed":
   Assert: Single price display (৳X,XXX)
   
2. Service with pricing_type="hourly":
   Assert: Hourly rate display (৳X/hr)
   
3. Service with pricing_type="package":
   Assert: All tiers listed with features
   Assert: Radio button selection
   
4. Service with pricing_type="custom_quote":
   Assert: "Contact us" message
   Assert: CTA to /projects
```

## Validation Rules

### Bangladesh Phone Number
Format: `0[13-9]XXXXXXXX` (11 digits total)
- Valid: 01712345678, 01912345678, 01312345678
- Invalid: 01012345678, 12345678, 017123456789

### Email Validation
- Standard email format with @ and domain
- Tested in BookingForm and LeadForm

### Budget Range
- Min >= 0
- Max >= Min
- Both optional but both required if either provided

### Qualification Score (Leads Only)
- Range: 0-100
- Calculated based on:
  - Budget size (0-30 points)
  - Project description quality (0-20 points)
  - Timeline specificity (0-20 points)
  - Company size (0-15 points)
  - Response completeness (0-15 points)

## Performance Benchmarks

| Test | Target | Status |
|------|--------|--------|
| Page load time | <2s | ✅ |
| API response | <500ms | ✅ |
| Form submission | <1s | ✅ |
| Dashboard stats fetch | <1s | ✅ |

## Known Issues & Blockers

None currently. All tests passing.

## Continuous Integration

Tests should run on:
- Every pull request
- Before merge to main
- On production deployments

## Future Enhancements

- [ ] Visual regression testing
- [ ] Performance profiling
- [ ] Load testing (concurrent bookings)
- [ ] Mobile responsiveness testing
- [ ] Accessibility (WCAG 2.1 AA) testing
- [ ] Multi-language (EN/BN) validation
