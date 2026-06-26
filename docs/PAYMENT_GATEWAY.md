# Payment Gateway Integration Guide

## Overview

ABO Enterprise integrates with two major Bangladesh payment gateways:
- **bKash** - Mobile banking solution
- **Nagad** - Digital payment platform

Both gateways support:
- Order payments
- Service booking payments
- Invoice settlement
- Refunds
- Webhook verification

---

## Payment Flow

```
┌──────────────────────────────────────────┐
│ User Initiates Payment (Order/Booking)   │
└────────────────┬─────────────────────────┘
                 │
        ┌────────▼─────────┐
        │ Select Gateway   │
        │ (bKash/Nagad)    │
        └────────┬─────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼──┐     ┌───▼──┐
│bKash │     │Nagad │
└───┬──┘     └───┬──┘
    │            │
    └────────┬───┘
             │
    ┌────────▼──────────┐
    │ Create Payment    │
    │ Link/Session      │
    └────────┬──────────┘
             │
    ┌────────▼──────────────┐
    │ Redirect to Gateway   │
    │ (User enters PIN/OTP) │
    └────────┬──────────────┘
             │
    ┌────────▼──────────────────┐
    │ Gateway Processes Payment │
    └────────┬──────────────────┘
             │
    ┌────────▼──────────────┐
    │ Webhook Notification  │
    │ (Payment Confirmed)   │
    └────────┬──────────────┘
             │
    ┌────────▼──────────────┐
    │ Verify Payment        │
    │ Update Order Status   │
    └────────┬──────────────┘
             │
    ┌────────▼──────────────┐
    │ Send Confirmation     │
    │ Email/SMS             │
    └──────────────────────┘
```

---

## bKash Integration

### Setup

1. **Create bKash Merchant Account**
   - Go to https://www.bkash.com
   - Apply for merchant account
   - Get API credentials

2. **Environment Variables**
   ```env
   BKASH_APP_KEY=your_app_key
   BKASH_APP_SECRET=your_app_secret
   BKASH_USERNAME=your_username
   BKASH_PASSWORD=your_password
   BKASH_API_URL=https://checkout.bkash.com/api/payment
   BKASH_CALLBACK_URL=https://aboenterprise.com/api/v1/payments/bkash/callback
   ```

### API Endpoints

**Initiate Payment**
```bash
POST /api/v1/payments/bkash/initiate
Content-Type: application/json

{
  "order_id": "uuid",
  "payment_gateway": "bkash"
}

Response:
{
  "success": true,
  "payment_url": "https://checkout.bkash.com/...",
  "payment_gateway": "bkash",
  "transaction_id": "uuid"
}
```

**Verify Payment**
```bash
POST /api/v1/payments/bkash/verify
Content-Type: application/json

{
  "payment_id": "bkash_payment_id",
  "payment_gateway": "bkash"
}

Response:
{
  "success": true,
  "transaction_id": "uuid",
  "status": "Completed"
}
```

**Webhook**
```bash
POST /api/v1/payments/webhook/bkash

{
  "transaction_id": "trx_id",
  "status": "Completed",
  "amount": 5000,
  "timestamp": "2024-06-26T10:30:00Z"
}
```

### Transaction States

- **Initiated** - Payment link created
- **Pending** - User has not completed payment
- **Completed** - Payment successful
- **Failed** - Payment failed
- **Cancelled** - User cancelled payment

---

## Nagad Integration

### Setup

1. **Create Nagad Merchant Account**
   - Go to https://www.mynagad.com
   - Register as merchant
   - Get merchant credentials

2. **Environment Variables**
   ```env
   NAGAD_MERCHANT_ID=your_merchant_id
   NAGAD_MERCHANT_KEY=your_merchant_key
   NAGAD_MERCHANT_NUMBER=your_merchant_number
   NAGAD_API_URL=https://api.nagad.com.bd
   NAGAD_CALLBACK_URL=https://aboenterprise.com/api/v1/payments/nagad/callback
   ```

### API Endpoints

**Initiate Payment**
```bash
POST /api/v1/payments/nagad/initiate
Content-Type: application/json

{
  "order_id": "uuid",
  "payment_gateway": "nagad"
}

Response:
{
  "success": true,
  "payment_url": "https://checkout.nagad.com/...",
  "payment_gateway": "nagad",
  "transaction_id": "uuid"
}
```

**Verify Payment**
```bash
POST /api/v1/payments/nagad/verify
Content-Type: application/json

{
  "payment_id": "nagad_session_id",
  "payment_gateway": "nagad"
}

Response:
{
  "success": true,
  "transaction_id": "uuid",
  "status": "Completed"
}
```

**Webhook**
```bash
POST /api/v1/payments/webhook/nagad

{
  "transaction_id": "ref_id",
  "status": "Completed",
  "amount": 5000,
  "timestamp": "2024-06-26T10:30:00Z"
}
```

---

## Refund Processing

### bKash Refund
```python
result = await bkash_gateway.refund_payment(
    transaction_id="TRX123456",
    amount=Decimal("5000.00")
)
```

### Nagad Refund
```python
result = await nagad_gateway.refund_payment(
    transaction_id="REF123456",
    amount=Decimal("5000.00"),
    reason="Customer Request"
)
```

---

## Payment Reconciliation

### Daily Reconciliation Process

```bash
POST /api/v1/payments/reconciliation
{
  "date": "2024-06-26",
  "payment_gateway": "bkash"
}
```

### What''s Checked
- Total transactions per gateway
- Successful vs failed payments
- Amount discrepancies
- Webhook receipt status
- Pending payments

### Discrepancy Report
```json
{
  "discrepancies": [
    {
      "transaction_id": "trx_123",
      "issue": "webhook_not_received",
      "status": "pending"
    }
  ]
}
```

---

## Security Best Practices

### Signature Verification
- Nagad uses MD5 signatures
- Always verify webhook signatures
- Store merchant key securely

### Data Protection
- Encrypt sensitive payment data
- Use HTTPS for all API calls
- Log transactions without sensitive details
- Implement rate limiting on payment endpoints

### PCI Compliance
- Never store card details
- Use tokenization
- Regular security audits
- Encrypt data at rest

---

## Error Handling

### Common Errors

**Insufficient Funds**
```json
{
  "error": "Insufficient balance in account",
  "status": "Failed",
  "transaction_id": "..."
}
```

**Invalid Merchant**
```json
{
  "error": "Merchant not found or inactive",
  "status": "Failed"
}
```

**Payment Already Processed**
```json
{
  "error": "Payment already completed",
  "status": "Duplicate"
}
```

---

## Testing

### Test bKash Payment
1. Use sandbox credentials
2. Test with amount >= 10 BDT
3. Test with customer phone number format
4. Verify webhook receipt

### Test Nagad Payment
1. Use test merchant account
2. Use test payment IDs
3. Test signature generation
4. Verify session validation

---

## Monitoring

### Metrics to Track
- Transaction success rate
- Average processing time
- Failed payment count
- Refund requests
- Webhook delivery rate

### Alerts
- Payment processing failure
- High failed transaction rate
- Webhook delivery delays
- Reconciliation discrepancies

---

## Database Schema

### bkash_transactions table
```
- id (UUID, Primary Key)
- order_id (FK to orders)
- booking_id (FK to bookings_v2)
- bkash_transaction_id (String, Unique)
- payment_id (String, Unique)
- amount (Decimal)
- status (Initiated|Pending|Completed|Failed)
- payment_execute_time (Timestamp)
- webhook_received (Boolean)
- webhook_timestamp (Timestamp)
- raw_response (JSON)
- created_at, updated_at
```

### nagad_transactions table
```
- id (UUID, Primary Key)
- order_id (FK to orders)
- booking_id (FK to bookings_v2)
- nagad_reference_id (String, Unique)
- merchant_order_id (String)
- amount (Decimal)
- status (Initiated|Pending|Completed|Failed)
- payment_completion_time (Timestamp)
- webhook_received (Boolean)
- webhook_timestamp (Timestamp)
- raw_response (JSON)
- created_at, updated_at
```

### payment_reconciliation table
```
- id (UUID, Primary Key)
- reconciliation_date (Timestamp)
- payment_gateway (String)
- total_transactions (Integer)
- total_amount (Decimal)
- successful_count (Integer)
- failed_count (Integer)
- pending_count (Integer)
- discrepancies (JSON)
- reconciliation_status (String)
- created_at, updated_at
```

---

## Future Enhancements

- [ ] Mobile wallet support (Rocket, etc.)
- [ ] International payment support
- [ ] Recurring payment subscriptions
- [ ] Payment splitting for commissions
- [ ] Advanced fraud detection
- [ ] Real-time settlement reports
- [ ] API rate limiting
- [ ] Payment analytics dashboard

