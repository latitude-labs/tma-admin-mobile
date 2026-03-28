# Trial Bookings Redesign — Design Spec

## Overview

Restructure how coaches interact with trial bookings. Move trials off the home page into a dedicated club-by-club pager with an end-of-day report gate. Replace the current status flow with an expanding bottom sheet that captures enroller, booking status, licence details, and kit/package selection.

## Navigation & Screen Structure

### Home Page — Trials Banner

A persistent `TrialsBanner` component on the dashboard:

- **Outstanding bookings exist:** Highlighted (orange border, warm background), shows count ("8 outstanding to review"), taps through to Trials tab
- **No outstanding bookings:** Muted (grey background, grey text), shows "All up to date", still tappable

### Trials Tab — Club Pager

The Trials tab becomes a horizontal swipeable pager with one page per club:

- **Club name** displayed as a header with **page indicator dots** below
- Each page shows a `ClubTrialsList` — the list of trial bookings for that club (today's bookings)
- Each booking card shows: name, class/time, attendance badge, booking status badge
- Unset statuses show a muted placeholder (dash)

### Submit Report Button

Pinned at the bottom of each club page:

- **Disabled** until every booking in the club has both:
  1. Attendance recorded (checked in or no-show)
  2. Booking status set (one of the 7 statuses)
- Shows progress while disabled: "4/8 complete"
- Shows "All N complete" with a check when ready
- **Active** (orange) when all bookings are marked — taps to submit the end-of-day report for that club

### Header Padding Fix

Fix existing header padding issue (noted by client).

## Booking Flow — Bottom Sheet

When a coach taps a trial booking, an expanding bottom sheet opens with a stepped flow. This applies both for first-time status setting and for amending a previously-set status.

### Step 1: Enroller (always shown)

- Half-height bottom sheet
- **Coach dropdown** populated from `coaches.service.ts`
- Auto-filled to the currently logged-in coach
- Helper text: "Auto-filled to you. Change if covering for another coach."
- Rarely changed — exists for edge cases where someone is covering

### Step 2: Booking Status (always shown)

7 status options in this order:

1. **Fully Paid** — (renamed from "Paid (Direct Debit)"). Hint: "Kit + Licence →"
2. **Paid (awaiting DD)** — Hint: "Kit + Licence →"
3. **Deposit and DD** — new status
4. **Deposit only** — new status
5. **Unpaid (DD Scheduled)**
6. **Unpaid**
7. **Not Joining** — styled in red/warning, always visible

**Flow branching after status selection:**

- **Fully Paid** or **Paid (awaiting DD):** proceed to Step 3 (Licence Details), then Step 4 (Kit/Package). Step counter shows "Step N of 4".
- **Deposit and DD, Deposit only, Unpaid (DD Scheduled), Unpaid:** flow ends. Step counter shows "Step 2 of 2".
- **Not Joining:** flow ends. If the booking previously had a Paid status, show confirmation dialog: "This will cancel their kit order. Continue?" — on confirm, auto-delete kit orders via API.

### Step 3: Licence Details (Paid statuses only)

Sheet expands to near-full height for form entry:

- **Name** — text input, auto-filled from booking name, editable
- **Date of Birth** — date picker
- **Address** — large multi-line text input

Note: British English spelling "Licence" throughout.

### Step 4: Kit / Package Selection (Paid statuses only)

Package options in order:

1. **Licence** — T-shirt, Trousers (new package)
2. **Basic** — T-shirt, Trousers, Gloves
3. **Silver** — T-shirt, Trousers, Gloves, Shinpads
4. **Gold** — T-shirt, Trousers, Gloves, Shinpads, Kit bag

Selected package is highlighted with orange border and checkmark. After package selection, proceeds to size selection for each item (existing flow).

## Component Architecture

### New Components

| Component | Path | Purpose |
|-----------|------|---------|
| `TrialsBanner` | `components/features/TrialsBanner.tsx` | Home page CTA with outstanding count |
| `ClubPager` | `components/features/trials/ClubPager.tsx` | Horizontal swipe container with page indicators |
| `ClubTrialsList` | `components/features/trials/ClubTrialsList.tsx` | Single club's booking list + Submit Report button |
| `BookingFlowSheet` | `components/features/trials/BookingFlowSheet.tsx` | Expanding bottom sheet orchestrating the steps |
| `EnrollerStep` | `components/features/trials/steps/EnrollerStep.tsx` | Coach dropdown, auto-filled |
| `StatusStep` | `components/features/trials/steps/StatusStep.tsx` | 7 status options |
| `LicenceDetailsStep` | `components/features/trials/steps/LicenceDetailsStep.tsx` | Name, DoB, Address form |
| `KitPackageStep` | `components/features/trials/steps/KitPackageStep.tsx` | Package + size selection |

### Modified Files

| File | Changes |
|------|---------|
| `app/(tabs)/trials.tsx` | Replace with ClubPager-based screen |
| `app/(tabs)/dashboard.tsx` | Add TrialsBanner component |
| `store/bookingStore.ts` | New statuses, report gate logic, outstanding count per club |
| `services/api/bookings.service.ts` | New endpoints for enroller, licence details, kit deletion |
| `types/api.ts` | Updated BookingStatus type, LicenceDetails type, enroller field |

### Reused As-Is

- `services/api/coaches.service.ts` — provides coach list for enroller dropdown
- `store/endOfDayStore.ts` — report submission
- All existing UI components (Button, Card, Input, Chip, GlassView)

## Data Model & API Changes

### Updated Types

```typescript
type BookingStatus =
  | 'fully_paid'           // renamed from 'paid_dd'
  | 'paid_awaiting_dd'
  | 'deposit_and_dd'       // new
  | 'deposit_only'         // new
  | 'unpaid_dd'            // "Unpaid (DD Scheduled)"
  | 'unpaid'
  | 'not_joining';

interface LicenceDetails {
  name: string;
  date_of_birth: string;  // ISO date string
  address: string;
}

// Additions to Booking interface
interface Booking {
  // ... existing fields
  enroller_id?: number;
  licence_details?: LicenceDetails;
}

type PackageName = 'licence' | 'basic' | 'silver' | 'gold';
```

### API Changes (for backend team)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `PUT` | `/bookings/{id}/conversion-status` | **Update:** Accept new status values (`fully_paid`, `deposit_and_dd`, `deposit_only`), plus `enroller_id` and `licence_details` fields in request body |
| `DELETE` | `/bookings/{id}/kit-orders` | **New endpoint:** Delete all kit orders for a booking. Called when status changes from a Paid status to Not Joining. |
| `GET` | `/bookings` | **Update:** Response should include `enroller_id` and `licence_details` fields when set |
| `GET` | `/bookings/totals` | **Update:** Include `outstanding_count` (bookings missing attendance or booking status) grouped by club, for the home page banner |

### Migration Note

The existing `paid_dd` status needs migrating to `fully_paid` on the backend. The app should handle both values during the transition period, mapping `paid_dd` → `fully_paid` for display. Coordinate cutover timing with the backend team.

## Business Rules

1. **Report gate:** Submit Report is disabled until every booking for that club has both attendance and booking status set.
2. **Kit order auto-deletion:** When booking status changes from any Paid status (fully_paid, paid_awaiting_dd) to Not Joining, prompt for confirmation, then delete kit orders.
3. **Enroller always shown:** The enroller step appears every time a booking is tapped (first time or amendment), auto-filled to current coach.
4. **Licence Details only for Paid:** Steps 3 and 4 only appear when status is Fully Paid or Paid (awaiting DD).
5. **Licence package contents:** T-shirt + Trousers only (2 items).

## Design System

All new components follow the existing liquid glass design system:

- Warm gradient backgrounds on screens
- GlassView for card surfaces
- Two-tier shadow system (subtle/elevated)
- Reanimated spring animations for sheet and transitions
- useThemeColors for all dynamic colours
- Min 44pt touch targets
