# Calendar System - Backend API Requirements

## Overview
This document outlines the backend API endpoints and data models required to support the offline-first calendar system for the TMA Admin Mobile app.

## Data Models

### CalendarEvent
```typescript
{
  id: integer,
  uuid: string,
  user_id: integer,              // Coach assigned to event
  club_id: integer | null,
  class_time_id: integer | null, // Link to class if applicable
  type: enum('class', 'holiday', 'overtime', 'custom'),
  status: enum('confirmed', 'pending', 'cancelled'),
  title: string,
  description: string | null,
  start_time: datetime,
  end_time: datetime,
  all_day: boolean,
  recurrence_pattern: string | null, // RRULE format
  recurrence_id: string | null,      // Groups recurring events
  color: string | null,
  metadata: json | null,              // Additional event data
  created_by: integer,
  updated_by: integer | null,
  created_at: datetime,
  updated_at: datetime
}
```

### HolidayRequest
```typescript
{
  id: integer,
  uuid: string,
  user_id: integer,           // Requesting coach
  start_date: date,
  end_date: date,
  reason: enum('holiday', 'sick', 'personal', 'other'),
  notes: string | null,
  status: enum('pending', 'approved', 'rejected', 'cancelled'),
  approved_by: integer | null,
  approved_at: datetime | null,
  rejection_reason: string | null,
  calendar_events: array<integer>, // Generated event IDs
  created_at: datetime,
  updated_at: datetime
}
```

### CoverageAssignment
```typescript
{
  id: integer,
  holiday_request_id: integer,
  original_user_id: integer,   // Original coach
  covering_user_id: integer,   // Substitute coach
  class_time_id: integer,
  date: date,
  status: enum('pending', 'confirmed', 'declined'),
  notes: string | null,
  created_by: integer,
  created_at: datetime,
  updated_at: datetime
}
```

## API Endpoints

### Calendar Events

#### GET /calendar/events
Retrieve calendar events with filtering options.

**Query Parameters:**
- `start_date` (required): ISO date string
- `end_date` (required): ISO date string
- `user_id`: Filter by specific user (admin only)
- `club_id`: Filter by club
- `type`: Filter by event type
- `include_team`: Boolean - include team members' events (for head coaches)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "user": {
        "id": 1,
        "name": "John Doe"
      },
      "type": "class",
      "status": "confirmed",
      "title": "Kids Class - Beginner",
      "start_time": "2025-02-01T17:00:00Z",
      "end_time": "2025-02-01T18:00:00Z",
      "club": {
        "id": 1,
        "name": "Temple Manchester"
      },
      "class_time": {
        "id": 1,
        "name": "Kids 1"
      }
    }
  ],
  "meta": {
    "total": 50,
    "has_conflicts": false
  }
}
```

#### POST /calendar/events
Create a new calendar event (admin/head coach only).

**Request Body:**
```json
{
  "user_id": 1,
  "type": "custom",
  "title": "Special Training Session",
  "description": "Advanced techniques workshop",
  "start_time": "2025-02-01T10:00:00Z",
  "end_time": "2025-02-01T12:00:00Z",
  "club_id": 1,
  "notify_user": true
}
```

#### PUT /calendar/events/{id}
Update an existing calendar event.

#### DELETE /calendar/events/{id}
Delete a calendar event.

#### POST /calendar/events/batch-sync
Sync multiple calendar changes from offline queue.

**Request Body:**
```json
{
  "events": [
    {
      "client_id": "temp-123",
      "operation": "create",
      "data": { /* event data */ }
    },
    {
      "id": 456,
      "operation": "update",
      "data": { /* updated fields */ }
    }
  ],
  "last_sync_timestamp": "2025-01-01T00:00:00Z"
}
```

**Response:**
```json
{
  "synced": [
    {
      "client_id": "temp-123",
      "server_id": 789,
      "status": "success"
    }
  ],
  "conflicts": [],
  "server_time": "2025-01-01T12:00:00Z"
}
```

### Holiday Requests

#### GET /calendar/holiday-requests
List holiday requests with filtering.

**Query Parameters:**
- `status`: Filter by status
- `user_id`: Filter by requesting user
- `date_from`: Start date range
- `date_to`: End date range
- `needs_coverage`: Boolean - only show requests needing coverage

#### POST /calendar/holiday-requests
Create a new holiday request.

**Request Body:**
```json
{
  "start_date": "2025-02-10",
  "end_date": "2025-02-14",
  "reason": "holiday",
  "notes": "Family holiday to Spain"
}
```

#### PUT /calendar/holiday-requests/{id}
Update holiday request (admin only for approval/rejection).

**Request Body:**
```json
{
  "status": "approved",
  "rejection_reason": null
}
```

#### GET /calendar/holiday-requests/{id}/affected-classes
Get list of classes affected by a holiday request.

**Response:**
```json
{
  "data": [
    {
      "date": "2025-02-10",
      "class_time": {
        "id": 1,
        "name": "Kids 1",
        "start_time": "17:00:00",
        "club": {
          "id": 1,
          "name": "Temple Manchester"
        }
      },
      "coverage": {
        "status": "pending",
        "covering_user": null
      }
    }
  ]
}
```

### Coverage Management

#### GET /calendar/coverage/available-coaches
Get available coaches for coverage.

**Query Parameters:**
- `date` (required): Date needing coverage
- `class_time_id` (required): Class needing coverage
- `skills`: Required skill tags

**Response:**
```json
{
  "data": [
    {
      "id": 2,
      "name": "Jane Smith",
      "availability": "available",
      "distance_km": 5.2,
      "skills": ["kids", "beginner"],
      "last_taught": "2025-01-15"
    }
  ]
}
```

#### POST /calendar/coverage/assign
Assign coverage for a holiday.

**Request Body:**
```json
{
  "holiday_request_id": 1,
  "assignments": [
    {
      "date": "2025-02-10",
      "class_time_id": 1,
      "covering_user_id": 2,
      "notes": "Jane will cover Monday kids class"
    }
  ]
}
```

#### PUT /calendar/coverage/{id}/confirm
Coach confirms/declines coverage assignment.

**Request Body:**
```json
{
  "status": "confirmed",
  "notes": "Happy to help"
}
```

### Default Schedule

#### GET /calendar/default-schedule
Get default weekly schedule for a user.

**Query Parameters:**
- `user_id`: Specific user (admin) or current user

**Response:**
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
    "Wednesday": [],
    // ... other days
  }
}
```

#### POST /calendar/populate-default
Populate calendar with default schedule for a date range.

**Request Body:**
```json
{
  "user_id": 1,
  "start_date": "2025-02-01",
  "end_date": "2025-02-28",
  "exclude_holidays": true
}
```

### Team Calendar

#### GET /calendar/team
Get calendar events for team members (head coach view).

**Query Parameters:**
- `start_date` (required): ISO date string
- `end_date` (required): ISO date string
- `include_self`: Boolean - include requesting user's events

**Response:**
Returns events for all coaches assigned to same class times as the requesting head coach.

## Notifications

The following notifications should be sent:

1. **Holiday Request Submitted** → Admin
2. **Holiday Request Approved/Rejected** → Requesting Coach
3. **Coverage Assignment** → Substitute Coach
4. **Coverage Confirmed** → Admin & Original Coach
5. **Schedule Change** → Affected Coach
6. **Reminder** → Coach (day before coverage)

## Permissions Matrix

| Endpoint | Admin | Head Coach | Coach | Assistant |
|----------|-------|------------|-------|-----------|
| View all calendars | ✓ | - | - | - |
| View team calendars | ✓ | ✓ | - | - |
| View own calendar | ✓ | ✓ | ✓ | ✓ |
| Create events | ✓ | Own team | - | - |
| Modify events | ✓ | Own team | - | - |
| Request holidays | ✓ | ✓ | ✓ | ✓ |
| Approve holidays | ✓ | - | - | - |
| Assign coverage | ✓ | - | - | - |
| Accept coverage | ✓ | ✓ | ✓ | ✓ |

## Performance Requirements

- Calendar event queries should return within 500ms
- Batch sync should handle up to 100 operations
- Support pagination for large date ranges
- Cache frequently accessed data (current month)
- Use database indexes on date, user_id, club_id fields

## Error Handling

All endpoints should return appropriate error codes:
- `400`: Invalid request parameters
- `401`: Unauthorized
- `403`: Forbidden (insufficient permissions)
- `404`: Resource not found
- `409`: Conflict (e.g., double booking)
- `422`: Validation error
- `500`: Server error

Error response format:
```json
{
  "error": true,
  "message": "Human readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": ["Validation error message"]
  }
}
```