# Quickstart Guide: Trial Bookings Management

**Feature**: 002-trial-bookings-management
**For**: Developers implementing or maintaining the Trial Bookings feature
**Last Updated**: 2025-11-16

## Overview

This guide helps developers understand and implement the Trial Bookings Management feature, which provides coaches with a streamlined interface to manage trial participant status updates, kit distribution, and follow-up scheduling.

### What You'll Build

- **Outstanding Section**: Auto-updated list of bookings requiring action (oldest first)
- **All Section**: Paginated list of all trial bookings (newest first)
- **Status Update Flow**: Five payment status options with conditional sub-flows
- **Kit Selection**: Two-step modal (package → sizes) for paid statuses
- **Reminder Scheduling**: Date/time picker for follow-up callbacks
- **Search & Filter**: Real-time search across both sections, Mine/All view toggle

### User Journey (30 seconds)

1. Coach opens Trial Bookings tab → sees Outstanding section (3 bookings)
2. Taps oldest booking → presses "Update Kit Status" button
3. Selects "Paid (Direct Debit)" → kit modal opens
4. Selects "Silver" package → size selection appears
5. Fills sizes for 4 items → presses "Confirm Kit"
6. Booking disappears from Outstanding → appears in All section with "Paid DD" badge

---

## File Organization

### Files You'll Modify

| File | Purpose | Lines Changed (est.) |
|------|---------|---------------------|
| `app/(tabs)/trials.tsx` | Main screen component | ~100 lines modified, ~50 lines added |
| `store/bookingStore.ts` | State management | ~30 lines modified |
| `services/api/bookings.service.ts` | API integration | Already complete (verify methods exist) |
| `types/api.ts` | TypeScript interfaces | ~10 lines (verify KitItem complete) |

### Files You May Create (Optional)

| File | Purpose | When to Create |
|------|---------|---------------|
| `components/features/trials/StatusSelectionModal.tsx` | Extract status modal | If trials.tsx exceeds 2000 lines |
| `components/features/trials/KitSelectionModal.tsx` | Extract kit modal | If trials.tsx exceeds 2000 lines |
| `components/features/trials/ReminderModal.tsx` | Extract reminder modal | If trials.tsx exceeds 2000 lines |

**Constitutional Rule**: Components should not exceed 200 lines. Extract if any modal grows beyond this threshold.

---

## State Management Patterns

### Zustand Store Structure

**File**: `/store/bookingStore.ts`

```typescript
interface BookingStore {
  // Core state
  allBookings: Booking[];        // All bookings (unfiltered)
  bookings: Booking[];           // Filtered bookings (search + view mode applied)

  // UI state
  isLoading: boolean;
  error: string | null;
  isOffline: boolean;
  lastSync: string | null;

  // Pagination
  pagination: {
    currentPage: number;
    totalPages: number;
    perPage: number;
    totalItems: number;
  };

  // Filters
  viewMode: 'mine' | 'all';      // Filter by coach assignment
  filters: {
    searchQuery: string;
  };

  // Actions
  fetchBookings: () => Promise<void>;
  fetchBookingsPage: (page: number) => Promise<void>;
  refreshBookings: () => Promise<void>;
  setViewMode: (mode: 'mine' | 'all') => void;
  setSearchQuery: (query: string) => void;
  updateBookingStatus: (id: number, status: string) => Promise<void>;
  applyFiltersAndPagination: () => void;
}
```

### Component State (Local)

**File**: `/app/(tabs)/trials.tsx`

```typescript
// Modal visibility
const [showStatusModal, setShowStatusModal] = useState(false);
const [showKitModal, setShowKitModal] = useState(false);
const [showReminderModal, setShowReminderModal] = useState(false);

// Selected booking context
const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
const [selectedStatus, setSelectedStatus] = useState<BookingStatus | null>(null);

// Kit selection flow
const [kitItems, setKitItems] = useState<KitItem[]>([]);
const [selectedPackage, setSelectedPackage] = useState<'basic' | 'silver' | 'gold' | null>(null);
const [kitSelectionStep, setKitSelectionStep] = useState<1 | 2>(1);

// Reminder scheduling
const [reminderDate, setReminderDate] = useState(new Date());
const [showDatePicker, setShowDatePicker] = useState(false);
const [showTimePicker, setShowTimePicker] = useState(false);

// Search
const [searchQuery, setSearchQuery] = useState('');

// View mode
const [viewMode, setViewMode] = useState<'mine' | 'all'>('mine');
```

---

## Modal Flow Diagrams

### Status Update Flow

```
Booking Card
    │
    ├─ "Check In" button (if scheduled)
    │   ↓
    │   Update attendance_status = 'completed'
    │   ↓
    │   "Update Kit Status" button appears
    │
    └─ "Update Kit Status" button (if checked in)
        ↓
    ┌──────────────────────┐
    │ Status Selection     │
    │ Modal                │
    │                      │
    │ • Paid (DD)         │─────┐
    │ • Paid (Awaiting DD)│─────┤
    │ • Unpaid (DD Sched) │     │  Kit
    │ • Unpaid (Follow Up)│     │  Flow
    │ • Not Joining       │     │
    └──────────────────────┘     │
         │        │               │
         │        └───────┐       │
         │                │       │
    Direct         Reminder      │
    Submit         Flow          │
         │                │      │
         ↓                ↓      ↓
    ┌────────┐    ┌──────────┐  ┌─────────────┐
    │ Submit │    │ Reminder │  │ Kit Modal   │
    │ Status │    │ DateTime │  │ (2 steps)   │
    │        │    │ Picker   │  │             │
    └────────┘    └──────────┘  └─────────────┘
                       │              │
                       ↓              ↓
                   Submit         Submit
                   with           with
                   reminder       kit items
```

### Kit Selection Two-Step Flow

```
┌──────────────────────────────┐
│ Step 1: Package Selection    │
│                               │
│  ○ Basic                      │
│     T-shirt, Trousers, Gloves │
│                               │
│  ○ Silver                     │
│     + Shin pads               │
│                               │
│  ○ Gold                       │
│     + Kit bag                 │
└───────────┬───────────────────┘
            │ Select package
            ↓
┌──────────────────────────────┐
│ Step 2: Size Selection       │
│                               │
│  T-shirt:    [Dropdown ▼]    │
│  Trousers:   [Dropdown ▼]    │
│  Gloves:     [Dropdown ▼]    │
│  Shin pads:  [Dropdown ▼]    │  (if Silver/Gold)
│  Kit bag:    One Size         │  (if Gold)
│                               │
│  [Back]           [Confirm]   │
└───────────┬───────────────────┘
            │ All sizes filled
            ↓
        Submit to API
```

---

## Implementation Checklist

### Phase 1: Outstanding Section Logic ✅

- [ ] Read current `isOutstandingBooking()` function in trials.tsx:160-178
- [ ] Verify logic matches spec FR-002: `(status === 'pending' && checked_in_at !== null) || status === 'unpaid_coach_call'`
- [ ] Confirm past bookings only: `startTime < now`
- [ ] Test outstanding detection with sample data
- [ ] Verify sorting: oldest first (ascending `start_time`)
- [ ] Confirm section hidden when empty: `{outstandingBookings.length > 0 && ...}`

### Phase 2: Status Modal ✅

- [ ] Verify modal displays 5 status options (trials.tsx:958-1043)
- [ ] Confirm icons and descriptions match design:
  - Paid (DD): checkmark-circle, green
  - Paid (Awaiting DD): time, blue
  - Unpaid (DD Scheduled): card, yellow
  - Unpaid (Follow Up): call, orange
  - Not Joining: close-circle, red
- [ ] Test `handleStatusSelect()` routing:
  - `paid_dd` | `paid_awaiting_dd` → `setShowKitModal(true)`
  - `unpaid_coach_call` → `setShowReminderModal(true)`
  - `unpaid_dd` | `not_joining` → `submitStatusUpdate()`
- [ ] Add accessibility labels to each option

### Phase 3: Kit Selection Modal ✅

- [ ] Verify two-step flow exists (trials.tsx:1048-1213)
- [ ] **Step 1 Validation**:
  - [ ] Three package options displayed
  - [ ] Package descriptions accurate
  - [ ] `handlePackageSelection()` pre-populates kit items array
  - [ ] Auto-advances to step 2 after selection
- [ ] **Step 2 Validation**:
  - [ ] Dropdown for each item in selected package
  - [ ] Size options match `getSizeOptions()` function (trials.tsx:515-524)
  - [ ] Back button returns to step 1
  - [ ] Confirm button calls `handleKitSubmit()`
- [ ] **Submit Validation**:
  - [ ] Check all items have sizes: `validKitItems.filter(item => item.type && item.size)`
  - [ ] Alert if validation fails
  - [ ] Call `submitStatusUpdate(bookingId, status, kitItems, packageName)`

### Phase 4: Reminder Modal ✅

- [ ] Verify modal exists (trials.tsx:1215-1350)
- [ ] DateTimePicker component configured:
  - [ ] `minimumDate={new Date()}` prevents past dates
  - [ ] Default value: tomorrow (`const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)`)
  - [ ] Separate date and time pickers
- [ ] Add client-side validation in `handleReminderSubmit()`:
  ```typescript
  if (reminderDate <= new Date()) {
    Alert.alert('Invalid Date', 'Reminder must be in the future');
    return;
  }
  ```
- [ ] Confirm ISO 8601 format: `reminderDate.toISOString()`
- [ ] Call `submitStatusUpdate(bookingId, status, undefined, undefined, reminderTime)`

### Phase 5: API Integration ✅

- [ ] Verify `updateBookingConversionStatus()` exists in bookings.service.ts:111-128
- [ ] Confirm request parameters match API contract:
  ```typescript
  {
    status: BookingStatus,
    kit_items?: KitItem[],
    package_name?: 'basic' | 'silver' | 'gold',
    reminder_time?: string // ISO 8601
  }
  ```
- [ ] Test error handling:
  - [ ] 400: Validation error → show Alert with error message
  - [ ] 404: Not found → show "Booking not found"
  - [ ] 409: Conflict → refresh data, show "Updated by another coach"
  - [ ] Network error → show "Network error, changes saved for sync"
- [ ] Implement optimistic update (optional):
  ```typescript
  // Update local state immediately
  updateLocalBookingStatus(bookingId, status);
  try {
    await bookingsService.updateBookingConversionStatus(bookingId, params);
  } catch (error) {
    // Rollback on error
    revertLocalBookingStatus(bookingId);
    handleError(error);
  }
  ```

### Phase 6: Search & Filter ✅

- [ ] Verify search input exists (trials.tsx:710-738)
- [ ] Confirm real-time filtering: `onChangeText={setSearchQuery}`
- [ ] Test search matches: name, email, phone (implemented in store)
- [ ] Verify clear button appears when `searchQuery.length > 0`
- [ ] Confirm both sections filter: Outstanding AND All
- [ ] Test empty state message when no results

### Phase 7: View Mode Toggle ✅

- [ ] Verify Mine/All tabs exist (trials.tsx:740-788)
- [ ] Confirm tab indicator animation: `withSpring` transition
- [ ] Test filtering logic in store:
  - Mine: filter by `class_time.coaches` includes current user
  - All: show all bookings
- [ ] Verify haptic feedback on tab switch

### Phase 8: Accessibility Enhancements ⚠️

- [ ] Add `accessibilityLabel` to all Pressable elements:
  ```typescript
  <Pressable
    accessibilityLabel="Check in participant"
    accessibilityRole="button"
    accessibilityHint="Marks participant as attended"
  >
  ```
- [ ] Add to modals:
  - [ ] Status options: "Select paid via direct debit"
  - [ ] Kit items: "Select t-shirt size"
  - [ ] Close buttons: "Close modal"
- [ ] Verify minimum touch targets: 44x44 points (currently 48px ✅)

### Phase 9: Performance Optimization 🔍

- [ ] Profile search performance with 100+ bookings
- [ ] If lag > 200ms, implement debounce:
  ```typescript
  const debouncedSearch = useMemo(
    () => debounce((query: string) => updateSearchQuery(query), 300),
    []
  );
  ```
- [ ] Consider FlatList migration if ScrollView causes jank
- [ ] Memoize `renderBookingCard` if re-renders are frequent:
  ```typescript
  const BookingCard = React.memo(({ booking }: { booking: Booking }) => {
    // ... card rendering
  });
  ```

### Phase 10: Offline Support 🌐

- [ ] Extend `commandFactory` for conversion status updates
- [ ] Implement `updateBookingConversionStatusOffline()`:
  ```typescript
  async updateBookingConversionStatusOffline(
    bookingId: number,
    params: UpdateBookingStatusParams
  ) {
    if (await offlineStorage.isOnline()) {
      try {
        return await this.updateBookingConversionStatus(bookingId, params);
      } catch (error) {
        queueCommand(CommandFactory.updateBookingConversionStatus(bookingId, params));
      }
    } else {
      queueCommand(CommandFactory.updateBookingConversionStatus(bookingId, params));
    }
  }
  ```
- [ ] Show "Saved for sync" message when offline
- [ ] Test offline queue sync on reconnection

---

## Common Pitfalls & Solutions

### 1. Hooks Inside Map/Loops

**Problem**:
```typescript
// ❌ WRONG - Causes "Rendered more hooks" error
{bookings.map(booking => {
  const animatedValue = useSharedValue(0); // Hook inside loop!
  return <BookingCard />;
})}
```

**Solution**:
```typescript
// ✅ CORRECT - Extract component with hook at top level
const BookingCard = ({ booking }: { booking: Booking }) => {
  const animatedValue = useSharedValue(0);
  return <Animated.View />;
};

{bookings.map(booking => <BookingCard key={booking.id} booking={booking} />)}
```

### 2. Undefined Text Rendering

**Problem**:
```typescript
// ❌ WRONG - Crashes if booking.names is undefined
<Text>{booking.names}</Text>
```

**Solution**:
```typescript
// ✅ CORRECT - Always provide fallback
<Text>{booking.names || ''}</Text>
```

### 3. Conditional Rendering with &&

**Problem**:
```typescript
// ❌ WRONG - May render 'false' or '0' as text
{bookings.length && <Text>Bookings: {bookings.length}</Text>}
```

**Solution**:
```typescript
// ✅ CORRECT - Use ternary with explicit null
{bookings.length > 0 ? <Text>Bookings: {bookings.length}</Text> : null}
```

### 4. Hardcoded Colors

**Problem**:
```typescript
// ❌ WRONG - Breaks dark mode
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', // Hardcoded!
  }
});
```

**Solution**:
```typescript
// ✅ CORRECT - Use dynamic theme colors
const palette = useThemeColors();
const styles = useMemo(() => createStyles(palette), [palette]);

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: palette.background, // Dynamic!
  }
});
```

### 5. Missing Error Handling

**Problem**:
```typescript
// ❌ WRONG - No error handling
const handleSubmit = async () => {
  await bookingsService.updateBookingConversionStatus(id, params);
  setShowModal(false);
};
```

**Solution**:
```typescript
// ✅ CORRECT - Comprehensive error handling
const handleSubmit = async () => {
  try {
    await bookingsService.updateBookingConversionStatus(id, params);
    Alert.alert('Success', 'Booking updated');
    setShowModal(false);
  } catch (error) {
    if (error.response?.status === 409) {
      Alert.alert('Conflict', 'Booking was updated by another coach. Please refresh.');
      await refreshBookings();
    } else {
      Alert.alert('Error', 'Failed to update. Changes saved for sync.');
    }
  }
};
```

---

## Testing Strategy (Manual)

Since no automated testing framework exists, follow this manual testing checklist:

### Test Case 1: Outstanding Section

1. Create booking with status='pending', checked_in_at=null → should NOT appear in Outstanding
2. Update checked_in_at → should appear in Outstanding (oldest first)
3. Update status='paid_dd' → should disappear from Outstanding
4. Create booking with status='unpaid_coach_call' → should appear in Outstanding

### Test Case 2: Kit Selection Flow

1. Select booking, click "Update Kit Status"
2. Choose "Paid (Direct Debit)"
3. Select "Silver" package → verify 4 items appear (tshirt, trousers, gloves, shinpads)
4. Fill only 3 sizes → click Confirm → should show validation error
5. Fill all 4 sizes → click Confirm → should submit successfully

### Test Case 3: Reminder Flow

1. Select "Unpaid (Follow Up)" status
2. Set reminder to yesterday → should show validation error (if client-side validation added)
3. Set reminder to tomorrow → should submit successfully
4. Verify reminder_time is ISO 8601 format in network request

### Test Case 4: Search

1. Type participant name → both Outstanding and All sections filter
2. Clear search → all bookings reappear
3. Search for non-existent name → empty state appears

### Test Case 5: Offline Mode

1. Toggle airplane mode ON
2. Update booking status → should show "Saved for sync"
3. Toggle airplane mode OFF
4. Wait for sync → booking should update on backend

---

## Debugging Tips

### Outstanding Section Empty (Expected to Have Items)

1. Check `isOutstandingBooking()` logic
2. Verify `start_time < now`
3. Confirm `checked_in_at !== null` for pending bookings
4. Check filter conditions in bookingStore

### Kit Modal Not Showing

1. Verify `handleStatusSelect()` sets `setShowKitModal(true)` for paid statuses
2. Check modal visibility: `visible={showKitModal}`
3. Ensure `selectedBooking` is set before opening modal

### Reminder Date Picker Broken

1. Confirm `@react-native-community/datetimepicker` version 8.4.4 installed
2. Check `minimumDate={new Date()}` prop
3. Verify platform-specific display: `Platform.OS === 'ios' ? 'compact' : 'default'`

### API Call Failing

1. Check network tab for request/response
2. Verify auth token in request headers
3. Confirm request body matches API contract (see contracts/booking-status-update.openapi.yaml)
4. Check backend logs for validation errors

### Performance Issues

1. Profile with React DevTools Profiler
2. Check `useMemo` dependencies are correct
3. Verify FlatList optimization if using (keyExtractor, getItemLayout)
4. Add performance logging: `console.time('search')` / `console.timeEnd('search')`

---

## Next Steps

1. **Read Spec**: Familiarize yourself with [spec.md](./spec.md) - especially User Scenarios
2. **Read Data Model**: Understand entities in [data-model.md](./data-model.md)
3. **Read API Contract**: Review endpoints in [contracts/booking-status-update.openapi.yaml](./contracts/booking-status-update.openapi.yaml)
4. **Read Research**: Review decisions in [research.md](./research.md)
5. **Run `/speckit.tasks`**: Generate actionable task list for implementation
6. **Start Implementation**: Follow generated tasks.md in priority order

---

## Support Resources

- **Constitution**: [.specify/memory/constitution.md](/.specify/memory/constitution.md) - Development rules
- **CLAUDE.md**: [CLAUDE.md](/CLAUDE.md) - Comprehensive development guide
- **Type Definitions**: [types/api.ts](/types/api.ts) - TypeScript interfaces
- **Design System**: [constants/Theme.ts](/constants/Theme.ts) - Spacing, colors, typography
- **Existing Implementation**: [app/(tabs)/trials.tsx](/app/(tabs)/trials.tsx) - Current code

---

**Questions?** Review the spec, data model, and API contract first. If still unclear, consult the development team.
