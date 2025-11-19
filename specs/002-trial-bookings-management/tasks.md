# Tasks: Trial Bookings Management for Coaches

**Input**: Design documents from `/specs/002-trial-bookings-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: No automated testing framework exists - validation via manual testing and TypeScript compilation

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US6)
- Include exact file paths in descriptions

## Path Conventions

Mobile (Expo/React Native) structure:
- **App screens**: `app/` (Expo Router)
- **Components**: `components/`
- **Services**: `services/api/`
- **State**: `store/`
- **Types**: `types/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify existing infrastructure and prepare for enhancements

- [X] T001 Verify TypeScript 5.9.2 compilation with strict mode for existing codebase
- [X] T002 [P] Review current trials.tsx implementation at app/(tabs)/trials.tsx (lines 1-2161)
- [X] T003 [P] Review bookingStore.ts implementation at store/bookingStore.ts
- [X] T004 [P] Verify bookings.service.ts API methods exist at services/api/bookings.service.ts (updateBookingConversionStatus, updateBookingAttendanceStatus)
- [X] T005 [P] Verify KitItem and BookingStatus types in types/api.ts
- [X] T006 Create backup of current trials.tsx before modifications

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core improvements that MUST be complete before ANY user story can be fully implemented

**⚠️ CRITICAL**: These tasks establish the foundation for all user stories

- [X] T007 Add JSDoc comments to isOutstandingBooking function in app/(tabs)/trials.tsx:160-178
- [X] T008 Add JSDoc comments to handleStatusSelect function in app/(tabs)/trials.tsx:409-431
- [X] T009 Add JSDoc comments to submitStatusUpdate function in app/(tabs)/trials.tsx:433-472
- [X] T010 [P] Add accessibilityLabel props to "Check In" button in app/(tabs)/trials.tsx:368-379
- [X] T011 [P] Add accessibilityLabel props to "No Show" button in app/(tabs)/trials.tsx:354-366
- [X] T012 [P] Add accessibilityLabel props to "Update Kit Status" button in app/(tabs)/trials.tsx:330-343
- [X] T013 Verify useThemeColors() hook usage throughout trials.tsx (no hardcoded colors)
- [X] T014 Verify all text has fallbacks (e.g., {booking.names || ''}) throughout trials.tsx

**Checkpoint**: Foundation ready - user story-specific implementation can now begin

---

## Phase 3: User Story 6 - Coach Marks Attendance (Priority: P1) 🎯 PREREQUISITE

**Goal**: Enable coaches to mark participant attendance (completed/no-show) before updating payment status

**Independent Test**: Create a scheduled trial booking (past date), verify "Check In" and "No Show" buttons appear, click each and confirm attendance_status updates correctly

**Why First**: This is a prerequisite for all other payment status updates - FR-009 states attendance must be marked before payment status can be updated

### Implementation for User Story 6

- [X] T015 [US6] Verify handleAttendanceStatusUpdate function in app/(tabs)/trials.tsx:397-402 calls correct API
- [X] T016 [US6] Verify "Check In" button only appears for past/today bookings in app/(tabs)/trials.tsx:348-382
- [X] T017 [US6] Verify "No Show" button only appears for past/today bookings in app/(tabs)/trials.tsx:348-366
- [ ] T018 [US6] Test: Create booking with start_time today at 9am, verify buttons appear
- [ ] T019 [US6] Test: Create booking with start_time tomorrow, verify buttons do NOT appear
- [ ] T020 [US6] Test: Click "Check In", verify checked_in_at timestamp set and "Update Kit Status" button appears
- [ ] T021 [US6] Test: Click "No Show", verify no_show_at timestamp set and status badge changes

**Checkpoint**: Attendance tracking complete - coaches can now mark who showed up

---

## Phase 4: User Story 1 - Coach Views Outstanding Bookings (Priority: P1) 🎯 MVP CORE

**Goal**: Display outstanding bookings (pending + checked-in OR unpaid_coach_call) in dedicated section, sorted oldest first

**Independent Test**: Create 3 bookings: (1) pending + checked-in from last week, (2) unpaid_coach_call from yesterday, (3) paid_dd from today. Verify only first two appear in Outstanding section, ordered by oldest first.

### Implementation for User Story 1

- [X] T022 [US] Verify isOutstandingBooking logic in app/(tabs)/trials.tsx:160-178 matches FR-002
- [X] T023 [US] Verify Outstanding section sorting in app/(tabs)/trials.tsx:183-187 (oldest first)
- [X] T024 [US] Verify Outstanding section conditional rendering in app/(tabs)/trials.tsx:791-810 (hidden when empty)
- [X] T025 [US] Verify outstandingBookings useMemo in app/(tabs)/trials.tsx:183-187 filters correctly
- [X] T026 [US] Verify allBookings useMemo in app/(tabs)/trials.tsx:189-191 excludes outstanding
- [ ] T027 [US1] Add accessibilityLabel to Outstanding section header in app/(tabs)/trials.tsx:793-805
- [ ] T028 [US1] Test: Create pending booking, check in, verify appears in Outstanding
- [ ] T029 [US1] Test: Update outstanding booking to paid_dd, verify disappears from Outstanding
- [ ] T030 [US1] Test: Update outstanding booking to not_joining, verify disappears from Outstanding
- [ ] T031 [US1] Test: Create unpaid_coach_call booking, verify appears in Outstanding
- [ ] T032 [US1] Test: Verify Outstanding section sorts by start_time ascending (oldest first)

**Checkpoint**: Outstanding section complete - coaches can identify bookings needing action

---

## Phase 5: User Story 2 - Coach Updates Payment Status (Priority: P1) 🎯 MVP CORE

**Goal**: Enable payment status updates with conditional flows (kit modal for paid, reminder for follow-up, direct submit for others)

**Independent Test**: Check in a booking, click "Update Kit Status", select each of 5 status options, verify correct modal/action for each (paid→kit, follow-up→reminder, others→direct submit)

### Implementation for User Story 2

- [X] T033 [US] Verify status selection modal exists in app/(tabs)/trials.tsx:927-1046
- [X] T034 [US] Verify 5 status options displayed in app/(tabs)/trials.tsx:959-1042
- [ ] T035 [US2] Add accessibilityLabel to "Paid (Direct Debit)" option in app/(tabs)/trials.tsx:959-974
- [ ] T036 [US2] Add accessibilityLabel to "Paid (Awaiting DD)" option in app/(tabs)/trials.tsx:976-991
- [ ] T037 [US2] Add accessibilityLabel to "Unpaid (DD Scheduled)" option in app/(tabs)/trials.tsx:993-1008
- [ ] T038 [US2] Add accessibilityLabel to "Unpaid (Follow Up)" option in app/(tabs)/trials.tsx:1010-1025
- [ ] T039 [US2] Add accessibilityLabel to "Not Joining" option in app/(tabs)/trials.tsx:1027-1042
- [X] T040 [US] Verify handleStatusSelect routing logic in app/(tabs)/trials.tsx:409-431
- [ ] T041 [US2] Test: Select "Paid (Direct Debit)", verify kit modal opens (setShowKitModal called)
- [ ] T042 [US2] Test: Select "Paid (Awaiting DD)", verify kit modal opens
- [ ] T043 [US2] Test: Select "Unpaid (Follow Up)", verify reminder modal opens (setShowReminderModal called)
- [ ] T044 [US2] Test: Select "Unpaid (DD Scheduled)", verify submitStatusUpdate called directly
- [ ] T045 [US2] Test: Select "Not Joining", verify submitStatusUpdate called directly
- [X] T046 [US] Verify submitStatusUpdate function in app/(tabs)/trials.tsx:433-472 calls bookingsService.updateBookingConversionStatus
- [ ] T047 [US2] Test error handling: Simulate 409 conflict, verify booking refresh and alert shown

**Checkpoint**: Payment status selection complete - coaches can choose appropriate status for each trial

---

## Phase 6: User Story 3 - Coach Records Kit Items (Priority: P2)

**Goal**: Two-step kit selection flow (package → sizes) for paid statuses with validation

**Independent Test**: Select paid status, choose Silver package, verify 4 size dropdowns appear (tshirt, trousers, gloves, shinpads), fill all, submit, verify API called with correct kit_items array

### Implementation for User Story 3

- [X] T048 [US] Verify kit modal exists in app/(tabs)/trials.tsx:1048-1213
- [X] T049 [US] Verify two-step flow: kitSelectionStep state in app/(tabs)/trials.tsx:70
- [ ] T050 [US3] Add accessibilityLabel to "Basic" package option in app/(tabs)/trials.tsx:1096-1108
- [ ] T051 [US3] Add accessibilityLabel to "Silver" package option in app/(tabs)/trials.tsx:1110-1122
- [ ] T052 [US3] Add accessibilityLabel to "Gold" package option in app/(tabs)/trials.tsx:1124-1136
- [X] T053 [US] Verify handlePackageSelection in app/(tabs)/trials.tsx:526-556 pre-populates kit items correctly
- [ ] T054 [US3] Test: Select "Basic" package, verify 3 items pre-populated (tshirt, trousers, gloves)
- [ ] T055 [US3] Test: Select "Silver" package, verify 4 items pre-populated (+ shinpads)
- [ ] T056 [US3] Test: Select "Gold" package, verify 5 items pre-populated (+ shinpads, kitbag)
- [X] T057 [US] Verify size selection step displays Dropdown for each item in app/(tabs)/trials.tsx:1159-1181
- [X] T058 [US] Verify getSizeOptions function in app/(tabs)/trials.tsx:515-524 returns correct sizes per type
- [ ] T059 [US3] Add accessibilityLabel to each size Dropdown in app/(tabs)/trials.tsx:1171-1179
- [X] T060 [US] Verify Back button in step 2 returns to step 1 in app/(tabs)/trials.tsx:1061-1066
- [X] T061 [US] Verify handleKitSubmit validation in app/(tabs)/trials.tsx:474-491 checks all items have sizes
- [ ] T062 [US3] Test: Leave one size empty, click Confirm, verify validation error shown
- [ ] T063 [US3] Test: Fill all sizes, click Confirm, verify submitStatusUpdate called with kit_items and package_name
- [X] T064 [US] Verify kit items array structure matches API contract (type, size fields)

**Checkpoint**: Kit selection complete - coaches can record what equipment was provided

---

## Phase 7: User Story 4 - Coach Schedules Reminders (Priority: P2)

**Goal**: Date/time picker for scheduling follow-up calls with validation (future dates only)

**Independent Test**: Select "Unpaid (Follow Up)" status, verify date/time pickers default to tomorrow, set future date, submit, verify reminder_time sent to API in ISO 8601 format

### Implementation for User Story 4

- [X] T065 [US] Verify reminder modal exists in app/(tabs)/trials.tsx:1215-1350
- [X] T066 [US] Verify reminderDate state initialized to tomorrow in app/(tabs)/trials.tsx:421-424
- [ ] T067 [US4] Add accessibilityLabel to date picker button in app/(tabs)/trials.tsx:1249-1268
- [ ] T068 [US4] Add accessibilityLabel to time picker button in app/(tabs)/trials.tsx:1270-1287
- [X] T069 [US] Verify DateTimePicker minimumDate prop in app/(tabs)/trials.tsx:1303 prevents past dates
- [ ] T070 [US4] Add client-side validation in handleReminderSubmit to check reminderDate > now()
- [ ] T071 [US4] Test: Manually set reminderDate to past, click submit, verify validation error shown
- [ ] T072 [US4] Test: Set reminderDate to tomorrow, verify date picker shows correct value
- [ ] T073 [US4] Test: Set time to 2pm, verify time picker shows correct value
- [ ] T074 [US4] Test: Submit reminder, verify API called with reminder_time in ISO 8601 format
- [X] T075 [US] Verify submitStatusUpdate passes reminderDate.toISOString() to API in app/(tabs)/trials.tsx:497

**Checkpoint**: Reminder scheduling complete - coaches can schedule follow-up calls

---

## Phase 8: User Story 5 - Coach Searches and Filters (Priority: P3)

**Goal**: Real-time search across name/email/phone, Mine/All view toggle, empty states

**Independent Test**: Create bookings with different names, type name in search, verify both Outstanding and All sections filter, clear search, switch Mine/All views, verify filtering works

### Implementation for User Story 5

- [X] T076 [US] Verify search input exists in app/(tabs)/trials.tsx:710-738
- [X] T077 [US] Verify searchQuery state updates on text change in app/(tabs)/trials.tsx:715
- [ ] T078 [US5] Add accessibilityLabel to search input in app/(tabs)/trials.tsx:710
- [X] T079 [US] Verify clear button appears when searchQuery.length > 0 in app/(tabs)/trials.tsx:723-737
- [ ] T080 [US5] Add accessibilityLabel to clear search button in app/(tabs)/trials.tsx:726-735
- [X] T081 [US] Verify setFilters called with searchQuery in app/(tabs)/trials.tsx:123-125
- [X] T082 [US] Verify search filters both Outstanding and All sections (implemented in store)
- [ ] T083 [US5] Test: Type participant name, verify both sections filter
- [ ] T084 [US5] Test: Type email address, verify filtering works
- [ ] T085 [US5] Test: Type phone number, verify filtering works
- [ ] T086 [US5] Test: Click clear button, verify all bookings reappear
- [X] T087 [US] Verify Mine/All toggle exists in app/(tabs)/trials.tsx:740-788
- [ ] T088 [US5] Add accessibilityLabel to "Mine" tab in app/(tabs)/trials.tsx:745-757
- [ ] T089 [US5] Add accessibilityLabel to "All" tab in app/(tabs)/trials.tsx:758-770
- [X] T090 [US] Verify switchViewMode function in app/(tabs)/trials.tsx:127-136 updates store
- [X] T091 [US] Verify tab indicator animation uses withSpring in app/(tabs)/trials.tsx:130
- [ ] T092 [US5] Test: Switch to "All" view, verify bookings from all coaches shown
- [ ] T093 [US5] Test: Switch to "Mine" view, verify only current coach's bookings shown
- [X] T094 [US] Verify empty state displayed when no search results in app/(tabs)/trials.tsx:893-923
- [ ] T095 [US5] Add accessibilityLabel to "Clear Search" button in empty state app/(tabs)/trials.tsx:910-921

**Checkpoint**: Search and filtering complete - coaches can quickly find specific participants

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and overall quality

### Documentation

- [ ] T096 [P] Review and update JSDoc comments for all new/modified functions
- [ ] T097 [P] Verify all components follow constitutional principles (useThemeColors, text fallbacks, accessibility)
- [ ] T098 Document any deviations from plan in specs/002-trial-bookings-management/implementation-notes.md

### Performance

- [ ] T099 Monitor search performance with 100+ bookings, add debounce if lag > 200ms
- [ ] T100 Consider FlatList migration if ScrollView causes jank with 50+ bookings
- [ ] T101 Profile Outstanding section render time with 20+ outstanding bookings

### Error Handling

- [ ] T102 Test offline mode: Toggle airplane mode, update status, verify "Saved for sync" message
- [ ] T103 Test 409 conflict: Simulate simultaneous update, verify refresh and warning shown
- [ ] T104 Test 400 validation: Submit invalid data, verify user-friendly error messages

### Accessibility

- [ ] T105 Verify all modals have accessibilityLabel on close buttons
- [ ] T106 Add accessibilityRole="button" to all Pressable elements
- [ ] T107 Add accessibilityHint to complex actions ("Opens kit selection to record items provided")
- [ ] T108 Test VoiceOver (iOS) / TalkBack (Android) navigation through entire flow

### Code Quality

- [ ] T109 Run TypeScript compiler: `npx tsc --noEmit`, fix any errors
- [ ] T110 Verify no console.error or console.warn in production code (only console.log for debugging)
- [ ] T111 Check for TODO/FIXME comments, resolve or create follow-up tasks
- [ ] T112 Verify all useState/useEffect/useMemo have correct dependency arrays

### Validation

- [ ] T113 Run through quickstart.md testing checklist manually
- [ ] T114 Test all 5 payment status options end-to-end
- [ ] T115 Test all 3 kit packages (Basic, Silver, Gold) with different sizes
- [ ] T116 Test reminder scheduling with various dates/times
- [ ] T117 Test Outstanding section with 0, 1, 10, 20+ bookings
- [ ] T118 Test search with special characters, empty string, very long string
- [ ] T119 Verify dark mode: Switch theme, check for visual breaks or hardcoded colors
- [ ] T120 Test on iOS simulator and Android emulator

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 6 (Phase 3)**: Depends on Foundational - PREREQUISITE for status updates
- **User Story 1 (Phase 4)**: Depends on Foundational - MVP core feature
- **User Story 2 (Phase 5)**: Depends on US6 (attendance must be marked first) - MVP core feature
- **User Story 3 (Phase 6)**: Depends on US2 (triggered by paid status selection)
- **User Story 4 (Phase 7)**: Depends on US2 (triggered by follow-up status selection)
- **User Story 5 (Phase 8)**: Depends on Foundational - Independent enhancement
- **Polish (Phase 9)**: Depends on all desired user stories

### User Story Dependencies

```
Foundational (Phase 2)
    │
    ├─→ US6: Attendance (Phase 3) ───────┐
    │                                     │
    ├─→ US1: Outstanding (Phase 4)       │
    │                                     │
    └─→ US5: Search/Filter (Phase 8)     │
                                          ↓
                                    US2: Payment Status (Phase 5)
                                          │
                                          ├─→ US3: Kit Selection (Phase 6)
                                          │
                                          └─→ US4: Reminders (Phase 7)
```

**Critical Path**: Setup → Foundational → US6 → US2 → (US3 + US4)

**Independent**: US1 and US5 can be worked on in parallel with US6→US2 chain

### Within Each User Story

1. **Setup tasks** (verify existing, add documentation)
2. **Accessibility enhancements** (can be parallel)
3. **Logic verification** (ensure existing code correct)
4. **Testing** (manual validation)

### Parallel Opportunities

**Foundational Phase** (after T007-T009 complete):
```bash
# All accessibility tasks can run in parallel:
T010 [P] + T011 [P] + T012 [P] (accessibility labels)
```

**User Story 3** (Kit Selection):
```bash
# Package option accessibility can run in parallel:
T050 [P] + T051 [P] + T052 [P] (package accessibility labels)
```

**User Story 5** (Search/Filter):
```bash
# Accessibility tasks can run in parallel:
T078 [P] + T080 [P] + T088 [P] + T089 [P] + T095 [P]
```

**Polish Phase**:
```bash
# Documentation and verification can run in parallel:
T096 [P] + T097 [P] + T098 [P]
```

---

## Parallel Example: User Story 2 (Payment Status)

```bash
# Accessibility enhancements can all run in parallel:
Task T035: "Add accessibilityLabel to 'Paid (Direct Debit)' option in app/(tabs)/trials.tsx:959-974"
Task T036: "Add accessibilityLabel to 'Paid (Awaiting DD)' option in app/(tabs)/trials.tsx:976-991"
Task T037: "Add accessibilityLabel to 'Unpaid (DD Scheduled)' option in app/(tabs)/trials.tsx:993-1008"
Task T038: "Add accessibilityLabel to 'Unpaid (Follow Up)' option in app/(tabs)/trials.tsx:1010-1025"
Task T039: "Add accessibilityLabel to 'Not Joining' option in app/(tabs)/trials.tsx:1027-1042"

# Then proceed with logic verification and testing sequentially
```

---

## Implementation Strategy

### MVP First (Minimum Viable Product)

**Goal**: Get coaches able to mark attendance and update payment status ASAP

1. ✅ Complete Phase 1: Setup (verify infrastructure)
2. ✅ Complete Phase 2: Foundational (accessibility + documentation)
3. ✅ Complete Phase 3: User Story 6 (attendance marking) - PREREQUISITE
4. ✅ Complete Phase 4: User Story 1 (outstanding bookings) - CORE VALUE
5. ✅ Complete Phase 5: User Story 2 (payment status selection) - CORE VALUE
6. **STOP and VALIDATE**: Test MVP independently with sample bookings
7. Deploy/demo MVP (attendance + outstanding + basic payment updates)

**MVP Scope**: US6 + US1 + US2 (basic status updates without kit/reminders)

### Incremental Delivery (Add Value Progressively)

1. **Iteration 1 (MVP)**: US6 + US1 + US2 → Test → Deploy
   - Coaches can mark attendance, see outstanding bookings, update basic payment status
2. **Iteration 2**: Add US3 (kit selection) → Test → Deploy
   - Coaches can now record kit items for paid members
3. **Iteration 3**: Add US4 (reminders) → Test → Deploy
   - Coaches can schedule follow-up calls
4. **Iteration 4**: Add US5 (search/filter) → Test → Deploy
   - Coaches can quickly find specific participants
5. **Polish**: Complete Phase 9 → Final validation → Production release

### Parallel Team Strategy

With 2-3 developers:

**Week 1**:
- Developer A: Phase 1 + Phase 2 (Setup + Foundational)
- All team: Review and validate foundational work

**Week 2** (After foundational complete):
- Developer A: Phase 3 (US6 Attendance)
- Developer B: Phase 4 (US1 Outstanding) [parallel, independent]
- Developer C: Phase 8 (US5 Search) [parallel, independent]

**Week 3**:
- Developer A: Phase 5 (US2 Payment Status) - depends on US6 complete
- Developer B: Continue US1 or assist with US2
- Developer C: Continue US5

**Week 4**:
- Developer A: Phase 6 (US3 Kit Selection) - depends on US2 complete
- Developer B: Phase 7 (US4 Reminders) [parallel with US3]
- Developer C: Phase 9 (Polish)

**Integration Testing**: End of each week, ensure all completed stories work independently

---

## Task Summary

**Total Tasks**: 120

**Breakdown by Phase**:
- Setup: 6 tasks
- Foundational: 8 tasks (blocking)
- User Story 6 (Attendance): 7 tasks
- User Story 1 (Outstanding): 11 tasks
- User Story 2 (Payment Status): 15 tasks
- User Story 3 (Kit Selection): 17 tasks
- User Story 4 (Reminders): 11 tasks
- User Story 5 (Search/Filter): 20 tasks
- Polish: 25 tasks

**Parallel Opportunities**: 15 tasks marked [P] can run in parallel within their phases

**Independent Test Criteria**:
- ✅ US6: Create booking, mark attendance, verify status changes
- ✅ US1: Create outstanding bookings, verify section displays correctly
- ✅ US2: Select each status option, verify correct flow
- ✅ US3: Select package, fill sizes, verify submission
- ✅ US4: Set reminder date, verify API call
- ✅ US5: Search bookings, toggle views, verify filtering

**Suggested MVP**: Phase 1 + Phase 2 + Phase 3 (US6) + Phase 4 (US1) + Phase 5 (US2 basic)
- **Estimated**: ~40 tasks for MVP (Phases 1-5)
- **Time**: 1-2 weeks for solo developer, less with team

---

## Notes

- Most tasks verify existing implementation rather than creating new code (feature is largely built)
- Primary work: Add accessibility labels, improve documentation, validate existing logic
- No automated tests - rely on TypeScript compilation and manual testing
- [P] tasks = different code sections, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently testable after its phase completes
- Constitution compliance already verified in plan.md - focus on enhancements
- Commit after each logical group (e.g., all accessibility for one user story)
- Stop at any checkpoint to validate story independently before proceeding
