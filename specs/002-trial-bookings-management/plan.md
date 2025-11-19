# Implementation Plan: Trial Bookings Management for Coaches

**Branch**: `002-trial-bookings-management` | **Date**: 2025-11-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-trial-bookings-management/spec.md`

## Summary

Enhance the Trial Bookings tab to provide coaches with a streamlined workflow for managing trial participant status updates, payment tracking, and kit distribution. The feature implements a two-section view (Outstanding and All), comprehensive payment status options, multi-step kit selection flow, and follow-up reminder scheduling. The implementation follows the existing Expo/React Native architecture using Zustand for state management, React Hook Form for forms, and React Native Reanimated for animations.

**Technical Approach**: Enhance existing `/app/(tabs)/trials.tsx` screen and `/store/bookingStore.ts` with improved logic for outstanding bookings detection, add multi-modal flows for kit selection and reminders, integrate with `/services/api/bookings.service.ts` for status updates, and ensure full adherence to the TMA Admin Mobile constitution (dynamic theming, type safety, accessibility).

## Technical Context

**Language/Version**: TypeScript 5.9.2 (strict mode enabled) / React Native 0.81.4
**Primary Dependencies**: Expo SDK 54.0.7, Expo Router 6.0.4, React 19.1.0, Zustand 5.0.8, React Hook Form 7.62.0, Axios 1.12.2, React Native Reanimated 4.1.0
**Storage**: AsyncStorage (via Zustand persist middleware for offline bookings cache)
**Testing**: No testing framework currently established - defensive coding and TypeScript strict mode provide compile-time safety
**Target Platform**: iOS 15+ and Android (React Native 0.81.4 with New Architecture enabled)
**Project Type**: Mobile (Expo/React Native) - source structure: `app/`, `components/`, `services/`, `store/`, `types/`
**Performance Goals**: 60 FPS scrolling for booking lists, <200ms search filtering, instant UI feedback with optimistic updates
**Constraints**: Offline-first architecture (queue updates when offline, sync on reconnection), <300ms perceived response time for status updates, minimum 44x44pt touch targets
**Scale/Scope**: ~50-200 trial bookings per coach per month, paginated view for scalability, support for multiple coaches viewing shared bookings

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with TMA Admin Mobile Constitution (v1.0.0):

- [x] **Design System**: Will use `useThemeColors()` hook and `useMemo` for styles?
  - ✅ All components already use `const palette = useThemeColors()` and `useMemo(() => createStyles(palette), [palette])`
  - ✅ No hardcoded hex colors in component code (only in Theme.ts/Colors.ts constants)

- [x] **Type Safety**: All types defined, strict mode compatible, proper error handling?
  - ✅ Booking, BookingStatus, KitItem types defined in types/api.ts
  - ✅ All modals and forms have proper TypeScript interfaces
  - ✅ Error handling uses try-catch with Alert.alert for user feedback

- [x] **Component Architecture**: No hooks in loops/render functions, text fallbacks, proper extraction?
  - ✅ Current implementation correctly extracts `renderBookingCard` without hooks inside map()
  - ✅ All text uses fallbacks: `{booking.names || ''}`, `{booking.email || ''}`
  - ✅ Conditional rendering uses ternary: `{condition ? <Component /> : null}`

- [x] **Accessibility**: Touch targets 44x44, accessibility labels, haptic feedback, loading states?
  - ✅ Action buttons use minimum height 48px (exceeds 44pt requirement)
  - ✅ Haptic feedback implemented via `expo-haptics` on all interactions
  - ✅ Loading states shown via ActivityIndicator and pulseOpacity animation
  - ⚠️  **IMPROVEMENT NEEDED**: Add explicit accessibilityLabel props to interactive elements

- [x] **Performance**: Memoization strategy, FlatList optimization, Reanimated for animations?
  - ✅ Styles memoized with useMemo based on palette
  - ⚠️  **IMPROVEMENT NEEDED**: Replace ScrollView with FlatList for better performance with large lists
  - ✅ Animations use React Native Reanimated 4.1.0 (FadeIn, FadeInDown, FadeInUp, withSpring, withTiming)

- [x] **State Management**: Zustand stores planned appropriately, offline-first considered?
  - ✅ bookingStore handles all booking state with offline support
  - ✅ Pagination, filtering, and search managed in store
  - ✅ Offline mode detection and last sync timestamp tracked
  - ✅ Optimistic updates planned for status changes

- [x] **Testing & Documentation**: Acceptance criteria defined, JSDoc planned, defensive coding?
  - ✅ Comprehensive acceptance criteria defined in spec.md
  - ✅ Defensive coding: all potentially undefined values have fallbacks
  - ⚠️  **IMPROVEMENT NEEDED**: Add JSDoc comments to complex functions (handleStatusSelect, submitStatusUpdate)

**Complexity Justifications**: None - implementation follows all constitutional principles

**Pre-Implementation Improvements Required**:
1. Add explicit accessibilityLabel props to all Pressable/TouchableOpacity elements
2. Consider migrating from ScrollView to FlatList for Outstanding/All sections when booking count exceeds 20
3. Add JSDoc documentation to complex status update and kit selection functions

## Project Structure

### Documentation (this feature)

```text
specs/002-trial-bookings-management/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (technology decisions, patterns)
├── data-model.md        # Phase 1 output (Booking, KitItem, Reminder entities)
├── quickstart.md        # Phase 1 output (implementation guide)
├── contracts/           # Phase 1 output (API contracts for booking updates)
│   └── booking-status-update.openapi.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/
├── (tabs)/
│   └── trials.tsx              # ✏️ MODIFY: Enhanced Outstanding section, improved kit flow
├── booking-detail.tsx          # 📖 REFERENCE: Related booking detail view
└── _layout.tsx                 # 📖 REFERENCE: Navigation structure

components/
├── ui/
│   ├── Badge.tsx               # 📖 REFERENCE: Used for status badges
│   ├── Card.tsx                # 📖 REFERENCE: Used for booking cards
│   ├── Dropdown.tsx            # 📖 REFERENCE: Used for size selection
│   └── Input.tsx               # 📖 REFERENCE: Used for search field
└── features/                   # 🆕 NEW: Feature-specific components (if needed)
    └── trials/
        └── KitSelectionModal.tsx  # 🆕 OPTIONAL: Extract if modal exceeds 200 lines

services/
└── api/
    └── bookings.service.ts     # ✏️ MODIFY: Add updateBookingConversionStatus method (if not exists)

store/
└── bookingStore.ts             # ✏️ MODIFY: Enhanced filtering for outstanding, improved pagination

types/
└── api.ts                      # ✏️ MODIFY: Ensure KitItem, BookingStatus types complete

constants/
├── Colors.ts                   # 📖 REFERENCE: Color palette definitions
└── Theme.ts                    # 📖 REFERENCE: Theme configuration

hooks/
└── useThemeColors.ts           # 📖 REFERENCE: Dynamic theme colors hook
```

**Structure Decision**: Mobile app structure follows Expo Router conventions with `app/` for screens, `components/` for reusable UI, `services/` for API integration, and `store/` for Zustand state management. The Trial Bookings feature primarily modifies existing `app/(tabs)/trials.tsx` with potential extraction of KitSelectionModal to `components/features/trials/` if it exceeds 200 lines.

## Complexity Tracking

> **No complexity violations** - all implementation follows constitutional patterns

## Phase 0: Research & Unknowns

**Status**: Ready to execute

### Research Questions

1. **Outstanding Bookings Logic**:
   - Current implementation filters bookings with `isOutstandingBooking()` - verify logic matches spec requirement (pending + checked-in OR unpaid_coach_call)
   - Confirm bookings older than 90 days are excluded (assumption #14)

2. **Kit Package Structure**:
   - Determine API contract for kit_items array vs package_name field
   - Clarify backend expectations for package metadata storage

3. **Reminder System Integration**:
   - Identify if reminder system exists or needs creation
   - Determine if reminder_time field triggers backend notification system

4. **Offline Sync Strategy**:
   - Review existing syncStore patterns for queued status updates
   - Determine conflict resolution strategy when booking updated by multiple coaches

5. **Date Picker Validation**:
   - Verify DateTimePicker prevents past date selection (currently allows via minimumDate prop)
   - Determine error handling strategy for past date submission

### Technology Decisions Needed

- **Search Implementation**: Current implementation uses store-level filtering - confirm performance at scale (100+ bookings)
- **Modal Management**: Three modals in one file (status, kit, reminder) - determine extraction threshold
- **Pagination Strategy**: Current pagination via store - confirm All section uses pagination while Outstanding shows all

**Output File**: `research.md` will document:
- Outstanding booking detection algorithm validation
- Kit items API contract specification
- Reminder system integration approach
- Offline queue conflict resolution strategy
- Modal extraction decision matrix

## Phase 1: Design Artifacts

**Prerequisites:** `research.md` complete

### Data Model (`data-model.md`)

Entities to document:
1. **Booking** (existing, enhancements needed)
   - Add validation rules for status transitions (pending → paid_dd/not_joining)
   - Document outstanding detection algorithm

2. **KitItem** (existing)
   - Define complete type/size combinations matrix
   - Package bundle definitions (Basic: 3 items, Silver: 4, Gold: 5)

3. **Reminder** (new or existing?)
   - Fields: booking_id, reminder_time, created_at, completed_at
   - Relationship to Booking entity

### API Contracts (`contracts/`)

Generate OpenAPI specification for:
1. `POST /api/bookings/{id}/conversion-status`
   - Request body: { status, kit_items?, package_name?, reminder_time? }
   - Response: Updated Booking object
   - Error cases: 400 (validation), 404 (not found), 409 (conflict)

2. `PATCH /api/bookings/{id}/attendance`
   - Request body: { attendance_status: 'completed' | 'no-show' }
   - Response: Updated Booking object

### Quickstart Guide (`quickstart.md`)

Developer onboarding document:
1. Feature overview and user flows
2. Code organization (files to modify)
3. State management patterns (bookingStore usage)
4. Modal flow diagrams (status → kit/reminder → submission)
5. Testing checklist (manual, no automated tests)
6. Common pitfalls and debugging tips

### Agent Context Update

**Script**: `.specify/scripts/bash/update-agent-context.sh claude`

**Technologies to add** (if not already present):
- DateTimePicker from @react-native-community/datetimepicker
- Modal flow patterns for multi-step forms
- Booking status state machine

**Preserve**: Existing technology entries, manual additions between markers

## Phase 2: Task Generation

**NOT EXECUTED BY THIS COMMAND** - Run `/speckit.tasks` separately

The tasks.md file will be generated by analyzing:
- Functional requirements (FR-001 to FR-030)
- User stories (prioritized P1, P2, P3)
- Technical debt identified in Constitution Check
- API contract implementation needs
- Data model changes required

## Implementation Notes

### Critical Paths (Must Implement First)

1. **Outstanding Section Logic** (FR-002, FR-003, FR-021)
   - Implement precise filtering: `(status === 'pending' && checked_in_at !== null) || status === 'unpaid_coach_call'`
   - Sort by oldest first: `sort((a,b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())`
   - Hide section when empty: `{outstandingBookings.length > 0 && <OutstandingSection />}`

2. **Payment Status Flow** (FR-011 to FR-014)
   - Status modal presents 5 options
   - Conditional navigation: paid statuses → kit modal, unpaid_coach_call → reminder modal
   - Direct submission for unpaid_dd and not_joining

3. **Kit Selection Two-Step Flow** (FR-015 to FR-018)
   - Step 1: Package selection (Basic/Silver/Gold)
   - Step 2: Size selection for all items in package
   - Validation: ensure all items have sizes before submit
   - Back navigation: step 2 → step 1

### Performance Optimizations

- Memoize `outstandingBookings` and `allBookings` with `useMemo` (already implemented)
- Consider `React.memo` for `renderBookingCard` if re-render performance becomes issue
- Debounce search input if real-time filtering causes jank (current implementation updates on every keystroke)

### Accessibility Enhancements

- Add `accessibilityLabel` to all Pressable elements: `<Pressable accessibilityLabel="Check in participant">`
- Add `accessibilityRole="button"` to interactive elements
- Ensure modal close buttons have `accessibilityLabel="Close modal"`
- Add `accessibilityHint` for complex interactions: `accessibilityHint="Opens kit selection to record items provided"`

### Error Handling Strategy

- Network errors: Show toast, keep modal open, allow retry
- Validation errors: Highlight specific fields, show inline error messages
- Conflict errors (simultaneous updates): Refresh booking data, show conflict message, require re-submission
- Offline mode: Queue update in syncStore, show "Will sync when online" message

## Dependencies & Risks

### External Dependencies

- Backend API endpoint: `POST /api/bookings/{id}/conversion-status` - must accept kit_items, package_name, reminder_time
- Backend reminder notification system - confirm integration point
- Backend support for attendance_status field vs legacy checked_in_at/no_show fields

### Technical Risks

1. **Modal Complexity**: Three modals in one component may exceed 200-line extraction threshold
   - Mitigation: Extract KitSelectionModal and ReminderModal to separate components if needed

2. **Search Performance**: Real-time filtering with 200+ bookings may cause lag
   - Mitigation: Implement debounce or consider moving to FlatList with built-in filtering

3. **Offline Conflict Resolution**: Two coaches updating same booking while offline
   - Mitigation: Last-write-wins with backend timestamp validation, show conflict warning to user

4. **Outstanding Section Size**: If 50+ outstanding bookings, unpaginated list may be unwieldy
   - Mitigation: Monitor usage metrics, add pagination if Outstanding section regularly exceeds 20 items

### Assumptions Requiring Validation

From spec.md assumptions section:
- [ ] Verify assumption #4: "Mine" view filters by class_time's coach assignment (check backend logic)
- [ ] Verify assumption #9: Backend prevents status regression from paid_dd/not_joining to other states
- [ ] Verify assumption #11: Reminder system exists and processes reminder_time field
- [ ] Verify assumption #14: Bookings older than 90 days are excluded by backend (not client-side filter)

## Next Steps

1. ✅ Complete this plan.md (DONE)
2. ⏭️  Execute Phase 0: Generate research.md to resolve all NEEDS CLARIFICATION items
3. ⏭️  Execute Phase 1: Generate data-model.md, contracts/, quickstart.md
4. ⏭️  Run agent context update script
5. ⏭️  Execute Phase 2: Run `/speckit.tasks` to generate actionable task list
6. ⏭️  Begin implementation following generated tasks

**This command stops after Phase 1 completion.** User will run `/speckit.tasks` separately for Phase 2.
