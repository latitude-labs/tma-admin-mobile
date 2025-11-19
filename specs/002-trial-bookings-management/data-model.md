# Data Model: Trial Bookings Management

**Feature**: 002-trial-bookings-management
**Date**: 2025-11-16
**Purpose**: Define entity structures, validation rules, and state transitions

## Entity Definitions

### 1. Booking

Represents a trial session booking with participant details, scheduling, payment status, and attendance tracking.

#### Core Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Unique booking identifier |
| `uuid` | string | Yes | Globally unique identifier (UUID v4) |
| `names` | string | Yes | Participant name(s) - may include multiple names for family bookings |
| `email` | string | No | Participant contact email |
| `phone` | string | No | Participant contact phone number |
| `start_time` | string (ISO 8601) | Yes | Scheduled session start date/time |
| `cancelled_at` | string (ISO 8601) \| null | No | Timestamp when booking was cancelled |
| `checked_in_at` | string (ISO 8601) \| null | No | Timestamp when participant checked in |
| `no_show_at` | string (ISO 8601) \| null | No | Timestamp when participant marked as no-show |
| `no_show` | boolean | Yes | Whether participant was a no-show (legacy field) |
| `channel` | 'Cadence' \| 'Website' | Yes | Booking source system |
| `channel_display_name` | string | No | Human-readable channel name |
| `source` | string | No | Additional source tracking information |

#### Status Fields

| Attribute | Type | Required | Description | Valid Values |
|-----------|------|----------|-------------|--------------|
| `status` | string | No | Payment/conversion status | 'pending', 'paid_dd', 'paid_awaiting_dd', 'unpaid_dd', 'unpaid_coach_call', 'not_joining' |
| `attendance_status` | string | No | Attendance state | 'scheduled', 'completed', 'no-show', 'cancelled' |

**Default**: `status` defaults to 'pending', `attendance_status` defaults to 'scheduled'

#### Relationships

| Attribute | Type | Description |
|-----------|------|-------------|
| `class_time` | ClassTime \| undefined | Associated class schedule (includes day, time, coach, club) |
| `club` | Club \| undefined | Venue where trial is scheduled |

#### Validation Rules

1. **Email Format**: If provided, must be valid email address format
2. **Phone Format**: If provided, must be valid phone number (region-specific)
3. **start_time**: Must be valid ISO 8601 datetime string
4. **status**: Must be one of the defined enum values
5. **attendance_status**: Must be one of the defined enum values
6. **Outstanding Detection**: Booking is outstanding if:
   - `(status === 'pending' AND checked_in_at IS NOT NULL AND start_time < NOW())`
   - OR `(status === 'unpaid_coach_call')`

#### State Transitions

##### Payment Status State Machine

```
                                    ┌─────────────┐
                                    │   pending   │ (Initial state)
                                    └──────┬──────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
            ┌───────────────┐      ┌──────────────┐      ┌──────────────┐
            │   paid_dd     │      │ unpaid_dd    │      │ not_joining  │
            │  (END STATE)  │      │              │      │ (END STATE)  │
            └───────────────┘      └──────┬───────┘      └──────────────┘
                    ▲                      │
                    │                      ▼
            ┌───────┴────────────┐  ┌──────────────────┐
            │ paid_awaiting_dd   │  │unpaid_coach_call │
            │                    │  │                  │
            └────────────────────┘  └──────────────────┘
```

**Valid Transitions**:
- `pending` → `paid_dd` (Payment confirmed, DD setup complete)
- `pending` → `paid_awaiting_dd` (Payment received, DD setup pending)
- `pending` → `unpaid_dd` (No payment yet, DD scheduled)
- `pending` → `unpaid_coach_call` (Coach will follow up)
- `pending` → `not_joining` (Participant declined to continue)
- `paid_awaiting_dd` → `paid_dd` (DD setup completed)
- `unpaid_dd` → `paid_dd` (Payment processed)
- `unpaid_dd` → `unpaid_coach_call` (Payment failed, needs follow-up)
- `unpaid_coach_call` → `paid_dd` (Payment secured after follow-up)
- `unpaid_coach_call` → `not_joining` (Participant declined after follow-up)

**Invalid Transitions** (Backend should reject):
- `paid_dd` → any other status (final state)
- `not_joining` → any other status (final state)
- Any status → `pending` (no reversions to initial state)

##### Attendance Status State Machine

```
    ┌───────────┐
    │ scheduled │ (Initial state)
    └─────┬─────┘
          │
    ┌─────┼──────┐
    │     │      │
    ▼     ▼      ▼
┌─────┐ ┌────┐ ┌───────────┐
│comp │ │no- │ │ cancelled │
│leted│ │show│ │           │
└─────┘ └────┘ └───────────┘
```

**Valid Transitions**:
- `scheduled` → `completed` (Participant attended)
- `scheduled` → `no-show` (Participant did not attend)
- `scheduled` → `cancelled` (Booking cancelled in advance)

**Business Rule**: Payment status can only be updated after attendance status is set to `completed` or `no-show`.

#### Outstanding Booking Algorithm

```typescript
function isOutstandingBooking(booking: Booking): boolean {
  const now = new Date();
  const startTime = new Date(booking.start_time);

  // Only past bookings can be outstanding
  if (startTime >= now) {
    return false;
  }

  // Outstanding if pending and checked in (needs payment status update)
  if (booking.status === 'pending' && booking.checked_in_at !== null) {
    return true;
  }

  // Outstanding if needs coach follow-up
  if (booking.status === 'unpaid_coach_call') {
    return true;
  }

  return false;
}
```

**Sorting**: Outstanding bookings sorted by `start_time` ascending (oldest first)

---

### 2. KitItem

Represents an individual piece of equipment provided to a trial participant.

#### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | Yes | Item category |
| `size` | string | Yes | Selected size for this item |

#### Type-Size Matrix

| Type | Valid Sizes |
|------|-------------|
| `tshirt` | 'Small Youth', 'Medium Youth', 'Large Youth', 'XL Youth', 'Small', 'Medium', 'Large', 'XL', '2XL', '3XL' |
| `trousers` | 'Small Youth', 'Medium Youth', 'Large Youth', 'XL Youth', 'Small', 'Medium', 'Large', 'XL', '2XL', '3XL' |
| `gloves` | '8oz', '10oz', '12oz', '14oz', '16oz' |
| `shinpads` | 'Small', 'Medium', 'Large', 'XL' |
| `kitbag` | 'One Size' |

#### Validation Rules

1. **type**: Must be one of: 'tshirt', 'trousers', 'gloves', 'shinpads', 'kitbag'
2. **size**: Must be valid for the given type (see matrix above)
3. **Completeness**: Both type and size must be provided
4. **Package Consistency**: Kit items array must match selected package:
   - Basic: tshirt, trousers, gloves (exactly 3 items)
   - Silver: tshirt, trousers, gloves, shinpads (exactly 4 items)
   - Gold: tshirt, trousers, gloves, shinpads, kitbag (exactly 5 items)

#### TypeScript Interface

```typescript
interface KitItem {
  type: 'tshirt' | 'trousers' | 'gloves' | 'shinpads' | 'kitbag';
  size: string;
}
```

---

### 3. KitPackage (Enumeration)

Represents predefined kit bundles available for purchase.

#### Package Definitions

| Package | Items Included | Item Count |
|---------|---------------|------------|
| **Basic** | T-shirt, Trousers, Boxing gloves | 3 |
| **Silver** | T-shirt, Trousers, Boxing gloves, Shin pads | 4 |
| **Gold** | T-shirt, Trousers, Boxing gloves, Shin pads, Kit bag | 5 |

#### TypeScript Type

```typescript
type KitPackage = 'basic' | 'silver' | 'gold';

const KIT_PACKAGE_ITEMS: Record<KitPackage, Array<KitItem['type']>> = {
  basic: ['tshirt', 'trousers', 'gloves'],
  silver: ['tshirt', 'trousers', 'gloves', 'shinpads'],
  gold: ['tshirt', 'trousers', 'gloves', 'shinpads', 'kitbag'],
};
```

#### Business Rules

1. **Package Selection Required**: When status is 'paid_dd' or 'paid_awaiting_dd', package must be selected
2. **Size Selection Required**: All items in selected package must have sizes specified
3. **Immutability**: Once kit items submitted, they cannot be changed (business policy - contact support for changes)

---

### 4. Reminder

Represents a scheduled follow-up task for a coach to contact a trial participant.

#### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Unique reminder identifier |
| `booking_id` | number | Yes | Associated booking ID |
| `reminder_time` | string (ISO 8601) | Yes | When reminder should trigger |
| `created_at` | string (ISO 8601) | Yes | When reminder was created |
| `completed_at` | string (ISO 8601) \| null | No | When reminder was marked complete |

#### Relationships

- **Booking**: Many-to-One (Reminder belongs to Booking)
- **User/Coach**: Many-to-One (Reminder assigned to coach - inferred from booking's class_time coach)

#### Validation Rules

1. **reminder_time**: Must be in the future (> NOW() at creation time)
2. **reminder_time**: Must be valid ISO 8601 datetime string
3. **booking_id**: Must reference an existing booking
4. **Status Constraint**: Reminders only created when booking status is 'unpaid_coach_call'

#### State Transitions

```
┌─────────┐     completeReminder()     ┌───────────┐
│ Active  │ ────────────────────────> │ Completed │
└─────────┘                            └───────────┘
   │
   │ (reminder_time reached)
   │
   ▼
┌─────────┐
│Triggered│ ──> Notification sent
└─────────┘
```

#### TypeScript Interface

```typescript
interface Reminder {
  id: number;
  booking_id: number;
  reminder_time: string; // ISO 8601
  created_at: string;    // ISO 8601
  completed_at: string | null; // ISO 8601 or null
}
```

---

### 5. ClassTime (Reference)

Represents a scheduled class session (referenced by Booking).

#### Relevant Attributes (for Trial Bookings context)

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | number | Unique class time identifier |
| `name` | string | Class name (e.g., "Kids Muay Thai") |
| `day` | string | Day of week |
| `start_time` | string | Class start time |
| `coaches` | string | Coach name(s) assigned to class |
| `club` | Club | Associated venue |

**Usage**: Used for filtering "Mine" vs "All" bookings - bookings where `class_time.coaches` includes current user's name are shown in "Mine" view.

---

### 6. Club (Reference)

Represents a training venue (referenced by Booking and ClassTime).

#### Relevant Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | number | Unique club identifier |
| `name` | string | Club/venue name |
| `address` | string | Physical address |
| `postcode` | string | Postal code |

**Usage**: Displayed on booking cards to show where trial is scheduled.

---

## Derived Data

### Outstanding Bookings Count

**Calculation**: Count of bookings where `isOutstandingBooking(booking) === true`

**Display Location**: Badge on "Outstanding" section header

**Purpose**: Quickly show coaches how many actions they need to take

---

### Booking Statistics

**Source**: Separate API endpoint `/bookings/stats`

**Metrics**:
- Total bookings
- Converted bookings (status === 'paid_dd')
- Pending bookings (status === 'pending')
- Not joining (status === 'not_joining')
- Conversion rate (converted / total)

**Usage**: Dashboard analytics (not directly part of Trial Bookings tab)

---

## Relationship Diagram

```
┌──────────────────────────────────────────┐
│              Booking                     │
│ ─────────────────────────────────────── │
│ • id, uuid, names, email, phone         │
│ • start_time, status, attendance_status │
│ • checked_in_at, cancelled_at           │
└────┬──────────────────────┬──────────────┘
     │                      │
     │ N:1                  │ 1:N
     │                      │
     ▼                      ▼
┌─────────────┐      ┌────────────┐
│  ClassTime  │      │  Reminder  │
│ ─────────── │      │ ────────── │
│ • id, name  │      │ • id       │
│ • coaches   │      │ • booking_id│
│ • club      │      │ • reminder_ │
└─────┬───────┘      │   time     │
      │              └────────────┘
      │ N:1
      │
      ▼
┌─────────────┐
│    Club     │
│ ─────────── │
│ • id, name  │
│ • address   │
└─────────────┘


 ┌──────────────────────────────────┐
 │ UpdateBookingConversionStatus    │
 │ ────────────────────────────────│
 │ Request Parameters:              │
 │ • status                         │
 │ • kit_items[] (KitItem)         │
 │ • package_name (KitPackage)     │
 │ • reminder_time                  │
 └──────────────────────────────────┘
```

---

## Business Rules Summary

1. **Outstanding Definition**: Booking is outstanding if pending with check-in OR unpaid_coach_call status
2. **End States**: Only 'paid_dd' and 'not_joining' remove bookings from Outstanding section
3. **Attendance Prerequisite**: Payment status updates require attendance to be marked (completed or no-show)
4. **Kit Package Consistency**: Kit items array must match selected package (3, 4, or 5 items)
5. **Reminder Future Constraint**: Reminder time must be in the future when created
6. **Status Irreversibility**: Cannot transition from end states (paid_dd, not_joining) back to other statuses
7. **Mine View Filter**: Bookings where class_time.coaches includes current user
8. **Search Scope**: Search applies to both Outstanding and All sections simultaneously
9. **Outstanding Sort**: Always oldest first (ascending start_time)
10. **All Section Sort**: Newest first (descending start_time)

---

## Validation Checklist

When implementing, validate:

- [ ] Booking status can only be updated after attendance marked
- [ ] Kit items array length matches selected package
- [ ] All kit items have both type and size
- [ ] Kit item types match package definition
- [ ] Kit item sizes are valid for their types
- [ ] Reminder time is in the future
- [ ] Outstanding bookings exclude future bookings
- [ ] Outstanding bookings exclude end states (paid_dd, not_joining)
- [ ] Status transitions follow state machine rules
- [ ] Search filters both Outstanding and All sections
- [ ] Outstanding section sorts by oldest first
- [ ] Text fallbacks prevent undefined rendering (e.g., `{booking.names || ''}`)

---

## Frontend-Backend Contract

### Booking Status Update

**Endpoint**: `PUT /bookings/{id}/conversion-status`

**Request**:
```json
{
  "status": "paid_dd",
  "kit_items": [
    { "type": "tshirt", "size": "Large" },
    { "type": "trousers", "size": "Medium" },
    { "type": "gloves", "size": "12oz" }
  ],
  "package_name": "basic"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Booking status updated successfully",
  "booking": {
    "id": 123,
    "status": "paid_dd",
    "kit_order_id": 456,
    "reminder_id": null
  }
}
```

### Attendance Status Update

**Endpoint**: `PUT /bookings/{id}/status`

**Request**:
```json
{
  "status": "completed"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Attendance status updated",
  "booking": { /* full booking object */ }
}
```

### Reminder Creation (via Conversion Status)

**Request**:
```json
{
  "status": "unpaid_coach_call",
  "reminder_time": "2025-11-17T14:00:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Booking status updated and reminder scheduled",
  "booking": {
    "id": 123,
    "status": "unpaid_coach_call",
    "reminder_id": 789
  }
}
```

---

## Implementation Notes

### TypeScript Types Location

All types defined in `/types/api.ts`:
- `Booking`
- `KitItem` (may need enhancement)
- `Reminder`
- `ClassTime`
- `Club`

### Zustand Store Structure

`/store/bookingStore.ts` should maintain:
```typescript
{
  allBookings: Booking[],          // Full list (paginated chunks)
  bookings: Booking[],              // Filtered list (search + view mode)
  pagination: PaginationState,
  filters: { searchQuery: string },
  viewMode: 'mine' | 'all',
  isLoading: boolean,
  error: string | null,
  isOffline: boolean,
  lastSync: string | null,
}
```

### Computed Values (useMemo in component)

```typescript
const outstandingBookings = useMemo(() =>
  bookings
    .filter(isOutstandingBooking)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
  [bookings]
);

const allBookings = useMemo(() =>
  bookings.filter(b => !isOutstandingBooking(b)),
  [bookings]
);
```

---

This data model provides the complete entity structure, validation rules, state machines, and business logic required to implement the Trial Bookings Management feature.
