# Trial Bookings Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure trial bookings into a club-by-club pager with end-of-day report gating, an expanding bottom sheet flow (Enroller → Status → Licence Details → Kit), and a dashboard banner CTA.

**Architecture:** Decompose the existing 2,475-line `trials.tsx` into focused components: `ClubPager` (horizontal swipe), `ClubTrialsList` (per-club list + report button), and `BookingFlowSheet` (multi-step bottom sheet). Extend existing booking store and API service with new statuses and fields. Add `TrialsBanner` to both dashboard variants.

**Tech Stack:** React Native 0.81.4, Expo SDK 55, Expo Router 6, Zustand 5, React Native Reanimated 4, React Hook Form 7, expo-glass-effect

**Design Spec:** `docs/superpowers/specs/2026-03-28-trial-bookings-redesign-design.md`

---

### Task 1: Update Types and API Service

**Files:**
- Modify: `types/api.ts:47-67` (Booking interface and status type)
- Modify: `services/api/bookings.service.ts:6-17,35-40` (params and status types)
- Modify: `services/api/kitOrders.service.ts` (add delete method)

- [ ] **Step 1: Update BookingStatus type in types/api.ts**

Replace the `status` field on the `Booking` interface (line 53) with the new union type, and add `enroller_id` and `licence_details` fields:

```typescript
// In types/api.ts — replace the Booking interface (lines 47-67)
export type BookingStatus =
  | 'pending'
  | 'fully_paid'
  | 'paid_dd'           // legacy — map to fully_paid for display
  | 'paid_awaiting_dd'
  | 'deposit_and_dd'
  | 'deposit_only'
  | 'unpaid_dd'
  | 'unpaid'
  | 'unpaid_coach_call'  // legacy — keep for backwards compat
  | 'not_joining';

export interface LicenceDetails {
  name: string;
  date_of_birth: string;
  address: string;
}

export type PackageName = 'licence' | 'basic' | 'silver' | 'gold';

export interface Booking {
  id: number;
  uuid: string;
  names: string;
  email?: string;
  phone?: string;
  status?: BookingStatus;
  attendance_status?: 'scheduled' | 'completed' | 'no-show' | 'cancelled';
  start_time: string;
  cancelled_at?: string | null;
  checked_in_at?: string | null;
  no_show_at?: string | null;
  no_show: boolean;
  channel: 'Cadence' | 'Website';
  channel_display_name?: string;
  source?: string;
  class_time?: ClassTime;
  club?: Club;
  enroller_id?: number;
  licence_details?: LicenceDetails;
  created_at?: string;
  updated_at?: string;
}
```

- [ ] **Step 2: Update BookingsService status types**

In `services/api/bookings.service.ts`, update `BookingsParams` (line 11) and `UpdateBookingStatusParams` (lines 35-40):

```typescript
// Replace BookingsParams.status type (line 11)
status?: BookingStatus;

// Replace UpdateBookingStatusParams (lines 35-40)
interface UpdateBookingStatusParams {
  status: BookingStatus;
  kit_items?: Array<{ type: string; size: string; }>;
  package_name?: PackageName;
  reminder_time?: string;
  enroller_id?: number;
  licence_details?: LicenceDetails;
}
```

Add the import at the top of the file (line 2):

```typescript
import { Booking, PaginatedResponse, BookingStatistics, KitOrder, Reminder, BookingStatus, PackageName, LicenceDetails } from '@/types/api';
```

- [ ] **Step 3: Add deleteKitOrders method to kitOrders service**

In `services/api/kitOrders.service.ts`, add before the closing brace of the class (before line 57):

```typescript
  async deleteBookingKitOrders(bookingId: number): Promise<void> {
    await apiClient.delete(`/bookings/${bookingId}/kit-orders`);
  }
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No new errors from these type changes (existing errors may remain from the old trials.tsx referencing old types — that's expected since we'll replace it later).

- [ ] **Step 5: Commit**

```bash
git add types/api.ts services/api/bookings.service.ts services/api/kitOrders.service.ts
git commit -m "feat: update booking types with new statuses, licence details, and enroller"
```

---

### Task 2: Extend Booking Store

**Files:**
- Modify: `store/bookingStore.ts`

- [ ] **Step 1: Add helper to normalise legacy status values**

Add after the imports (line 7) in `store/bookingStore.ts`:

```typescript
import { Booking, BookingStatus } from '@/types/api';

/** Map legacy API status values to current display values */
const normaliseStatus = (status: BookingStatus | undefined): BookingStatus | undefined => {
  if (status === 'paid_dd') return 'fully_paid';
  return status;
};

/** Check if a status is one of the "paid" statuses */
const isPaidStatus = (status?: BookingStatus): boolean =>
  status === 'fully_paid' || status === 'paid_dd' || status === 'paid_awaiting_dd';

/** Check if a booking is fully marked (has both attendance and booking status) */
const isBookingFullyMarked = (booking: Booking): boolean => {
  const hasAttendance = booking.attendance_status === 'completed' || booking.attendance_status === 'no-show';
  const hasStatus = !!booking.status && booking.status !== 'pending';
  return hasAttendance && hasStatus;
};
```

- [ ] **Step 2: Add new store methods for club-based views**

Add these methods to the `BookingState` interface (after line 48):

```typescript
  getBookingsByClub: () => Map<number, { club: Club; bookings: Booking[] }>;
  getOutstandingCount: () => number;
  getClubCompletionStatus: (clubId: number) => { complete: number; total: number };
  isClubReportReady: (clubId: number) => boolean;
  updateBookingConversionStatus: (
    bookingId: number,
    status: BookingStatus,
    enrollerId: number,
    licenceDetails?: LicenceDetails,
    packageName?: PackageName,
    kitItems?: Array<{ type: string; size: string }>
  ) => Promise<void>;
```

Add the corresponding import at the top:

```typescript
import { Booking, BookingStatus, LicenceDetails, PackageName } from '@/types/api';
import { Club } from '@/types/api';
```

- [ ] **Step 3: Implement the new store methods**

Add before the closing `}))` of the store (before the last line):

```typescript
  getBookingsByClub: () => {
    const todaysBookings = get().getTodaysBookings();
    const clubMap = new Map<number, { club: Club; bookings: Booking[] }>();

    for (const booking of todaysBookings) {
      if (!booking.club) continue;
      const clubId = booking.club.id;
      if (!clubMap.has(clubId)) {
        clubMap.set(clubId, { club: booking.club, bookings: [] });
      }
      clubMap.get(clubId)!.bookings.push(booking);
    }

    return clubMap;
  },

  getOutstandingCount: () => {
    const todaysBookings = get().getTodaysBookings();
    return todaysBookings.filter(b => !isBookingFullyMarked(b)).length;
  },

  getClubCompletionStatus: (clubId: number) => {
    const todaysBookings = get().getTodaysBookings();
    const clubBookings = todaysBookings.filter(b => b.club?.id === clubId);
    const complete = clubBookings.filter(isBookingFullyMarked).length;
    return { complete, total: clubBookings.length };
  },

  isClubReportReady: (clubId: number) => {
    const { complete, total } = get().getClubCompletionStatus(clubId);
    return total > 0 && complete === total;
  },

  updateBookingConversionStatus: async (
    bookingId: number,
    status: BookingStatus,
    enrollerId: number,
    licenceDetails?: LicenceDetails,
    packageName?: PackageName,
    kitItems?: Array<{ type: string; size: string }>
  ) => {
    const { allBookings } = get();

    // Optimistically update the UI
    const updatedBookings = allBookings.map(booking => {
      if (booking.id === bookingId) {
        return {
          ...booking,
          status,
          enroller_id: enrollerId,
          licence_details: licenceDetails,
        };
      }
      return booking;
    });

    set({ allBookings: updatedBookings });
    get().applyFiltersAndPagination();

    // Send to API
    await bookingsService.updateBookingConversionStatus(bookingId, {
      status,
      enroller_id: enrollerId,
      licence_details: licenceDetails,
      package_name: packageName,
      kit_items: kitItems,
    });
  },
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add store/bookingStore.ts
git commit -m "feat: extend booking store with club grouping, completion tracking, and conversion status"
```

---

### Task 3: TrialsBanner Component

**Files:**
- Create: `components/features/TrialsBanner.tsx`
- Modify: `components/dashboard/CoachDashboard.tsx`
- Modify: `components/dashboard/AdminDashboard.tsx`

- [ ] **Step 1: Create TrialsBanner component**

Create `components/features/TrialsBanner.tsx`:

```typescript
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { useBookingStore } from '@/store/bookingStore';
import Theme from '@/constants/Theme';

export function TrialsBanner() {
  const palette = useThemeColors();
  const outstandingCount = useBookingStore(s => s.getOutstandingCount());
  const hasOutstanding = outstandingCount > 0;
  const styles = useMemo(() => createStyles(palette, hasOutstanding), [palette, hasOutstanding]);

  return (
    <TouchableOpacity
      style={styles.banner}
      activeOpacity={0.7}
      onPress={() => router.push('/(tabs)/trials')}
    >
      <View style={styles.left}>
        <Ionicons
          name="person-add"
          size={20}
          color={hasOutstanding ? Theme.colors.primary : palette.textTertiary}
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Trial Bookings</Text>
          <Text style={styles.subtitle}>
            {hasOutstanding
              ? `${outstandingCount} outstanding to review`
              : 'All up to date'}
          </Text>
        </View>
      </View>
      <View style={styles.action}>
        <Text style={styles.actionText}>View</Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={hasOutstanding ? '#FFFFFF' : palette.textTertiary}
        />
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (palette: ThemeColors, hasOutstanding: boolean) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderRadius: 12,
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: hasOutstanding ? '#FFF3E8' : palette.backgroundSecondary,
      borderWidth: hasOutstanding ? 2 : 1,
      borderColor: hasOutstanding ? Theme.colors.primary : palette.borderDefault,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    textContainer: {
      flex: 1,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: hasOutstanding ? palette.textPrimary : palette.textTertiary,
    },
    subtitle: {
      fontSize: 12,
      color: hasOutstanding ? palette.textSecondary : palette.textTertiary,
      marginTop: 2,
    },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: hasOutstanding ? Theme.colors.primary : palette.borderDefault,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    actionText: {
      fontSize: 12,
      fontWeight: '600',
      color: hasOutstanding ? '#FFFFFF' : palette.textTertiary,
    },
  });
```

- [ ] **Step 2: Add TrialsBanner to CoachDashboard**

In `components/dashboard/CoachDashboard.tsx`, add the import at the top:

```typescript
import { TrialsBanner } from '@/components/features/TrialsBanner';
```

Add `<TrialsBanner />` inside the `<ScrollView>`, right after the `<CoachHeader>` component's closing tag (after the header props end).

- [ ] **Step 3: Add TrialsBanner to AdminDashboard**

In `components/dashboard/AdminDashboard.tsx`, add the import at the top:

```typescript
import { TrialsBanner } from '@/components/features/TrialsBanner';
```

Add `<TrialsBanner />` inside the `<ScrollView>`, right after the `<DashboardHeader>` component's closing tag.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add components/features/TrialsBanner.tsx components/dashboard/CoachDashboard.tsx components/dashboard/AdminDashboard.tsx
git commit -m "feat: add trials banner CTA to dashboard screens"
```

---

### Task 4: BookingFlowSheet — Enroller and Status Steps

**Files:**
- Create: `components/features/trials/steps/EnrollerStep.tsx`
- Create: `components/features/trials/steps/StatusStep.tsx`

- [ ] **Step 1: Create EnrollerStep component**

Create `components/features/trials/steps/EnrollerStep.tsx`:

```typescript
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/store/authStore';
import { coachesService } from '@/services/api/coaches.service';
import { User } from '@/types/api';
import Theme from '@/constants/Theme';

interface EnrollerStepProps {
  selectedCoachId: number | null;
  onSelect: (coachId: number) => void;
  onNext: () => void;
  bookingName: string;
  bookingDetail: string;
}

export function EnrollerStep({ selectedCoachId, onSelect, onNext, bookingName, bookingDetail }: EnrollerStepProps) {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const currentUser = useAuthStore(s => s.user);
  const [coaches, setCoaches] = useState<User[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    coachesService.getAllCoaches().then(setCoaches).catch(() => {});
  }, []);

  // Auto-fill to current user on mount
  useEffect(() => {
    if (!selectedCoachId && currentUser) {
      onSelect(currentUser.id);
    }
  }, [currentUser]);

  const selectedCoach = coaches.find(c => c.id === selectedCoachId) || currentUser;

  return (
    <View style={styles.container}>
      <Text style={styles.stepLabel}>Step 1 of 2</Text>
      <Text style={styles.title}>Enroller</Text>
      <Text style={styles.detail}>{bookingName} · {bookingDetail}</Text>

      <Text style={styles.fieldLabel}>Enrolling Coach</Text>
      <TouchableOpacity
        style={styles.dropdown}
        activeOpacity={0.7}
        onPress={() => setDropdownOpen(!dropdownOpen)}
      >
        <Text style={styles.dropdownText}>
          {selectedCoach?.name || selectedCoach?.email || 'Select coach...'}
        </Text>
        <Ionicons name={dropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color={palette.textTertiary} />
      </TouchableOpacity>

      {dropdownOpen ? (
        <ScrollView style={styles.dropdownList} nestedScrollEnabled>
          {coaches.map(coach => (
            <TouchableOpacity
              key={coach.id}
              style={[
                styles.dropdownItem,
                coach.id === selectedCoachId ? styles.dropdownItemSelected : null,
              ]}
              onPress={() => {
                onSelect(coach.id);
                setDropdownOpen(false);
              }}
            >
              <Text style={[
                styles.dropdownItemText,
                coach.id === selectedCoachId ? styles.dropdownItemTextSelected : null,
              ]}>
                {coach.name || coach.email || ''}
              </Text>
              {coach.id === selectedCoachId ? (
                <Ionicons name="checkmark" size={18} color={Theme.colors.primary} />
              ) : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      <Text style={styles.helperText}>Auto-filled to you. Change if covering for another coach.</Text>

      <TouchableOpacity
        style={[styles.nextButton, !selectedCoachId ? styles.nextButtonDisabled : null]}
        activeOpacity={0.7}
        onPress={onNext}
        disabled={!selectedCoachId}
      >
        <Text style={[styles.nextButtonText, !selectedCoachId ? styles.nextButtonTextDisabled : null]}>
          Next
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    stepLabel: {
      fontSize: 11,
      color: palette.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: palette.textPrimary,
      marginBottom: 4,
    },
    detail: {
      fontSize: 12,
      color: palette.textSecondary,
      marginBottom: 16,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.textSecondary,
      marginBottom: 6,
    },
    dropdown: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: palette.borderDefault,
      borderRadius: 10,
      padding: 12,
    },
    dropdownText: {
      fontSize: 14,
      color: palette.textPrimary,
    },
    dropdownList: {
      maxHeight: 160,
      borderWidth: 1,
      borderColor: palette.borderDefault,
      borderRadius: 10,
      marginTop: 4,
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderLight,
    },
    dropdownItemSelected: {
      backgroundColor: '#FFF3E8',
    },
    dropdownItemText: {
      fontSize: 14,
      color: palette.textPrimary,
    },
    dropdownItemTextSelected: {
      color: Theme.colors.primary,
      fontWeight: '600',
    },
    helperText: {
      fontSize: 11,
      color: palette.textTertiary,
      marginTop: 8,
      marginBottom: 20,
    },
    nextButton: {
      backgroundColor: Theme.colors.primary,
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 'auto',
    },
    nextButtonDisabled: {
      backgroundColor: palette.borderDefault,
    },
    nextButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    nextButtonTextDisabled: {
      color: palette.textTertiary,
    },
  });
```

- [ ] **Step 2: Create StatusStep component**

Create `components/features/trials/steps/StatusStep.tsx`:

```typescript
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { BookingStatus } from '@/types/api';
import Theme from '@/constants/Theme';

interface StatusOption {
  value: BookingStatus;
  label: string;
  hint?: string;
  isDestructive?: boolean;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'fully_paid', label: 'Fully Paid', hint: 'Kit + Licence →' },
  { value: 'paid_awaiting_dd', label: 'Paid (awaiting DD)', hint: 'Kit + Licence →' },
  { value: 'deposit_and_dd', label: 'Deposit and DD' },
  { value: 'deposit_only', label: 'Deposit only' },
  { value: 'unpaid_dd', label: 'Unpaid (DD Scheduled)' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'not_joining', label: 'Not Joining', isDestructive: true },
];

interface StatusStepProps {
  totalSteps: number;
  onSelect: (status: BookingStatus) => void;
  bookingName: string;
  enrollerName: string;
}

export function StatusStep({ totalSteps, onSelect, bookingName, enrollerName }: StatusStepProps) {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.container}>
      <Text style={styles.stepLabel}>Step 2 of {totalSteps}</Text>
      <Text style={styles.title}>Booking Status</Text>
      <Text style={styles.detail}>{bookingName} · Enroller: {enrollerName}</Text>

      <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
        {STATUS_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              option.isDestructive ? styles.optionDestructive : null,
            ]}
            activeOpacity={0.7}
            onPress={() => onSelect(option.value)}
          >
            <Text style={[
              styles.optionLabel,
              option.isDestructive ? styles.optionLabelDestructive : null,
            ]}>
              {option.label}
            </Text>
            {option.hint ? (
              <Text style={styles.optionHint}>{option.hint}</Text>
            ) : null}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    stepLabel: {
      fontSize: 11,
      color: palette.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: palette.textPrimary,
      marginBottom: 4,
    },
    detail: {
      fontSize: 12,
      color: palette.textSecondary,
      marginBottom: 14,
    },
    optionsList: {
      flex: 1,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: palette.borderDefault,
      borderRadius: 10,
      padding: 12,
      marginBottom: 6,
    },
    optionDestructive: {
      borderColor: '#FFCDD2',
      backgroundColor: '#FFF8F8',
    },
    optionLabel: {
      fontSize: 14,
      color: palette.textPrimary,
    },
    optionLabelDestructive: {
      color: Theme.colors.error,
    },
    optionHint: {
      fontSize: 10,
      color: palette.textTertiary,
    },
  });
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add components/features/trials/steps/EnrollerStep.tsx components/features/trials/steps/StatusStep.tsx
git commit -m "feat: add EnrollerStep and StatusStep components for booking flow"
```

---

### Task 5: BookingFlowSheet — Licence Details and Kit Steps

**Files:**
- Create: `components/features/trials/steps/LicenceDetailsStep.tsx`
- Create: `components/features/trials/steps/KitPackageStep.tsx`

- [ ] **Step 1: Create LicenceDetailsStep component**

Create `components/features/trials/steps/LicenceDetailsStep.tsx`:

```typescript
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { LicenceDetails } from '@/types/api';
import Theme from '@/constants/Theme';

interface LicenceDetailsStepProps {
  initialName: string;
  value: Partial<LicenceDetails>;
  onChange: (details: Partial<LicenceDetails>) => void;
  onNext: () => void;
  bookingName: string;
  statusLabel: string;
}

export function LicenceDetailsStep({
  initialName,
  value,
  onChange,
  onNext,
  bookingName,
  statusLabel,
}: LicenceDetailsStepProps) {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const name = value.name ?? initialName;
  const dob = value.date_of_birth ? new Date(value.date_of_birth) : undefined;
  const address = value.address ?? '';

  const isValid = name.trim().length > 0 && dob !== undefined && address.trim().length > 0;

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      onChange({ ...value, date_of_birth: selectedDate.toISOString().split('T')[0] });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.stepLabel}>Step 3 of 4</Text>
      <Text style={styles.title}>Licence Details</Text>
      <Text style={styles.detail}>{bookingName} · {statusLabel}</Text>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={text => onChange({ ...value, name: text })}
          placeholder="Full name"
          placeholderTextColor={palette.textTertiary}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Date of Birth</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Text style={dob ? styles.inputText : styles.placeholderText}>
            {dob ? dob.toLocaleDateString('en-GB') : 'Select date...'}
          </Text>
        </TouchableOpacity>
        {showDatePicker ? (
          <DateTimePicker
            value={dob || new Date(2000, 0, 1)}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        ) : null}
      </View>

      <View style={[styles.field, styles.fieldGrow]}>
        <Text style={styles.fieldLabel}>Address</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={address}
          onChangeText={text => onChange({ ...value, address: text })}
          placeholder="Enter full address..."
          placeholderTextColor={palette.textTertiary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity
        style={[styles.nextButton, !isValid ? styles.nextButtonDisabled : null]}
        activeOpacity={0.7}
        onPress={onNext}
        disabled={!isValid}
      >
        <Text style={[styles.nextButtonText, !isValid ? styles.nextButtonTextDisabled : null]}>
          Next
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    stepLabel: {
      fontSize: 11,
      color: palette.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: palette.textPrimary,
      marginBottom: 4,
    },
    detail: {
      fontSize: 12,
      color: palette.textSecondary,
      marginBottom: 16,
    },
    field: {
      marginBottom: 14,
    },
    fieldGrow: {
      flex: 1,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.textSecondary,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.borderDefault,
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      color: palette.textPrimary,
    },
    inputText: {
      fontSize: 14,
      color: palette.textPrimary,
    },
    placeholderText: {
      fontSize: 14,
      color: palette.textTertiary,
    },
    textArea: {
      minHeight: 80,
      flex: 1,
    },
    nextButton: {
      backgroundColor: Theme.colors.primary,
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 16,
    },
    nextButtonDisabled: {
      backgroundColor: palette.borderDefault,
    },
    nextButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    nextButtonTextDisabled: {
      color: palette.textTertiary,
    },
  });
```

- [ ] **Step 2: Create KitPackageStep component**

Create `components/features/trials/steps/KitPackageStep.tsx`:

```typescript
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { PackageName } from '@/types/api';
import Theme from '@/constants/Theme';

interface PackageOption {
  value: PackageName;
  label: string;
  items: string;
}

const PACKAGES: PackageOption[] = [
  { value: 'licence', label: 'Licence', items: 'T-shirt, Trousers' },
  { value: 'basic', label: 'Basic', items: 'T-shirt, Trousers, Gloves' },
  { value: 'silver', label: 'Silver', items: 'T-shirt, Trousers, Gloves, Shinpads' },
  { value: 'gold', label: 'Gold', items: 'T-shirt, Trousers, Gloves, Shinpads, Kit bag' },
];

const PACKAGE_KIT_ITEMS: Record<PackageName, Array<{ type: string; label: string }>> = {
  licence: [
    { type: 'tshirt', label: 'T-shirt' },
    { type: 'trousers', label: 'Trousers' },
  ],
  basic: [
    { type: 'tshirt', label: 'T-shirt' },
    { type: 'trousers', label: 'Trousers' },
    { type: 'gloves', label: 'Gloves' },
  ],
  silver: [
    { type: 'tshirt', label: 'T-shirt' },
    { type: 'trousers', label: 'Trousers' },
    { type: 'gloves', label: 'Gloves' },
    { type: 'shinpads', label: 'Shinpads' },
  ],
  gold: [
    { type: 'tshirt', label: 'T-shirt' },
    { type: 'trousers', label: 'Trousers' },
    { type: 'gloves', label: 'Gloves' },
    { type: 'shinpads', label: 'Shinpads' },
    { type: 'kitbag', label: 'Kit bag' },
  ],
};

const TSHIRT_SIZES = ['Small Youth', 'Medium Youth', 'Large Youth', 'XL Youth', 'Small', 'Medium', 'Large', 'XL', '2XL', '3XL'];
const TROUSER_SIZES = ['Small Youth', 'Medium Youth', 'Large Youth', 'XL Youth', 'Small', 'Medium', 'Large', 'XL', '2XL', '3XL'];
const GLOVE_SIZES = ['8oz', '10oz', '12oz', '14oz', '16oz'];
const SHINPAD_SIZES = ['Small', 'Medium', 'Large', 'XL'];
const KITBAG_SIZES = ['One Size'];

const SIZE_MAP: Record<string, string[]> = {
  tshirt: TSHIRT_SIZES,
  trousers: TROUSER_SIZES,
  gloves: GLOVE_SIZES,
  shinpads: SHINPAD_SIZES,
  kitbag: KITBAG_SIZES,
};

type FlowStep = 'package' | 'sizes';

interface KitPackageStepProps {
  onConfirm: (packageName: PackageName, kitItems: Array<{ type: string; size: string }>) => void;
  bookingName: string;
  statusLabel: string;
}

export function KitPackageStep({ onConfirm, bookingName, statusLabel }: KitPackageStepProps) {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [flowStep, setFlowStep] = useState<FlowStep>('package');
  const [selectedPackage, setSelectedPackage] = useState<PackageName | null>(null);
  const [sizes, setSizes] = useState<Record<string, string>>({});

  const handlePackageSelect = (pkg: PackageName) => {
    setSelectedPackage(pkg);
    setSizes({});
    setFlowStep('sizes');
  };

  const packageItems = selectedPackage ? PACKAGE_KIT_ITEMS[selectedPackage] : [];
  const allSizesSelected = packageItems.every(item => sizes[item.type]);

  const handleConfirm = () => {
    if (!selectedPackage || !allSizesSelected) return;
    const kitItems = packageItems.map(item => ({
      type: item.type,
      size: sizes[item.type],
    }));
    onConfirm(selectedPackage, kitItems);
  };

  if (flowStep === 'sizes' && selectedPackage) {
    return (
      <View style={styles.container}>
        <Text style={styles.stepLabel}>Step 4 of 4</Text>
        <Text style={styles.title}>Select Sizes</Text>
        <Text style={styles.detail}>{bookingName} · {PACKAGES.find(p => p.value === selectedPackage)?.label || ''} Package</Text>

        <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
          {packageItems.map(item => (
            <View key={item.type} style={styles.sizeField}>
              <Text style={styles.sizeLabel}>{item.label}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sizeOptions}>
                {SIZE_MAP[item.type].map(size => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.sizeChip,
                      sizes[item.type] === size ? styles.sizeChipSelected : null,
                    ]}
                    onPress={() => setSizes({ ...sizes, [item.type]: size })}
                  >
                    <Text style={[
                      styles.sizeChipText,
                      sizes[item.type] === size ? styles.sizeChipTextSelected : null,
                    ]}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setFlowStep('package')}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmButton, !allSizesSelected ? styles.confirmButtonDisabled : null]}
            activeOpacity={0.7}
            onPress={handleConfirm}
            disabled={!allSizesSelected}
          >
            <Text style={[styles.confirmButtonText, !allSizesSelected ? styles.confirmButtonTextDisabled : null]}>
              Confirm
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.stepLabel}>Step 4 of 4</Text>
      <Text style={styles.title}>Select Package</Text>
      <Text style={styles.detail}>{bookingName} · {statusLabel}</Text>

      <ScrollView style={styles.packageList} showsVerticalScrollIndicator={false}>
        {PACKAGES.map(pkg => (
          <TouchableOpacity
            key={pkg.value}
            style={[
              styles.packageOption,
              selectedPackage === pkg.value ? styles.packageOptionSelected : null,
            ]}
            activeOpacity={0.7}
            onPress={() => handlePackageSelect(pkg.value)}
          >
            <View style={styles.packageInfo}>
              <Text style={styles.packageLabel}>{pkg.label}</Text>
              <Text style={styles.packageItems}>{pkg.items}</Text>
            </View>
            {selectedPackage === pkg.value ? (
              <View style={styles.checkmark}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
            ) : null}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    stepLabel: {
      fontSize: 11,
      color: palette.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: palette.textPrimary,
      marginBottom: 4,
    },
    detail: {
      fontSize: 12,
      color: palette.textSecondary,
      marginBottom: 16,
    },
    packageList: {
      flex: 1,
    },
    packageOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: palette.borderDefault,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
    },
    packageOptionSelected: {
      borderWidth: 2,
      borderColor: Theme.colors.primary,
      backgroundColor: '#FFF8F2',
    },
    packageInfo: {
      flex: 1,
    },
    packageLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.textPrimary,
    },
    packageItems: {
      fontSize: 11,
      color: palette.textSecondary,
      marginTop: 2,
    },
    checkmark: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: Theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemsList: {
      flex: 1,
    },
    sizeField: {
      marginBottom: 16,
    },
    sizeLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.textPrimary,
      marginBottom: 8,
    },
    sizeOptions: {
      flexDirection: 'row',
    },
    sizeChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: palette.borderDefault,
      marginRight: 6,
    },
    sizeChipSelected: {
      backgroundColor: Theme.colors.primary,
      borderColor: Theme.colors.primary,
    },
    sizeChipText: {
      fontSize: 12,
      color: palette.textPrimary,
    },
    sizeChipTextSelected: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    footer: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
    },
    backButton: {
      flex: 1,
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: palette.borderDefault,
    },
    backButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.textPrimary,
    },
    confirmButton: {
      flex: 2,
      backgroundColor: Theme.colors.primary,
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    confirmButtonDisabled: {
      backgroundColor: palette.borderDefault,
    },
    confirmButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    confirmButtonTextDisabled: {
      color: palette.textTertiary,
    },
  });
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add components/features/trials/steps/LicenceDetailsStep.tsx components/features/trials/steps/KitPackageStep.tsx
git commit -m "feat: add LicenceDetailsStep and KitPackageStep components"
```

---

### Task 6: BookingFlowSheet Container

**Files:**
- Create: `components/features/trials/BookingFlowSheet.tsx`

- [ ] **Step 1: Create the BookingFlowSheet component**

Create `components/features/trials/BookingFlowSheet.tsx`:

```typescript
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { useBookingStore } from '@/store/bookingStore';
import { Booking, BookingStatus, LicenceDetails, PackageName } from '@/types/api';
import { User } from '@/types/api';
import kitOrdersService from '@/services/api/kitOrders.service';
import { EnrollerStep } from './steps/EnrollerStep';
import { StatusStep } from './steps/StatusStep';
import { LicenceDetailsStep } from './steps/LicenceDetailsStep';
import { KitPackageStep } from './steps/KitPackageStep';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HALF_HEIGHT = SCREEN_HEIGHT * 0.45;
const FULL_HEIGHT = SCREEN_HEIGHT * 0.9;

type FlowStep = 'enroller' | 'status' | 'licence' | 'kit';

const isPaidStatus = (status: BookingStatus): boolean =>
  status === 'fully_paid' || status === 'paid_awaiting_dd';

const getStatusLabel = (status: BookingStatus): string => {
  switch (status) {
    case 'fully_paid': return 'Fully Paid';
    case 'paid_awaiting_dd': return 'Paid (awaiting DD)';
    case 'deposit_and_dd': return 'Deposit and DD';
    case 'deposit_only': return 'Deposit only';
    case 'unpaid_dd': return 'Unpaid (DD Scheduled)';
    case 'unpaid': return 'Unpaid';
    case 'not_joining': return 'Not Joining';
    default: return 'Pending';
  }
};

interface BookingFlowSheetProps {
  booking: Booking | null;
  visible: boolean;
  onClose: () => void;
  coaches: User[];
}

export function BookingFlowSheet({ booking, visible, onClose, coaches }: BookingFlowSheetProps) {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const updateConversionStatus = useBookingStore(s => s.updateBookingConversionStatus);

  const [step, setStep] = useState<FlowStep>('enroller');
  const [enrolerId, setEnrolerId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | null>(null);
  const [licenceDetails, setLicenceDetails] = useState<Partial<LicenceDetails>>({});

  const sheetHeight = useSharedValue(HALF_HEIGHT);

  const animatedSheetStyle = useAnimatedStyle(() => ({
    height: withSpring(sheetHeight.value, { damping: 20, stiffness: 150 }),
  }));

  const resetFlow = useCallback(() => {
    setStep('enroller');
    setEnrolerId(null);
    setSelectedStatus(null);
    setLicenceDetails({});
    sheetHeight.value = HALF_HEIGHT;
  }, []);

  const handleClose = useCallback(() => {
    resetFlow();
    onClose();
  }, [onClose, resetFlow]);

  const handleEnrollerNext = useCallback(() => {
    setStep('status');
  }, []);

  const handleStatusSelect = useCallback(async (status: BookingStatus) => {
    setSelectedStatus(status);

    // Check if changing from paid to not_joining — confirm kit deletion
    if (status === 'not_joining' && booking && isPaidStatus(booking.status as BookingStatus)) {
      Alert.alert(
        'Cancel Kit Order',
        'This will cancel their kit order. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            style: 'destructive',
            onPress: async () => {
              try {
                await kitOrdersService.deleteBookingKitOrders(booking.id);
              } catch (e) {
                // Kit deletion is best-effort
              }
              await updateConversionStatus(booking.id, status, enrolerId!);
              handleClose();
            },
          },
        ]
      );
      return;
    }

    if (isPaidStatus(status)) {
      // Paid statuses go to licence details
      sheetHeight.value = FULL_HEIGHT;
      setLicenceDetails({ name: booking?.names || '' });
      setStep('licence');
    } else {
      // Non-paid statuses complete here
      if (booking && enrolerId) {
        await updateConversionStatus(booking.id, status, enrolerId);
      }
      handleClose();
    }
  }, [booking, enrolerId, updateConversionStatus, handleClose]);

  const handleLicenceNext = useCallback(() => {
    setStep('kit');
  }, []);

  const handleKitConfirm = useCallback(async (
    packageName: PackageName,
    kitItems: Array<{ type: string; size: string }>
  ) => {
    if (booking && enrolerId && selectedStatus) {
      await updateConversionStatus(
        booking.id,
        selectedStatus,
        enrolerId,
        licenceDetails as LicenceDetails,
        packageName,
        kitItems
      );
    }
    handleClose();
  }, [booking, enrolerId, selectedStatus, licenceDetails, updateConversionStatus, handleClose]);

  if (!booking) return null;

  const bookingDetail = [
    booking.class_time?.name,
    booking.start_time ? new Date(booking.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '',
  ].filter(Boolean).join(' · ');

  const enrollerName = coaches.find(c => c.id === enrolerId)?.name || coaches.find(c => c.id === enrolerId)?.email || '';

  const totalSteps = selectedStatus && isPaidStatus(selectedStatus) ? 4 : 2;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <Animated.View style={[styles.sheet, animatedSheetStyle]}>
        <View style={styles.handle} />

        {step === 'enroller' ? (
          <EnrollerStep
            selectedCoachId={enrolerId}
            onSelect={setEnrolerId}
            onNext={handleEnrollerNext}
            bookingName={booking.names}
            bookingDetail={bookingDetail}
          />
        ) : null}

        {step === 'status' ? (
          <StatusStep
            totalSteps={totalSteps}
            onSelect={handleStatusSelect}
            bookingName={booking.names}
            enrollerName={enrollerName}
          />
        ) : null}

        {step === 'licence' ? (
          <LicenceDetailsStep
            initialName={booking.names}
            value={licenceDetails}
            onChange={setLicenceDetails}
            onNext={handleLicenceNext}
            bookingName={booking.names}
            statusLabel={selectedStatus ? getStatusLabel(selectedStatus) : ''}
          />
        ) : null}

        {step === 'kit' ? (
          <KitPackageStep
            onConfirm={handleKitConfirm}
            bookingName={booking.names}
            statusLabel={selectedStatus ? getStatusLabel(selectedStatus) : ''}
          />
        ) : null}
      </Animated.View>
    </Modal>
  );
}

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: palette.background,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingTop: 8,
      paddingBottom: 32,
    },
    handle: {
      width: 36,
      height: 4,
      backgroundColor: palette.borderDefault,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
  });
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add components/features/trials/BookingFlowSheet.tsx
git commit -m "feat: add BookingFlowSheet container with multi-step bottom sheet flow"
```

---

### Task 7: ClubTrialsList Component

**Files:**
- Create: `components/features/trials/ClubTrialsList.tsx`

- [ ] **Step 1: Create ClubTrialsList component**

Create `components/features/trials/ClubTrialsList.tsx`:

```typescript
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { useBookingStore } from '@/store/bookingStore';
import { Booking, BookingStatus, Club, User } from '@/types/api';
import { GlassView } from '@/components/ui/GlassView';
import { BookingFlowSheet } from './BookingFlowSheet';
import Theme from '@/constants/Theme';

const normaliseStatus = (status?: BookingStatus): BookingStatus | undefined => {
  if (status === 'paid_dd') return 'fully_paid';
  return status;
};

const getStatusLabel = (status?: BookingStatus): string => {
  const s = normaliseStatus(status);
  switch (s) {
    case 'fully_paid': return 'Fully Paid';
    case 'paid_awaiting_dd': return 'Paid (awaiting DD)';
    case 'deposit_and_dd': return 'Deposit and DD';
    case 'deposit_only': return 'Deposit only';
    case 'unpaid_dd': return 'Unpaid (DD Scheduled)';
    case 'unpaid': return 'Unpaid';
    case 'not_joining': return 'Not Joining';
    default: return '—';
  }
};

const getStatusColor = (status?: BookingStatus, palette?: ThemeColors): string => {
  const s = normaliseStatus(status);
  switch (s) {
    case 'fully_paid': return Theme.colors.success;
    case 'paid_awaiting_dd': return Theme.colors.info;
    case 'deposit_and_dd':
    case 'deposit_only':
    case 'unpaid_dd':
    case 'unpaid': return Theme.colors.warning;
    case 'not_joining': return Theme.colors.error;
    default: return palette?.textTertiary || '#999';
  }
};

const getAttendanceLabel = (booking: Booking): string => {
  if (booking.attendance_status === 'completed' || booking.checked_in_at) return 'Checked In';
  if (booking.attendance_status === 'no-show' || booking.no_show) return 'No Show';
  return '—';
};

const getAttendanceColor = (booking: Booking): string => {
  if (booking.attendance_status === 'completed' || booking.checked_in_at) return Theme.colors.success;
  if (booking.attendance_status === 'no-show' || booking.no_show) return Theme.colors.error;
  return '#999';
};

interface ClubTrialsListProps {
  club: Club;
  bookings: Booking[];
  coaches: User[];
  onSubmitReport: (clubId: number) => void;
}

function BookingCard({ booking, palette, onPress }: { booking: Booking; palette: ThemeColors; onPress: () => void }) {
  const styles = useMemo(() => createCardStyles(palette), [palette]);
  const classInfo = [
    booking.class_time?.name,
    booking.start_time ? new Date(booking.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '',
  ].filter(Boolean).join(' · ');

  const attendanceLabel = getAttendanceLabel(booking);
  const attendanceColor = getAttendanceColor(booking);
  const statusLabel = getStatusLabel(booking.status);
  const statusColor = getStatusColor(booking.status, palette);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.cardLeft}>
        <Text style={styles.name}>{booking.names || ''}</Text>
        <Text style={styles.classInfo}>{classInfo}</Text>
      </View>
      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: `${attendanceColor}15` }]}>
          <Text style={[styles.badgeText, { color: attendanceColor }]}>{attendanceLabel}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${statusColor}15` }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function ClubTrialsList({ club, bookings, coaches, onSubmitReport }: ClubTrialsListProps) {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { complete, total } = useBookingStore(s => s.getClubCompletionStatus(club.id));
  const isReady = useBookingStore(s => s.isClubReportReady(club.id));
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const renderBooking = ({ item }: { item: Booking }) => (
    <BookingCard
      booking={item}
      palette={palette}
      onPress={() => setSelectedBooking(item)}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={item => String(item.id)}
        renderItem={renderBooking}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footer}>
        <Text style={[styles.progressText, isReady ? styles.progressReady : null]}>
          {isReady ? `✓ All ${total} complete` : `${complete} of ${total} complete`}
        </Text>
        <TouchableOpacity
          style={[styles.submitButton, !isReady ? styles.submitButtonDisabled : null]}
          activeOpacity={0.7}
          disabled={!isReady}
          onPress={() => onSubmitReport(club.id)}
        >
          <Text style={[styles.submitButtonText, !isReady ? styles.submitButtonTextDisabled : null]}>
            Submit Report
          </Text>
        </TouchableOpacity>
      </View>

      <BookingFlowSheet
        booking={selectedBooking}
        visible={selectedBooking !== null}
        onClose={() => setSelectedBooking(null)}
        coaches={coaches}
      />
    </View>
  );
}

const createCardStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: palette.background,
      borderWidth: 1,
      borderColor: palette.borderLight,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
    },
    cardLeft: {
      flex: 1,
      marginRight: 8,
    },
    name: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.textPrimary,
    },
    classInfo: {
      fontSize: 11,
      color: palette.textTertiary,
      marginTop: 2,
    },
    badges: {
      flexDirection: 'row',
      gap: 6,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '600',
    },
  });

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    listContent: {
      padding: 12,
    },
    footer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      paddingTop: 8,
    },
    progressText: {
      fontSize: 11,
      color: palette.textTertiary,
      textAlign: 'center',
      marginBottom: 8,
    },
    progressReady: {
      color: Theme.colors.success,
    },
    submitButton: {
      backgroundColor: Theme.colors.primary,
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      backgroundColor: palette.borderDefault,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    submitButtonTextDisabled: {
      color: palette.textTertiary,
    },
  });
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add components/features/trials/ClubTrialsList.tsx
git commit -m "feat: add ClubTrialsList with booking cards and Submit Report gate"
```

---

### Task 8: ClubPager Component

**Files:**
- Create: `components/features/trials/ClubPager.tsx`

- [ ] **Step 1: Create ClubPager component**

Create `components/features/trials/ClubPager.tsx`:

```typescript
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, View, ViewToken } from 'react-native';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { useBookingStore } from '@/store/bookingStore';
import { coachesService } from '@/services/api/coaches.service';
import { User, Club, Booking } from '@/types/api';
import { ClubTrialsList } from './ClubTrialsList';
import Theme from '@/constants/Theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ClubPage {
  club: Club;
  bookings: Booking[];
}

interface ClubPagerProps {
  onSubmitReport: (clubId: number) => void;
}

export function ClubPager({ onSubmitReport }: ClubPagerProps) {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const getBookingsByClub = useBookingStore(s => s.getBookingsByClub);
  const [coaches, setCoaches] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    coachesService.getAllCoaches().then(setCoaches).catch(() => {});
  }, []);

  const clubPages: ClubPage[] = useMemo(() => {
    const clubMap = getBookingsByClub();
    return Array.from(clubMap.values());
  }, [getBookingsByClub]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderPage = useCallback(({ item }: { item: ClubPage }) => (
    <View style={styles.page}>
      <ClubTrialsList
        club={item.club}
        bookings={item.bookings}
        coaches={coaches}
        onSubmitReport={onSubmitReport}
      />
    </View>
  ), [coaches, onSubmitReport, styles.page]);

  if (clubPages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No trial bookings today</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Club name header */}
      <View style={styles.header}>
        <Text style={styles.clubName}>{clubPages[currentIndex]?.club.name || ''}</Text>
        {clubPages.length > 1 ? (
          <View style={styles.dots}>
            {clubPages.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, index === currentIndex ? styles.dotActive : null]}
              />
            ))}
          </View>
        ) : null}
      </View>

      {/* Horizontal pager */}
      <FlatList
        data={clubPages}
        keyExtractor={item => String(item.club.id)}
        renderItem={renderPage}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.pager}
      />
    </View>
  );
}

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderLight,
    },
    clubName: {
      fontSize: 17,
      fontWeight: '700',
      color: palette.textPrimary,
    },
    dots: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 8,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: palette.borderDefault,
    },
    dotActive: {
      backgroundColor: Theme.colors.primary,
    },
    pager: {
      flex: 1,
    },
    page: {
      width: SCREEN_WIDTH,
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: palette.textTertiary,
    },
  });
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add components/features/trials/ClubPager.tsx
git commit -m "feat: add ClubPager with horizontal swipe between clubs"
```

---

### Task 9: Replace Trials Tab Screen

**Files:**
- Modify: `app/(tabs)/trials.tsx` (full replacement)

- [ ] **Step 1: Replace the trials screen**

Replace the entire contents of `app/(tabs)/trials.tsx` with:

```typescript
import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { useBookingStore } from '@/store/bookingStore';
import { ClubPager } from '@/components/features/trials/ClubPager';
import { router } from 'expo-router';

export default function TrialsScreen() {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const fetchBookings = useBookingStore(s => s.fetchBookings);

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleSubmitReport = useCallback((clubId: number) => {
    // Navigate to the EOD wizard with the club pre-selected
    router.push({ pathname: '/eod-wizard', params: { clubId: String(clubId) } });
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[palette.backgroundGradientStart, palette.backgroundGradientEnd]}
        style={StyleSheet.absoluteFillObject}
      />
      <ClubPager onSubmitReport={handleSubmitReport} />
    </View>
  );
}

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
  });
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/trials.tsx
git commit -m "feat: replace trials screen with club pager layout"
```

---

### Task 10: Fix Header Padding & Integration Testing

**Files:**
- Modify: `app/(tabs)/_layout.tsx` (if header padding issue is there)
- All new files (manual testing)

- [ ] **Step 1: Check and fix header padding**

Read `app/(tabs)/_layout.tsx` and the Trials tab `Screen.options` configuration. Verify the header padding matches other tabs. If the Trials screen has different padding or insets, align it with the rest. The specific fix depends on what the current padding looks like — check `headerStyle`, `contentStyle`, or `safeAreaInsets` settings.

- [ ] **Step 2: Verify full TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors from any of the new or modified files.

- [ ] **Step 3: Manual testing checklist**

Start the dev server (`npm start`) and verify:

1. **Dashboard:** TrialsBanner appears on both Coach and Admin dashboards
2. **Banner states:** Shows count when there are unmarked bookings, muted when all clear
3. **Banner tap:** Navigates to Trials tab
4. **Trials tab:** Shows horizontal club pager with page indicator dots
5. **Club swiping:** Can swipe between clubs
6. **Booking cards:** Show name, class info, attendance badge, status badge
7. **Tapping a booking:** Opens bottom sheet at half height with Enroller step
8. **Enroller:** Dropdown populated with coaches, auto-filled to current user
9. **Status step:** Shows all 7 statuses in correct order
10. **Paid status flow:** Selecting Fully Paid or Paid (awaiting DD) → Licence Details → Kit → sizes
11. **Non-paid status flow:** Selecting Unpaid, Deposit, etc. → closes sheet, updates status
12. **Not Joining from Paid:** Shows confirmation dialog about kit order deletion
13. **Submit Report:** Disabled until all bookings marked, shows progress count
14. **Submit Report tap:** Navigates to EOD wizard with club pre-selected

- [ ] **Step 4: Commit any fixes**

```bash
git add -u
git commit -m "fix: header padding and integration fixes"
```

---

### API Changes Summary (for backend team)

This section documents all API changes required. Share with the backend team before or during frontend implementation.

| Method | Endpoint | Type | Description |
|--------|----------|------|-------------|
| `PUT` | `/bookings/{id}/conversion-status` | **Update** | Accept new status values: `fully_paid`, `deposit_and_dd`, `deposit_only`, `unpaid`. Accept new fields: `enroller_id` (integer, coach user ID) and `licence_details` (object: `{ name, date_of_birth, address }`). |
| `DELETE` | `/bookings/{id}/kit-orders` | **New** | Delete all kit orders for a booking. Returns 204 No Content. |
| `GET` | `/bookings` | **Update** | Include `enroller_id` and `licence_details` in response when set. |
| `GET` | `/bookings/totals` | **Update** | Add `outstanding_count` field — count of today's bookings missing either attendance or booking status, grouped by club: `{ [club_id]: number }`. |

**Migration:** Rename `paid_dd` status to `fully_paid` across all records. Frontend handles both during transition.
