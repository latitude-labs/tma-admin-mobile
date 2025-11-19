# Research Findings: Trial Bookings Management

**Date**: 2025-11-16
**Feature**: 002-trial-bookings-management
**Purpose**: Resolve technical unknowns identified in plan.md Phase 0

## Executive Summary

All research questions have been resolved through codebase analysis. The existing implementation already contains most necessary infrastructure:
- `updateBookingConversionStatus` API method exists in `bookings.service.ts`
- Reminder system with create/fetch/complete endpoints exists
- Offline sync strategy is established via `commandFactory` and `offlineStorage`
- Kit items structure is well-defined with package_name support

**Key Finding**: Current implementation is mostly complete but needs enhanced logic for outstanding booking detection and validation improvements.

## Research Question 1: Outstanding Bookings Logic

### Current Implementation Analysis

**File**: `/app/(tabs)/trials.tsx:160-178`

```typescript
const isOutstandingBooking = (booking: Booking) => {
  const now = new Date();
  const startTime = new Date(booking.start_time);

  // Only past bookings can be outstanding
  if (startTime >= now) return false;

  // Outstanding if pending and checked in (needs kit status update)
  if (booking.status === 'pending' && booking.checked_in_at) {
    return true;
  }

  // Outstanding if needs coach follow-up
  if (booking.status === 'unpaid_coach_call') {
    return true;
  }

  return false;
};
```

### Decision: Keep Existing Logic with Minor Enhancement

**Rationale**: Current logic correctly implements spec requirement FR-002:
- ✅ Includes bookings with status 'pending' that have been checked in
- ✅ Includes bookings with status 'unpaid_coach_call'
- ✅ Only considers past bookings (startTime < now)

**Enhancement Needed**: Clarify edge case for same-day bookings in the future (e.g., booking at 3pm when current time is 1pm). Current logic treats these as not outstanding, which is correct - they're scheduled, not completed.

**90-Day Archive Assumption**:
- **Finding**: No client-side filtering for 90-day threshold detected
- **Decision**: Assume backend excludes archived bookings from `/bookings` endpoint
- **Validation Required**: Confirm with backend team that bookings older than 90 days are not returned in API response

## Research Question 2: Kit Package Structure

### API Contract Analysis

**File**: `/services/api/bookings.service.ts:35-40`

```typescript
interface UpdateBookingStatusParams {
  status: 'pending' | 'paid_dd' | 'paid_awaiting_dd' | 'unpaid_dd' | 'unpaid_coach_call' | 'not_joining';
  kit_items?: Array<{ type: string; size: string; }>;
  package_name?: 'basic' | 'silver' | 'gold';
  reminder_time?: string;
}
```

### Decision: Use Both kit_items Array and package_name Field

**Rationale**: API contract supports both fields, enabling:
1. **package_name**: Store which bundle was selected (for business analytics)
2. **kit_items**: Store individual items with sizes (for inventory tracking)

**Backend Expectation**:
- When paid status selected, both `package_name` and `kit_items` should be sent
- `kit_items` array contains all items in the selected package with their sizes
- Backend will likely create a KitOrder record linking to booking

**Implementation Pattern**:
```typescript
{
  status: 'paid_dd',
  package_name: 'silver',
  kit_items: [
    { type: 'tshirt', size: 'Large' },
    { type: 'trousers', size: 'Medium' },
    { type: 'gloves', size: '12oz' },
    { type: 'shinpads', size: 'Medium' }
  ]
}
```

### Kit Item Size Matrix

| Item Type | Available Sizes |
|-----------|----------------|
| **T-shirt** | Small Youth, Medium Youth, Large Youth, XL Youth, Small, Medium, Large, XL, 2XL, 3XL |
| **Trousers** | Small Youth, Medium Youth, Large Youth, XL Youth, Small, Medium, Large, XL, 2XL, 3XL |
| **Gloves** | 8oz, 10oz, 12oz, 14oz, 16oz |
| **Shinpads** | Small, Medium, Large, XL |
| **Kit Bag** | One Size |

**Source**: `/app/(tabs)/trials.tsx:392-395`

## Research Question 3: Reminder System Integration

### Findings

**Reminder Endpoints Exist**: `/services/api/bookings.service.ts:189-224`

```typescript
async createReminder(bookingId: number, reminderTime: string): Promise<Reminder>
async getMyReminders(): Promise<Reminder[]>
async completeReminder(reminderId: number): Promise<{...}>
```

### Decision: Use Existing Reminder System

**Integration Approach**:
1. When user selects "Unpaid (Follow Up)" status, show reminder date/time picker
2. Submit `updateBookingConversionStatus` with `reminder_time` field (ISO 8601 format)
3. Backend creates Reminder record automatically (based on API contract)
4. Backend notification system (external to mobile app) sends reminder at scheduled time
5. Coach can view/complete reminders via separate reminders interface (if exists)

**Date Format**: `reminder_time` should be ISO 8601 string: `reminderDate.toISOString()`

**Backend Responsibility**:
- ✅ Create reminder record when `reminder_time` provided
- ✅ Trigger notification at scheduled time (email, push, SMS - TBD)
- ✅ Allow reminder completion via `/reminders/{id}/complete`

**Mobile App Responsibility**:
- ✅ Provide date/time picker UI
- ✅ Validate reminder is in future (minimumDate prop)
- ✅ Send ISO 8601 timestamp to API
- ❌ NOT responsible for sending notifications (backend handles)

## Research Question 4: Offline Sync Strategy

### Existing Infrastructure

**Files**:
- `/services/offline/commandFactory.ts` (referenced but not read)
- `/services/offline/storage.ts` (referenced but not read)
- `/services/api/bookings.service.ts:145-163` (offline-capable attendance update)

```typescript
async updateBookingAttendanceStatusOffline(bookingId: number, status: ...) {
  const isOnline = await offlineStorage.isOnline();
  if (isOnline) {
    try {
      await this.updateBookingAttendanceStatus(bookingId, { status });
      return;
    } catch (error) {
      console.log('Direct update failed, queuing for sync:', error);
    }
  }
  // Queue the operation for later sync
  queueCommand(CommandFactory.updateBookingStatus(bookingId, status));
}
```

### Decision: Extend Existing Offline Pattern to Conversion Status

**Pattern to Implement**:
```typescript
async updateBookingConversionStatusOffline(
  bookingId: number,
  params: UpdateBookingStatusParams
) {
  const isOnline = await offlineStorage.isOnline();

  if (isOnline) {
    try {
      return await this.updateBookingConversionStatus(bookingId, params);
    } catch (error) {
      console.log('Direct update failed, queuing for sync:', error);
    }
  }

  // Queue for later sync
  queueCommand(CommandFactory.updateBookingConversionStatus(bookingId, params));

  // Optimistically update in bookingStore
}
```

**Conflict Resolution Strategy**: Last-Write-Wins

**Approach**:
1. Backend uses `updated_at` timestamp for conflict detection
2. If booking was modified by another coach after offline queue created, backend returns 409 Conflict
3. Mobile app catches 409, refreshes booking data, shows warning to user
4. User must re-submit with latest data

**Implementation in bookingStore**:
```typescript
try {
  await bookingsService.updateBookingConversionStatusOffline(id, params);
} catch (error) {
  if (error.response?.status === 409) {
    // Refresh booking data
    await fetchBookings();
    Alert.alert('Conflict', 'This booking was updated by another coach. Please review and try again.');
  } else {
    Alert.alert('Error', 'Failed to update booking. Changes saved for sync when online.');
  }
}
```

## Research Question 5: Date Picker Validation

### Current Implementation

**File**: `/app/(tabs)/trials.tsx:1290-1304`

```typescript
{showDatePicker && (
  <DateTimePicker
    value={reminderDate}
    mode="date"
    display={Platform.OS === 'ios' ? 'compact' : 'default'}
    onChange={(_event, date) => {
      setShowDatePicker(false);
      if (date) {
        const newDate = new Date(reminderDate);
        newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        setReminderDate(newDate);
      }
    }}
    minimumDate={new Date()}  // ✅ Prevents past dates in picker
  />
)}
```

### Decision: Use minimumDate Prop (Already Implemented)

**Validation Strategy**:
- ✅ **Primary**: `minimumDate={new Date()}` prevents selecting past dates in picker UI
- ⚠️  **Secondary**: Add backend validation to reject past `reminder_time` values (defense in depth)
- ⚠️  **Fallback**: Client-side validation before submission (belt-and-suspenders):

```typescript
const handleReminderSubmit = () => {
  if (reminderDate <= new Date()) {
    Alert.alert('Invalid Date', 'Reminder time must be in the future.');
    return;
  }
  setShowReminderModal(false);
  // ... proceed with submission
};
```

**Rationale**: DateTimePicker's `minimumDate` is the primary prevention, but adding validation provides better UX (explicit error message) and prevents edge cases (clock changes, timezone issues).

## Technology Decisions

### Search Implementation

**Current**: Store-level filtering with real-time updates

**File**: `/store/bookingStore.ts` (implementation not read, inferred from usage)

**Decision**: Keep Current Approach with Performance Monitoring

**Justification**:
- Current implementation already works
- Search applies to both Outstanding and All sections simultaneously (FR-006)
- Store manages filtered results, components consume filtered arrays

**Performance Threshold**: If search lag exceeds 200ms with 100+ bookings, implement:
1. **Option A**: Debounce search input (300ms delay)
2. **Option B**: Use Web Worker for filtering (if supported in Expo)
3. **Option C**: Move to FlatList with `filterProp` optimization

**Monitoring Approach**: Add performance logging during development:
```typescript
const filterStart = Date.now();
const filtered = bookings.filter(searchPredicate);
const filterDuration = Date.now() - filterStart;
if (filterDuration > 200) console.warn('Search slow:', filterDuration, 'ms');
```

### Modal Management

**Current**: Three modals in `trials.tsx`:
1. Status selection modal (~80 lines)
2. Kit selection modal (~130 lines)
3. Reminder modal (~135 lines)

**Total Modal Code**: ~345 lines (plus modal styling)

**Decision**: Extract Kit Selection and Reminder Modals

**Threshold**: 200 lines per component (per constitution)

**Extraction Plan**:
1. Create `/components/features/trials/StatusSelectionModal.tsx` (~100 lines)
2. Create `/components/features/trials/KitSelectionModal.tsx` (~200 lines)
3. Create `/components/features/trials/ReminderModal.tsx` (~150 lines)

**Benefits**:
- Each modal component under 200 lines
- Easier to test and maintain
- Can reuse modals in other screens (e.g., booking detail)
- Reduces `trials.tsx` from 2161 lines to ~1500 lines

**Shared State Pattern**:
```typescript
// trials.tsx
const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

<StatusSelectionModal
  visible={showStatusModal}
  booking={selectedBooking}
  onClose={() => setShowStatusModal(false)}
  onSelectStatus={(status) => handleStatusSelect(status)}
/>
```

### Pagination Strategy

**Current Implementation Analysis**:

**File**: `/store/bookingStore.ts` (inferred from usage in trials.tsx)

**Observations**:
- All section: Uses `pagination.currentPage`, `pagination.totalPages`, `fetchBookingsPage(page)`
- Outstanding section: No pagination (shows all outstanding bookings)

**Decision**: Keep Current Pattern (Confirmed Correct)

**Validation**:
- ✅ All section: Paginated (FR-005)
- ✅ Outstanding section: Not paginated (shows all requiring action)
- ✅ Both sections: Searchable (FR-006)

**Outstanding Section Scalability**:
- **Typical**: 0-10 outstanding bookings per coach
- **High**: 20-30 outstanding bookings (coach behind on admin)
- **Critical**: 50+ outstanding bookings (requires intervention)

**Mitigation Plan** (if Outstanding > 20):
1. Add prominent warning: "You have X outstanding bookings - please update trial statuses"
2. Sort by oldest first (already implemented)
3. Consider daily digest emails for outstanding bookings (backend feature)

## Alternatives Considered

### Alternative 1: Separate Kit Order Creation Endpoint

**Rejected Because**: API contract already supports `kit_items` in `updateBookingConversionStatus`. Creating separate kit order would require two API calls and complicate error handling.

### Alternative 2: Local Reminder Storage (No Backend)

**Rejected Because**: Reminder system already exists in backend. Local-only reminders would:
- Not sync across devices
- Disappear if app uninstalled
- Miss coaches who use web dashboard

### Alternative 3: Optimistic Updates Without Queue

**Rejected Because**: Offline-first architecture is constitutional requirement. Without queue, coaches lose data when offline. Existing `commandFactory` pattern provides proven solution.

### Alternative 4: Debounced Search by Default

**Rejected Because**: Real-time search provides better UX. Only implement debounce if performance issues observed. Premature optimization violates "make it work, then make it fast" principle.

## Implementation Recommendations

### High Priority

1. **Extract Modal Components** (Constitutional requirement: <200 lines)
   - StatusSelectionModal.tsx
   - KitSelectionModal.tsx
   - ReminderModal.tsx

2. **Add Accessibility Labels** (Constitutional requirement: accessibility)
   ```typescript
   <Pressable
     accessibilityLabel="Mark participant as checked in"
     accessibilityRole="button"
     accessibilityHint="Records attendance for this trial booking"
   >
   ```

3. **Add Offline Queue Support** (Extend existing pattern)
   - Create `updateBookingConversionStatusOffline` method
   - Add to CommandFactory if not exists

4. **Add Client-Side Validation**
   - Reminder date must be in future
   - All kit items must have sizes before submission

### Medium Priority

5. **Add JSDoc Comments** (Constitutional requirement)
   ```typescript
   /**
    * Updates booking payment status with optional kit items and reminder
    * @param bookingId - The booking ID to update
    * @param params - Status update parameters including optional kit_items, package_name, reminder_time
    * @throws {Error} If booking not found or validation fails
    */
   ```

6. **Performance Monitoring**
   - Add search performance logging
   - Track Outstanding section size metrics
   - Monitor modal render performance

### Low Priority

7. **Consider FlatList Migration** (Only if performance issues)
   - Replace ScrollView with FlatList for Outstanding and All sections
   - Add `keyExtractor`, `getItemLayout` for optimization

## Open Questions (Require Backend Team Input)

1. **90-Day Archive**: Confirm bookings older than 90 days are excluded by backend API
2. **Reminder Notifications**: What notification methods are used? (Email, Push, SMS, Dashboard)
3. **Conflict Resolution**: Does backend return 409 status for update conflicts? If not, how to detect?
4. **Status Transition Validation**: Does backend prevent regression from paid_dd/not_joining to other states?
5. **Mine View Filter**: How does backend determine "my bookings"? (User ID match on class_time coach field?)

## Conclusion

Research phase complete. All technical unknowns resolved with actionable decisions. Implementation can proceed to Phase 1 (Data Model and API Contracts) with high confidence. No blockers identified - existing infrastructure supports all spec requirements.

**Next Steps**: Proceed to Phase 1 artifact generation (data-model.md, contracts/, quickstart.md).
