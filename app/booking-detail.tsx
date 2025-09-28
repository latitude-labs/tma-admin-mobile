import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { ScreenHeader, Badge, Card } from '@/components/ui';
import { Theme } from '@/constants/Theme';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { useBookingStore } from '@/store/bookingStore';
import { Booking } from '@/types/api';

const AnimatedCard = Animated.createAnimatedComponent(Card);

export default function BookingDetailScreen() {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { allBookings } = useBookingStore();
  const booking = allBookings.find(b => b.id === parseInt(id)) as Booking | undefined;

  if (!booking) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Booking Details" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={palette.statusError} />
          <Text style={styles.errorText}>Booking not found</Text>
          <Pressable
            style={styles.backButton}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              router.back();
            }}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const getBookingStatus = () => {
    if (booking.attendance_status) {
      return booking.attendance_status;
    }
    if (booking.cancelled_at) return 'cancelled';
    if (booking.no_show) return 'no-show';
    if (booking.checked_in_at) return 'completed';
    if (new Date(booking.start_time) < new Date()) return 'completed';
    return 'scheduled';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      time: date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const getStatusConfig = () => {
    const status = getBookingStatus();
    switch (status) {
      case 'scheduled':
        return { color: palette.statusInfo, icon: 'calendar', label: 'Scheduled' };
      case 'completed':
        return { color: palette.statusSuccess, icon: 'checkmark-circle', label: 'Completed' };
      case 'no-show':
        return { color: palette.statusError, icon: 'close-circle', label: 'No Show' };
      case 'cancelled':
        return { color: palette.statusWarning, icon: 'alert-circle', label: 'Cancelled' };
      default:
        return { color: palette.textSecondary, icon: 'help-circle', label: 'Unknown' };
    }
  };

  const getConversionStatusVariant = () => {
    if (!booking.status || booking.status === 'pending') return 'secondary';
    switch (booking.status) {
      case 'paid_dd': return 'success';
      case 'paid_awaiting_dd': return 'info';
      case 'unpaid_dd':
      case 'unpaid_coach_call': return 'warning';
      case 'not_joining': return 'error';
      default: return 'secondary';
    }
  };

  const getConversionStatusLabel = () => {
    switch (booking.status) {
      case 'paid_dd': return 'Paid (DD)';
      case 'paid_awaiting_dd': return 'Paid (Awaiting DD)';
      case 'unpaid_dd': return 'Unpaid DD';
      case 'unpaid_coach_call': return 'Follow Up';
      case 'not_joining': return 'Not Joining';
      default: return 'Pending';
    }
  };

  const statusConfig = getStatusConfig();
  const dateTime = formatDateTime(booking.start_time);

  const handleCall = () => {
    if (booking.phone) {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      Linking.openURL(`tel:${booking.phone}`);
    }
  };

  const handleEmail = () => {
    if (booking.email) {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      Linking.openURL(`mailto:${booking.email}`);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Booking Details" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400).springify()}>
          <AnimatedCard variant="elevated" style={styles.headerCard}>
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {booking.names?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.nameSection}>
                <Text style={styles.name}>{booking.names}</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
                  <Text style={[styles.statusText, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.badgeContainer}>
              {booking.status && (
                <Badge
                  variant={getConversionStatusVariant()}
                  size="md"
                  style={styles.badge}
                >
                  {getConversionStatusLabel()}
                </Badge>
              )}
              {booking.class_time?.name && (
                <Badge
                  variant={booking.class_time.name.toLowerCase().includes('kid') ? 'warning' : 'info'}
                  size="md"
                  style={styles.badge}
                >
                  {booking.class_time.name}
                </Badge>
              )}
            </View>
          </AnimatedCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
          <AnimatedCard variant="filled" style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Booking Information</Text>

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="calendar-outline" size={20} color={palette.tint} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{dateTime.date}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="time-outline" size={20} color={palette.statusInfo} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Time</Text>
                <Text style={styles.infoValue}>{dateTime.time}</Text>
              </View>
            </View>

            {booking.club && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="business-outline" size={20} color={palette.statusWarning} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <Text style={styles.infoValue}>{booking.club.name}</Text>
                  {booking.club.address && (
                    <Text style={styles.infoSubvalue}>{booking.club.address}</Text>
                  )}
                </View>
              </View>
            )}

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="globe-outline" size={20} color={palette.statusSuccess} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Channel</Text>
                <Text style={styles.infoValue}>
                  {booking.channel_display_name || booking.channel}
                </Text>
              </View>
            </View>

            {booking.source && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="link-outline" size={20} color={palette.textSecondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Source</Text>
                  <Text style={styles.infoValue}>{booking.source}</Text>
                </View>
              </View>
            )}
          </AnimatedCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
          <AnimatedCard variant="filled" style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Contact Information</Text>

            {booking.email ? (
              <Pressable onPress={handleEmail} style={({ pressed }) => [
                styles.contactRow,
                pressed && styles.contactRowPressed
              ]}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="mail-outline" size={20} color={palette.statusInfo} />
                </View>
                <View style={styles.contactContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.contactValue}>{booking.email}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={palette.textTertiary} />
              </Pressable>
            ) : (
              <View style={styles.emptyContact}>
                <Text style={styles.emptyText}>No email provided</Text>
              </View>
            )}

            {booking.phone ? (
              <Pressable onPress={handleCall} style={({ pressed }) => [
                styles.contactRow,
                pressed && styles.contactRowPressed
              ]}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="call-outline" size={20} color={palette.statusSuccess} />
                </View>
                <View style={styles.contactContent}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.contactValue}>{booking.phone}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={palette.textTertiary} />
              </Pressable>
            ) : (
              <View style={styles.emptyContact}>
                <Text style={styles.emptyText}>No phone provided</Text>
              </View>
            )}
          </AnimatedCard>
        </Animated.View>

        {(booking.checked_in_at || booking.cancelled_at || booking.no_show_at) && (
          <Animated.View entering={FadeInDown.delay(300).duration(400).springify()}>
            <AnimatedCard variant="filled" style={styles.infoCard}>
              <Text style={styles.sectionTitle}>Activity Log</Text>

              {booking.checked_in_at && (
                <View style={styles.activityRow}>
                  <View style={[styles.activityDot, { backgroundColor: palette.statusSuccess }]} />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>Checked In</Text>
                    <Text style={styles.activityTime}>
                      {formatDateTime(booking.checked_in_at).date} at {formatDateTime(booking.checked_in_at).time}
                    </Text>
                  </View>
                </View>
              )}

              {booking.cancelled_at && (
                <View style={styles.activityRow}>
                  <View style={[styles.activityDot, { backgroundColor: palette.statusWarning }]} />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>Cancelled</Text>
                    <Text style={styles.activityTime}>
                      {formatDateTime(booking.cancelled_at).date} at {formatDateTime(booking.cancelled_at).time}
                    </Text>
                  </View>
                </View>
              )}

              {booking.no_show_at && (
                <View style={styles.activityRow}>
                  <View style={[styles.activityDot, { backgroundColor: palette.statusError }]} />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>Marked as No Show</Text>
                    <Text style={styles.activityTime}>
                      {formatDateTime(booking.no_show_at).date} at {formatDateTime(booking.no_show_at).time}
                    </Text>
                  </View>
                </View>
              )}
            </AnimatedCard>
          </Animated.View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Theme.spacing.lg,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  errorText: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
  },
  backButton: {
    backgroundColor: palette.tint,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.full,
    ...Theme.shadows.sm,
  },
  backButtonText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
  },
  headerCard: {
    marginBottom: Theme.spacing.md,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: `${palette.tint}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  avatarText: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.tint,
  },
  nameSection: {
    flex: 1,
  },
  name: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: Theme.borderRadius.full,
  },
  statusText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
  },
  infoCard: {
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.lg,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: palette.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    marginBottom: Theme.spacing.xs,
  },
  infoValue: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
  },
  infoSubvalue: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    marginTop: Theme.spacing.xs,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.sm,
    marginHorizontal: -Theme.spacing.sm,
    borderRadius: Theme.borderRadius.lg,
  },
  contactRowPressed: {
    backgroundColor: palette.backgroundSecondary,
  },
  contactContent: {
    flex: 1,
  },
  contactValue: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.tint,
    textDecorationLine: 'underline',
  },
  emptyContact: {
    paddingVertical: Theme.spacing.md,
    paddingLeft: 52,
    marginBottom: Theme.spacing.md,
  },
  emptyText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textTertiary,
    fontStyle: 'italic',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.lg,
  },
  activityDot: {
    width: 12,
    height: 12,
    borderRadius: Theme.borderRadius.full,
    marginTop: Theme.spacing.xs,
    marginRight: Theme.spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  activityTime: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
  },
  bottomSpacer: {
    height: Theme.spacing['2xl'],
  },
});