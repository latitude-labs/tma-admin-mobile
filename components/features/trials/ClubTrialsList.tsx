import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { format } from 'date-fns';

import { BookingFlowSheet } from './BookingFlowSheet';
import { Button } from '@/components/ui/Button';
import { useBookingStore } from '@/store/bookingStore';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { Booking, BookingStatus, Club } from '@/types/api';
import { Coach } from '@/types/coaches';
import { Theme } from '@/constants/Theme';

// ── Status helpers ─────────────────────────────────────────────────

/** Map legacy API status values to current display values */
const normaliseStatus = (
  status: BookingStatus | undefined,
): BookingStatus | undefined => {
  if (status === 'paid_dd') return 'fully_paid';
  return status;
};

const getStatusLabel = (status: BookingStatus): string => {
  const labels: Record<BookingStatus, string> = {
    pending: 'Pending',
    fully_paid: 'Fully Paid',
    paid_dd: 'Fully Paid',
    paid_awaiting_dd: 'Paid (awaiting DD)',
    deposit_and_dd: 'Deposit + DD',
    deposit_only: 'Deposit Only',
    unpaid_dd: 'Unpaid (DD)',
    unpaid: 'Unpaid',
    unpaid_coach_call: 'Unpaid (Coach)',
    not_joining: 'Not Joining',
  };
  return labels[status] || status;
};

const getStatusColor = (status: BookingStatus): string => {
  switch (status) {
    case 'fully_paid':
    case 'paid_dd':
      return Theme.colors.status.success;
    case 'paid_awaiting_dd':
    case 'deposit_and_dd':
    case 'deposit_only':
    case 'unpaid_dd':
    case 'unpaid':
    case 'unpaid_coach_call':
      return Theme.colors.status.warning;
    case 'not_joining':
      return Theme.colors.status.error;
    case 'pending':
    default:
      return Theme.colors.status.info;
  }
};

const getAttendanceLabel = (
  booking: Booking,
): string => {
  if (
    booking.attendance_status === 'completed' ||
    booking.checked_in_at
  ) {
    return 'Checked In';
  }
  if (
    booking.attendance_status === 'no-show' ||
    booking.no_show
  ) {
    return 'No Show';
  }
  return '\u2014'; // em dash
};

const getAttendanceColor = (
  booking: Booking,
  palette: ThemeColors,
): string => {
  if (
    booking.attendance_status === 'completed' ||
    booking.checked_in_at
  ) {
    return Theme.colors.status.success;
  }
  if (
    booking.attendance_status === 'no-show' ||
    booking.no_show
  ) {
    return Theme.colors.status.error;
  }
  return palette.textTertiary;
};

// ── BookingCard ────────────────────────────────────────────────────

interface BookingCardProps {
  booking: Booking;
  palette: ThemeColors;
  onPress: (booking: Booking) => void;
}

const BookingCard = React.memo(function BookingCard({
  booking,
  palette,
  onPress,
}: BookingCardProps) {
  const styles = useMemo(() => createStyles(palette), [palette]);
  const normStatus = normaliseStatus(booking.status);
  const attendanceLabel = getAttendanceLabel(booking);
  const attendanceColor = getAttendanceColor(booking, palette);
  const hasStatus = !!normStatus && normStatus !== 'pending';

  const classTime = booking.class_time;
  const timeLabel = classTime
    ? `${classTime.name || classTime.day || ''}`
    : '';
  const startTime = format(new Date(booking.start_time), 'h:mm a');

  const handlePress = useCallback(() => {
    onPress(booking);
  }, [booking, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        pressed ? styles.cardPressed : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Booking for ${booking.names || 'Unknown'}`}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.cardName} numberOfLines={1}>
          {booking.names || 'Unknown'}
        </Text>
        <Text style={styles.cardSubtext} numberOfLines={1}>
          {timeLabel ? `${timeLabel} \u00B7 ${startTime}` : startTime}
        </Text>
      </View>
      <View style={styles.cardRight}>
        <View
          style={[
            styles.badge,
            { backgroundColor: `${attendanceColor}26` },
          ]}
        >
          <Text style={[styles.badgeText, { color: attendanceColor }]}>
            {attendanceLabel}
          </Text>
        </View>
        {hasStatus ? (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: `${getStatusColor(normStatus!)}26`,
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: getStatusColor(normStatus!) },
              ]}
            >
              {getStatusLabel(normStatus!)}
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.badge,
              { backgroundColor: `${palette.textTertiary}26` },
            ]}
          >
            <Text
              style={[styles.badgeText, { color: palette.textTertiary }]}
            >
              {'\u2014'}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
});

// ── ClubTrialsList ─────────────────────────────────────────────────

interface ClubTrialsListProps {
  club: Club;
  bookings: Booking[];
  coaches: Coach[];
  onSubmitReport: (clubId: number) => void;
}

export function ClubTrialsList({
  club,
  bookings,
  coaches,
  onSubmitReport,
}: ClubTrialsListProps) {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const getClubCompletionStatus = useBookingStore(
    (s) => s.getClubCompletionStatus,
  );
  const isClubReportReady = useBookingStore(
    (s) => s.isClubReportReady,
  );

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(
    null,
  );
  const [sheetVisible, setSheetVisible] = useState(false);

  const { complete, total } = getClubCompletionStatus(club.id);
  const reportReady = isClubReportReady(club.id);
  const allComplete = total > 0 && complete === total;

  const handleBookingPress = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
    setSheetVisible(true);
  }, []);

  const handleSheetClose = useCallback(() => {
    setSheetVisible(false);
    setSelectedBooking(null);
  }, []);

  const handleSubmitReport = useCallback(() => {
    onSubmitReport(club.id);
  }, [club.id, onSubmitReport]);

  const renderItem = useCallback(
    ({ item }: { item: Booking }) => (
      <BookingCard
        booking={item}
        palette={palette}
        onPress={handleBookingPress}
      />
    ),
    [palette, handleBookingPress],
  );

  const keyExtractor = useCallback(
    (item: Booking) => String(item.id),
    [],
  );

  const ListFooter = useMemo(
    () => (
      <View style={styles.footer}>
        <Text
          style={[
            styles.progressText,
            allComplete ? { color: Theme.colors.status.success } : null,
          ]}
        >
          {allComplete
            ? `\u2713 All ${total} complete`
            : `${complete} of ${total} complete`}
        </Text>
        <Button
          variant="primary"
          fullWidth
          disabled={!reportReady}
          onPress={handleSubmitReport}
          style={!reportReady ? styles.buttonDisabled : undefined}
        >
          {'Submit Report'}
        </Button>
      </View>
    ),
    [
      styles,
      allComplete,
      total,
      complete,
      reportReady,
      handleSubmitReport,
    ],
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={ListFooter}
        showsVerticalScrollIndicator={false}
      />
      <BookingFlowSheet
        booking={selectedBooking}
        visible={sheetVisible}
        onClose={handleSheetClose}
        coaches={coaches}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: Theme.spacing.lg,
      paddingTop: Theme.spacing.sm,
      paddingBottom: Theme.spacing.xl,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: palette.card,
      borderRadius: Theme.borderRadius.md,
      paddingVertical: Theme.spacing.md,
      paddingHorizontal: Theme.spacing.lg,
      marginBottom: Theme.spacing.sm,
      borderWidth: 1,
      borderColor: palette.borderLight,
    },
    cardPressed: {
      opacity: 0.7,
    },
    cardLeft: {
      flex: 1,
      marginRight: Theme.spacing.sm,
    },
    cardName: {
      fontSize: Theme.typography.sizes.md,
      fontWeight: Theme.typography.weights.semibold,
      color: palette.textPrimary,
    },
    cardSubtext: {
      fontSize: Theme.typography.sizes.sm,
      color: palette.textSecondary,
      marginTop: 2,
    },
    cardRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.xs,
    },
    badge: {
      paddingHorizontal: Theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: Theme.borderRadius.sm,
    },
    badgeText: {
      fontSize: Theme.typography.sizes.xs,
      fontWeight: Theme.typography.weights.semibold,
    },
    footer: {
      paddingTop: Theme.spacing.lg,
      paddingBottom: Theme.spacing.lg,
      gap: Theme.spacing.md,
    },
    progressText: {
      fontSize: Theme.typography.sizes.sm,
      fontWeight: Theme.typography.weights.medium,
      color: palette.textSecondary,
      textAlign: 'center',
    },
    buttonDisabled: {
      opacity: 0.5,
    },
  });
