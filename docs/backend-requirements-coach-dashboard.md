# Backend Requirements for Coach Dashboard

## Overview
The coach dashboard needs new API endpoints and modifications to support booking management.

## 1. Status Field

Add `status` field to bookings:

```json
{
  "id": 123,
  "names": "John Smith",
  "status": "pending",
  // ... existing fields
}
```

Status values:
- `pending` - Not yet processed (default)
- `paid_dd` - Paid and direct debit set up
- `paid_awaiting_dd` - Paid but direct debit pending
- `unpaid_dd` - Not paid but direct debit set up
- `unpaid_coach_call` - Needs coach follow-up call
- `not_joining` - Decided not to join

## 2. Update Booking Status Endpoint

`PUT /api/bookings/{booking_id}/status`

Request:
```json
{
  "status": "paid_dd",
  "kit_items": [
    {
      "type": "tshirt",
      "size": "medium youth"
    },
    {
      "type": "trousers",
      "size": "xs"
    }
  ],
  "reminder_time": "2025-01-20T10:00:00Z"
}
```

Response:
```json
{
  "success": true,
  "message": "Status updated",
  "booking": {
    "id": 123,
    "status": "paid_dd",
    "kit_order_id": 456,
    "reminder_id": 789
  }
}
```

## 3. Helper Names

Add `helpers` field to class times:

```json
{
  "id": 1,
  "day": "Monday",
  "name": "Kids 1",
  "coaches": "John Smith, Jane Doe",
  "helpers": ["Mike Wilson", "Sarah Johnson"],
  // ... existing fields
}
```

## 4. Kit Orders

`POST /api/kit-orders`

Request:
```json
{
  "booking_id": 123,
  "items": [
    {
      "type": "tshirt",
      "size": "medium youth"
    }
  ]
}
```

`GET /api/kit-orders/{booking_id}`

Response:
```json
{
  "id": 456,
  "booking_id": 123,
  "items": [
    {
      "type": "tshirt",
      "size": "medium youth"
    }
  ],
  "created_at": "2025-01-15T10:00:00Z"
}
```

## 5. Reminders

`POST /api/reminders`

Request:
```json
{
  "booking_id": 123,
  "reminder_time": "2025-01-20T10:00:00Z"
}
```

`GET /api/reminders/my`

Response:
```json
[
  {
    "id": 789,
    "booking_id": 123,
    "reminder_time": "2025-01-20T10:00:00Z",
    "status": "pending"
  }
]
```

`PUT /api/reminders/{id}/complete`

## 6. Bookings Filter

Add status filter to existing endpoint:

`GET /api/bookings?status=pending`

## 7. Booking Statistics

`GET /api/bookings/stats`

Response:
```json
{
  "total": 50,
  "converted": 30,
  "pending": 15,
  "not_joining": 5,
  "conversion_rate": 60,
  "by_status": {
    "paid_dd": 20,
    "paid_awaiting_dd": 10,
    "unpaid_dd": 0,
    "unpaid_coach_call": 15,
    "not_joining": 5
  }
}
```

## Permissions

- Coaches only see bookings for their assigned class times
- Admin users see all bookings
- Kit orders visible to processing coach and admins
- Reminders visible to assigned coach and admins