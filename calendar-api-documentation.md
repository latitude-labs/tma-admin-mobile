# Calendar System API Documentation

## Complete API Endpoints for Frontend Integration

This document contains all the calendar system API endpoints that have been implemented for the frontend team.

### Authentication
All endpoints require Bearer token authentication. Include the token in the Authorization header:
```
Authorization: Bearer {token}
```

---

## 📅 Calendar Events (Rota)

### GET /api/rota
List calendar events with filtering options.

**Query Parameters:**
- `start_date` (string, date): Start date for filtering events
- `end_date` (string, date): End date for filtering events
- `club_id` (integer): Filter by club ID
- `status` (string): Filter by status: `scheduled`, `confirmed`, `cancelled`, `completed`
- `type` (string): Filter by type: `class`, `holiday`, `overtime`, `custom`
- `include_team` (boolean): Include team members' events (admin/head coach only)
- `user_id` (integer): Filter by specific user (admin only)

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Kids Class - Temple Manchester",
      "description": null,
      "start_date": "2025-02-01T17:00:00Z",
      "end_date": "2025-02-01T18:00:00Z",
      "all_day": false,
      "status": "scheduled",
      "type": "class",
      "color": "#FF8133",
      "notes": null,
      "metadata": null,
      "is_cover": false,
      "original_user": null,
      "coach": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
      },
      "club": {
        "id": 1,
        "name": "Temple Manchester",
        "address": "123 Main St"
      },
      "class_time": {
        "id": 1,
        "name": "Kids 1",
        "day": "wednesday",
        "start_time": "17:00:00",
        "end_time": "18:00:00"
      }
    }
  ],
  "total": 25
}
```

### GET /api/rota/upcoming
Get upcoming events for the authenticated user.

**Query Parameters:**
- `limit` (integer, 1-50, default: 10): Maximum number of events to return

**Response 200:**
```json
{
  "data": [...],
  "total": 10
}
```

### GET /api/rota/calendar
Get events formatted for FullCalendar.js or similar libraries.

**Query Parameters:**
- `start` (string, datetime): Start of range
- `end` (string, datetime): End of range
- `include_team` (boolean): Include team events

**Response 200:**
```json
[
  {
    "id": 1,
    "title": "Kids Class",
    "start": "2025-02-01T17:00:00Z",
    "end": "2025-02-01T18:00:00Z",
    "allDay": false,
    "backgroundColor": "#FF8133",
    "borderColor": "#FF8133",
    "extendedProps": {
      "description": null,
      "status": "scheduled",
      "type": "class",
      "notes": null,
      "club": "Temple Manchester",
      "class_time": "Kids 1",
      "is_cover": false,
      "original_user": null
    }
  }
]
```

### GET /api/rota/{id}
Get specific calendar event details.

**Response 200:**
```json
{
  "data": {
    // Full event object
  }
}
```

### POST /api/rota/batch-sync
Sync multiple calendar changes from offline queue.

**Request Body:**
```json
{
  "events": [
    {
      "client_id": "temp-123",
      "operation": "create",
      "data": {
        "title": "Custom Event",
        "type": "custom",
        "start_date": "2025-02-01T10:00:00Z",
        "end_date": "2025-02-01T11:00:00Z"
      }
    },
    {
      "id": 456,
      "operation": "update",
      "data": {
        "status": "confirmed"
      }
    },
    {
      "id": 789,
      "operation": "delete"
    }
  ],
  "last_sync_timestamp": "2025-01-01T00:00:00Z"
}
```

**Response 200:**
```json
{
  "synced": [
    {
      "client_id": "temp-123",
      "server_id": 999,
      "status": "success"
    }
  ],
  "conflicts": [],
  "server_time": "2025-02-01T12:00:00Z"
}
```

### GET /api/rota/default-schedule
Get the user's default weekly schedule based on class time assignments.

**Query Parameters:**
- `user_id` (integer): User ID (admin only, defaults to current user)

**Response 200:**
```json
{
  "data": {
    "Monday": [
      {
        "class_time_id": 1,
        "start_time": "17:00:00",
        "end_time": "18:00:00",
        "club": "Temple Manchester",
        "name": "Kids 1"
      }
    ],
    "Tuesday": [],
    "Wednesday": [...],
    "Thursday": [],
    "Friday": [],
    "Saturday": [],
    "Sunday": []
  }
}
```

### POST /api/rota/populate-default
Auto-populate calendar with default schedule for a date range.

**Request Body:**
```json
{
  "user_id": 1,  // optional, admin only
  "start_date": "2025-02-01",
  "end_date": "2025-02-28",
  "exclude_holidays": true
}
```

**Response 200:**
```json
{
  "message": "Schedule populated successfully",
  "created": 15,
  "skipped": 3
}
```

### GET /api/rota/available-coaches
Find coaches available to cover a specific class.

**Query Parameters:**
- `date` (string, date, required): Date needing coverage
- `class_time_id` (integer, required): Class time needing coverage

**Response 200:**
```json
{
  "data": [
    {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane@example.com",
      "availability": "available",
      "skills": ["kids", "beginner"]
    }
  ]
}
```

### POST /api/rota/{id}/assign-cover
Assign a substitute coach to cover an event (admin only).

**Request Body:**
```json
{
  "covering_user_id": 2,
  "notes": "Jane will cover this class"
}
```

**Response 200:**
```json
{
  "message": "Coverage assigned successfully",
  "data": {
    // Updated event with is_cover=true and new user_id
  }
}
```

### PUT /api/rota/{id}/confirm-cover
Coach confirms or declines coverage assignment.

**Request Body:**
```json
{
  "status": "confirmed",  // or "declined"
  "notes": "Happy to help"
}
```

**Response 200:**
```json
{
  "message": "Coverage confirmed successfully",
  "data": {...}
}
```

---

## 🏖️ Holiday Requests

### GET /api/holiday-requests
List holiday requests with filtering.

**Query Parameters:**
- `status` (string): Filter by: `pending`, `approved`, `rejected`, `cancelled`
- `user_id` (integer): Filter by user (admin only)
- `date_from` (string, date): Start of date range
- `date_to` (string, date): End of date range
- `needs_coverage` (boolean): Only show requests needing coverage

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": 1,
      "start_date": "2025-02-10",
      "end_date": "2025-02-14",
      "reason": "holiday",
      "notes": "Family holiday",
      "status": "pending",
      "approved_by": null,
      "approved_at": null,
      "rejection_reason": null,
      "created_at": "2025-01-20T10:00:00Z",
      "updated_at": "2025-01-20T10:00:00Z",
      "user": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
      },
      "approvedBy": null,
      "rotas": []
    }
  ],
  "meta": {
    "total": 10,
    "current_page": 1,
    "last_page": 1
  }
}
```

### POST /api/holiday-requests
Create a new holiday request.

**Request Body:**
```json
{
  "start_date": "2025-02-10",
  "end_date": "2025-02-14",
  "reason": "holiday",  // Options: holiday, sick, personal, other
  "notes": "Family holiday to Spain"
}
```

**Response 201:**
```json
{
  "message": "Holiday request submitted successfully",
  "data": {
    // Full holiday request object with generated draft rotas
  }
}
```

### GET /api/holiday-requests/{id}
Get specific holiday request details.

**Response 200:**
```json
{
  "data": {
    // Full holiday request object with rotas
  }
}
```

### PUT /api/holiday-requests/{id}
Approve or reject a holiday request (admin only).

**Request Body:**
```json
{
  "status": "approved",  // or "rejected"
  "rejection_reason": "Not enough notice given"  // Required if rejecting
}
```

**Response 200:**
```json
{
  "message": "Holiday request approved successfully",
  "data": {...}
}
```

### POST /api/holiday-requests/{id}/cancel
Cancel a holiday request.

**Response 200:**
```json
{
  "message": "Holiday request cancelled successfully",
  "data": {...}
}
```

### GET /api/holiday-requests/{id}/affected-classes
Get list of classes affected by the holiday request.

**Response 200:**
```json
{
  "data": [
    {
      "date": "2025-02-10",
      "class_time": {
        "id": 1,
        "name": "Kids 1",
        "start_time": "17:00:00",
        "end_time": "18:00:00",
        "club": {
          "id": 1,
          "name": "Temple Manchester"
        }
      },
      "coverage": {
        "status": "pending",  // or "assigned"
        "covering_user": null  // or user object if assigned
      }
    }
  ]
}
```

### POST /api/holiday-requests/{id}/assign-coverage
Assign coverage for classes during a holiday (admin only).

**Request Body:**
```json
{
  "assignments": [
    {
      "date": "2025-02-10",
      "class_time_id": 1,
      "covering_user_id": 2,
      "notes": "Jane will cover Monday's class"
    },
    {
      "date": "2025-02-11",
      "class_time_id": 2,
      "covering_user_id": 3,
      "notes": "Bob will cover Tuesday's class"
    }
  ]
}
```

**Response 200:**
```json
{
  "message": "Coverage assigned successfully",
  "data": {
    // Updated holiday request with coverage assignments
  }
}
```

---

## 🎨 Event Types and Suggested Colors

- **class**: #FF8133 (Orange) - Regular scheduled classes
- **holiday**: #2196F3 (Blue) - Approved time off
- **overtime**: #4CAF50 (Green) - Extra hours/classes
- **custom**: #9C27B0 (Purple) - Special events, meetings, etc.

## 📝 Important Implementation Notes

1. **Authentication**: All endpoints require Bearer token authentication
2. **Permissions**:
   - Regular coaches can only view/modify their own events
   - Admins can view/modify all events
   - Holiday requests can be created by any coach but only approved by admins
3. **Offline Sync**: Use the `/api/rota/batch-sync` endpoint for offline support
4. **Coverage Flow**:
   - Holiday request creates draft rotas with status='cancelled'
   - Approval changes them to 'confirmed'
   - Coverage assignment updates user_id and sets is_cover=true
5. **Default Schedule**: Automatically derived from user's ClassTime assignments

## 🔄 Workflow Summary

1. **Coach requests holiday** → Creates draft cancelled events
2. **Admin approves** → Events become confirmed
3. **Admin assigns coverage** → Updates events with substitute coach
4. **Substitute confirms** → Coverage is finalized

The system is fully implemented and tested. All endpoints are operational and ready for frontend integration.