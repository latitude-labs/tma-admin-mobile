# Feature Specification: Trial Bookings Management for Coaches

**Feature Branch**: `002-trial-bookings-management`
**Created**: 2025-11-16
**Status**: Draft
**Input**: User description: "Please review the current implementation of the Trial Bookings tab for non-admin coaches, and ensure it aligns with the following notes about the feature:

The coach needs to be able to mark whether the trial:
- showed up in the first place
- paid for their kit
- set up their Direct Debit

They will be able to select the following options in-app:
- Paid (Direct Debit) - Payment confirmed via DD
- Paid (Awaiting DD) - Payment made, DD setup pending
- Unpaid (DD Scheduled) - Will be billed via Direct Debit
- Unpaid (Follow Up) - Coach will contact for payment
- Not Joining - Decided not to continue

The trial will count as 'outstanding' for as long as it is not either 'Paid (Direct Debit)' or 'Not Joining' - i.e. those are the only two end states for a completed booking.

Under the Trial Bookings tab (second) for a coach (non-admin view), we should show a search field, and then two sections - Outstanding and All.
Outstanding will show any outstanding bookings (ordered by oldest first), then all will show a paginated list of all trials. Both can be search through with the search field.

As well as this, ensure the design is beautiful, matches the design system of the rest of the app, and is easy-to-use."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Coach Views Outstanding Trial Bookings (Priority: P1)

A coach needs to quickly identify which trial participants require follow-up action after their session has occurred. They should see all pending bookings that need status updates or payment confirmation, prioritized by date to ensure the oldest trials are addressed first.

**Why this priority**: This is the core workflow that ensures coaches don't lose track of trial participants and can maintain high conversion rates through timely follow-up.

**Independent Test**: Can be fully tested by scheduling trial bookings, checking participants in, and verifying they appear in the Outstanding section until their payment status is finalized or they're marked as not joining.

**Acceptance Scenarios**:

1. **Given** a coach has trial bookings from last week that are checked-in but status is still 'pending', **When** they open the Trial Bookings tab, **Then** those bookings appear in the "Outstanding" section ordered by oldest first
2. **Given** a coach has a trial booking with status 'unpaid_coach_call', **When** they view the Outstanding section, **Then** this booking is displayed as requiring action
3. **Given** a coach updates a trial booking to 'paid_dd', **When** the update completes, **Then** the booking is removed from the Outstanding section
4. **Given** a coach updates a trial booking to 'not_joining', **When** the update completes, **Then** the booking is removed from the Outstanding section
5. **Given** there are no bookings requiring action, **When** the coach views the Trial Bookings tab, **Then** the Outstanding section is not displayed

---

### User Story 2 - Coach Updates Trial Payment Status (Priority: P1)

A coach needs to record the payment and kit status for a trial participant who has completed their session. This includes documenting whether they attended, what payment arrangement was made, and what kit items they received.

**Why this priority**: Accurate payment status tracking is essential for business operations, revenue tracking, and ensuring proper follow-up with trial participants.

**Independent Test**: Can be fully tested by creating a checked-in trial booking, selecting each payment status option, and verifying the correct downstream actions (kit selection modal for paid statuses, reminder modal for follow-up status).

**Acceptance Scenarios**:

1. **Given** a trial participant has checked in, **When** a coach selects "Paid (Direct Debit)", **Then** the kit selection flow is presented to capture package and size information
2. **Given** a trial participant has checked in, **When** a coach selects "Paid (Awaiting DD)", **Then** the kit selection flow is presented
3. **Given** a trial participant has checked in, **When** a coach selects "Unpaid (DD Scheduled)", **Then** the status is updated without additional prompts
4. **Given** a trial participant has checked in, **When** a coach selects "Unpaid (Follow Up)", **Then** a reminder scheduling interface is presented
5. **Given** a trial participant did not show up, **When** a coach selects "Not Joining", **Then** the booking is marked as completed with no further action required

---

### User Story 3 - Coach Records Kit Items for Paid Trials (Priority: P2)

When a trial participant pays for their membership, the coach needs to record which kit package they selected (Basic, Silver, or Gold) and the specific sizes for each item in that package.

**Why this priority**: Proper kit inventory tracking ensures the business can manage stock levels and provides a record of what was provided to each member.

**Independent Test**: Can be fully tested by selecting a paid payment status and completing the two-step kit selection flow (package selection, then size selection for all items in that package).

**Acceptance Scenarios**:

1. **Given** a coach selects a paid status, **When** the kit modal appears, **Then** they see three package options: Basic (T-shirt, Trousers, Boxing gloves), Silver (adds Shinpads), and Gold (adds Kit bag)
2. **Given** a coach selects the Basic package, **When** they proceed to size selection, **Then** they can specify sizes for T-shirt, Trousers, and Boxing gloves
3. **Given** a coach selects the Silver package, **When** they proceed to size selection, **Then** they can specify sizes for T-shirt, Trousers, Boxing gloves, and Shinpads
4. **Given** a coach selects the Gold package, **When** they proceed to size selection, **Then** they can specify sizes for all items including Kit bag
5. **Given** a coach is on the size selection step, **When** they press back, **Then** they return to package selection
6. **Given** a coach completes all size selections, **When** they submit the form, **Then** the booking is updated with the payment status and kit items

---

### User Story 4 - Coach Schedules Follow-Up Reminder (Priority: P2)

When a trial participant needs to be contacted about payment, the coach needs to set a reminder for when to follow up with them.

**Why this priority**: Systematic follow-up scheduling improves conversion rates by ensuring no trial participant falls through the cracks.

**Independent Test**: Can be fully tested by selecting "Unpaid (Follow Up)" status and verifying the reminder date/time picker interface appears and saves correctly.

**Acceptance Scenarios**:

1. **Given** a coach selects "Unpaid (Follow Up)" status, **When** the modal appears, **Then** they see a date and time picker defaulted to tomorrow
2. **Given** a coach is setting a reminder, **When** they select a date, **Then** the date picker allows them to choose any future date
3. **Given** a coach is setting a reminder, **When** they select a time, **Then** the time picker allows them to choose any time of day
4. **Given** a coach has selected a reminder date and time, **When** they confirm, **Then** the booking is updated with status 'unpaid_coach_call' and the reminder is scheduled

---

### User Story 5 - Coach Searches and Filters Trial Bookings (Priority: P3)

A coach needs to find specific trial bookings by searching for participant names, email addresses, or phone numbers. They also need to switch between viewing only their bookings and all bookings across the organization.

**Why this priority**: Search functionality enables coaches to quickly locate specific participants without scrolling through long lists, improving efficiency.

**Independent Test**: Can be fully tested by creating multiple bookings with different attributes, then verifying search filters the displayed results correctly in both Outstanding and All sections.

**Acceptance Scenarios**:

1. **Given** a coach has multiple trial bookings, **When** they type a participant name in the search field, **Then** both Outstanding and All sections filter to show only matching bookings
2. **Given** a coach has searched for a participant, **When** they clear the search, **Then** all bookings are displayed again
3. **Given** a coach is viewing the Trial Bookings tab, **When** they switch to "All" view mode, **Then** they see bookings from all coaches
4. **Given** a coach is viewing the Trial Bookings tab, **When** they switch to "Mine" view mode, **Then** they see only bookings assigned to them
5. **Given** search results return no matches, **When** the coach views the screen, **Then** they see a helpful empty state with a "Clear Search" option

---

### User Story 6 - Coach Marks Attendance for Scheduled Trials (Priority: P1)

Before a trial's payment status can be updated, the coach needs to mark whether the participant showed up for their scheduled session or was a no-show.

**Why this priority**: Attendance tracking is a prerequisite for all other status updates and provides essential metrics on trial show-up rates.

**Independent Test**: Can be fully tested by creating a scheduled trial booking and verifying the "Check In" and "No Show" action buttons appear and update the attendance status correctly.

**Acceptance Scenarios**:

1. **Given** a trial booking is scheduled for today or in the past, **When** the coach views the booking, **Then** they see "Check In" and "No Show" action buttons
2. **Given** a coach presses "Check In", **When** the action completes, **Then** the booking shows as checked in and the "Update Kit Status" button appears
3. **Given** a coach presses "No Show", **When** the action completes, **Then** the booking is marked with attendance status 'no-show'
4. **Given** a trial booking is scheduled for the future, **When** the coach views the booking, **Then** no attendance action buttons are displayed
5. **Given** a coach has checked in a participant, **When** they press "Update Kit Status", **Then** the payment status selection modal appears

---

### Edge Cases

- What happens when a coach loses internet connectivity while updating a booking status?
- How does the system handle a booking that's been updated by another coach simultaneously?
- What happens if a coach tries to add kit items without selecting a package first?
- How does the system handle search queries with special characters or very long strings?
- What happens when the All section has hundreds of pages of bookings?
- How does the system handle bookings with missing or incomplete participant information?
- What happens if a coach sets a reminder date in the past?
- How are bookings sorted when multiple bookings have the same date/time?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display trial bookings in two distinct sections: "Outstanding" and "All"
- **FR-002**: Outstanding section MUST include all bookings with status 'pending' that have been checked in, plus all bookings with status 'unpaid_coach_call'
- **FR-003**: Outstanding section MUST order bookings by oldest first (earliest start_time first)
- **FR-004**: All section MUST display bookings that are not in the Outstanding section
- **FR-005**: All section MUST support pagination when more bookings exist than can be displayed on one page
- **FR-006**: System MUST provide a search field that filters both Outstanding and All sections simultaneously
- **FR-007**: Search MUST match against participant names, email addresses, and phone numbers
- **FR-008**: System MUST provide two view modes: "Mine" (only bookings assigned to the current coach) and "All" (bookings from all coaches)
- **FR-009**: System MUST display action buttons for scheduled bookings: "Check In" and "No Show"
- **FR-010**: System MUST display "Update Kit Status" button for bookings that are checked in but have status 'pending'
- **FR-011**: Clicking "Update Kit Status" MUST present a modal with five payment status options
- **FR-012**: Selecting "Paid (Direct Debit)" or "Paid (Awaiting DD)" MUST trigger the kit selection flow
- **FR-013**: Selecting "Unpaid (Follow Up)" MUST trigger the reminder scheduling flow
- **FR-014**: Selecting "Unpaid (DD Scheduled)" or "Not Joining" MUST update the status immediately without additional prompts
- **FR-015**: Kit selection flow MUST be a two-step process: package selection, then size selection
- **FR-016**: Package selection MUST offer three options: Basic (3 items), Silver (4 items), and Gold (5 items)
- **FR-017**: Size selection MUST present input fields for all items in the selected package
- **FR-018**: System MUST validate that all kit items have both type and size selected before allowing submission
- **FR-019**: Reminder scheduling MUST provide date and time pickers with a default value of tomorrow
- **FR-020**: System MUST prevent setting reminder dates in the past
- **FR-021**: A booking MUST be considered "outstanding" until its status is either 'paid_dd' or 'not_joining'
- **FR-022**: System MUST provide real-time search filtering as the user types in the search field
- **FR-023**: System MUST display an empty state when no bookings match the search criteria
- **FR-024**: System MUST hide the Outstanding section when there are no outstanding bookings
- **FR-025**: System MUST support offline viewing of previously loaded bookings
- **FR-026**: System MUST indicate offline mode status when connectivity is unavailable
- **FR-027**: System MUST support pull-to-refresh to fetch latest booking data
- **FR-028**: Each booking card MUST display participant name, date/time, club, contact information, and current status
- **FR-029**: System MUST use visual status indicators (colored dots and badges) to show booking state at a glance
- **FR-030**: System MUST provide haptic feedback on user interactions for enhanced tactile response (iOS only)

### Key Entities *(include if feature involves data)*

- **Booking**: Represents a trial session booking with attributes including participant details (name, email, phone), scheduling information (start_time, club, class_time), payment status (pending, paid_dd, paid_awaiting_dd, unpaid_dd, unpaid_coach_call, not_joining), attendance status (scheduled, completed, no-show, cancelled), and relationships to Club and ClassTime entities

- **Kit Item**: Represents an individual piece of equipment provided to a trial participant, with attributes for type (tshirt, trousers, gloves, shinpads, kitbag) and size (varies by type)

- **Reminder**: Represents a scheduled follow-up task for a coach to contact a trial participant about payment, with attributes for booking_id and reminder_time

- **Coach/User**: Represents the coach viewing the trial bookings, used to filter bookings in "Mine" view mode

- **Kit Package**: Represents one of three predefined kit bundles (Basic, Silver, Gold) with associated items

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Coaches can identify all outstanding trial bookings requiring action within 5 seconds of opening the tab
- **SC-002**: Coaches can complete the full status update workflow (from pending to final status with kit details) in under 60 seconds
- **SC-003**: 95% of trial status updates are completed within 24 hours of the session occurring (measured by time between check-in and status update)
- **SC-004**: Search results appear instantly (under 200ms) as the coach types
- **SC-005**: The Outstanding section automatically updates when a booking's status changes, removing completed bookings immediately
- **SC-006**: 100% of kit items recorded include both package type and all required size information
- **SC-007**: Coaches can switch between "Mine" and "All" view modes with visual feedback in under 1 second
- **SC-008**: System maintains data consistency when coaches update bookings while offline, syncing changes when connectivity returns
- **SC-009**: The interface follows the app's design system with consistent spacing, colors, typography, and animation patterns
- **SC-010**: Touch targets for all interactive elements meet minimum accessibility standards (44x44 points)

## Assumptions

1. Attendance must be marked (checked-in or no-show) before payment status can be updated
2. Kit items are only relevant for paid statuses (paid_dd and paid_awaiting_dd)
3. Reminders are only needed for the "Unpaid (Follow Up)" status
4. The "Mine" view filters bookings based on the class_time's coach assignment
5. Pagination defaults to 20 bookings per page in the All section
6. Outstanding bookings are not paginated (all shown at once) since they require immediate attention
7. Search is case-insensitive and matches partial strings
8. Kit bag size is always "One Size" for the Gold package
9. Once a booking reaches 'paid_dd' or 'not_joining' status, it cannot be moved back to an outstanding state
10. The system stores kit items and package information separately for inventory tracking
11. Reminder notifications will be handled by a separate notification system
12. The app uses optimistic updates for better perceived performance, with rollback on server error
13. Size options are predefined and consistent across all clubs
14. Bookings older than 90 days are archived and not shown in this view
