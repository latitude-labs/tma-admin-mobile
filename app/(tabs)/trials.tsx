import { BookingCreationModal } from '@/components/features/BookingCreationModal';
import { Card, Dropdown } from '@/components/ui';
import { Theme } from '@/constants/Theme';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { bookingsService } from '@/services/api/bookings.service';
import { useBookingStore } from '@/store/bookingStore';
import { Booking } from '@/types/api';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';

const AnimatedCard = Animated.createAnimatedComponent(Card);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const { width: screenWidth } = Dimensions.get('window');

type BookingStatus = 'pending' | 'paid_dd' | 'paid_awaiting_dd' | 'unpaid_dd' | 'unpaid_coach_call' | 'not_joining';

interface KitItem {
  type: 'tshirt' | 'trousers' | 'gloves' | 'shinpads' | 'kitbag';
  size: string;
}

export default function TrialsScreen() {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const router = useRouter();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'outstanding' | 'all'>('outstanding');
  const searchFocused = useSharedValue(0);
  const pulseOpacity = useSharedValue(0.3);
  const tabIndicatorPosition = useSharedValue(0);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | null>(null);
  const [showKitModal, setShowKitModal] = useState(false);
  const [kitItems, setKitItems] = useState<KitItem[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<'basic' | 'silver' | 'gold' | null>(null);
  const [kitSelectionStep, setKitSelectionStep] = useState<1 | 2>(1);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderDate, setReminderDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [alternativePhoneNumber, setAlternativePhoneNumber] = useState('');
  const [showCreateBookingModal, setShowCreateBookingModal] = useState(false);

  const {
    bookings,  // Already filtered and paginated
    allBookings: allBookingsFromStore,  // Complete unfiltered dataset for Outstanding calculation
    isLoading,
    error,
    isOffline,
    lastSync,
    pagination,
    setViewMode: storeSetViewMode,
    fetchBookings,
    fetchBookingsPage,
    refreshBookings,
    setFilters,
    updateBookingStatus,
    setSearchQuery: updateSearchQuery,
    applyFiltersAndPagination,
  } = useBookingStore();

  useEffect(() => {
    // Defer initial data load to prevent blocking UI
    if (isInitialLoad) {
      // Use setTimeout to defer heavy operation
      const timer = setTimeout(() => {
        const bookingState = useBookingStore.getState();
        if (!bookingState.isInitialized || bookingState.allBookings.length === 0) {
          fetchBookings().finally(() => {
            setIsInitialLoad(false);
          });
        } else {
          // Just reapply filters for initial render
          applyFiltersAndPagination();
          setIsInitialLoad(false);
        }
      }, 10); // Small delay to allow UI to render

      return () => clearTimeout(timer);
    }
  }, [isInitialLoad]);

  useEffect(() => {
    if (!isInitialLoad) {
      // After initial load, handle view mode changes
      applyFiltersAndPagination();
    }
  }, [viewMode, isInitialLoad]);

  useEffect(() => {
    setFilters({ searchQuery });
    updateSearchQuery(searchQuery);
  }, [searchQuery]);

  // Animation hooks for loading state - MUST be called unconditionally
  useEffect(() => {
    if (isLoading && bookings.length === 0) {
      pulseOpacity.value = withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) })
      );
    }
  }, [isLoading, bookings.length]);

  // CRITICAL: All hooks MUST be called before early returns
  // The bookings array is already filtered and sorted by the store based on the selected view mode

  const loadingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const searchAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: withSpring(
      searchFocused.value ? palette.tint : palette.borderDefault,
      { damping: 15, stiffness: 150 }
    ),
    borderWidth: withSpring(searchFocused.value ? 2 : 1),
  }));

  const tabIndicatorAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          tabIndicatorPosition.value,
          [0, 1],
          [4, screenWidth / 2 - 12]
        ),
      },
    ],
  }));

  // CRITICAL: Early returns must happen AFTER all hooks (useState, useEffect, useMemo, useAnimatedStyle)
  // IMPORTANT: Only use early return for initial load, NOT during refresh to avoid "Rendered fewer hooks" error

  // Loading state - Show during:
  // 1. Initial load before data fetch starts (isInitialLoad = true)
  // 2. When actively loading and no cached data exists
  const hasNoData = bookings.length === 0 && allBookingsFromStore.length === 0;
  const shouldShowLoading = (isInitialLoad && hasNoData) || (isLoading && hasNoData);

  if (shouldShowLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Animated.View style={loadingAnimatedStyle}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.tint} />
            <Text style={styles.loadingText}>Loading trial bookings...</Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  // Error state - ONLY when no data at all and not loading
  if (error && hasNoData && !isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Animated.View
          entering={FadeIn.duration(400)}
          style={styles.errorContainer}
        >
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={56} color={palette.statusError} />
          </View>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              fetchBookings();
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  const switchViewMode = (mode: 'outstanding' | 'all') => {
    setViewMode(mode);
    storeSetViewMode(mode);
    tabIndicatorPosition.value = withSpring(mode === 'outstanding' ? 0 : 1);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Don't refetch data, just reapply filters
    // The store will handle filtering based on the new view mode
  };

  const statusConfig: Record<string, { color: string; icon: string }> = {

    scheduled: { color: palette.statusInfo, icon: 'calendar' },
    completed: { color: palette.statusSuccess, icon: 'checkmark-circle' },
    'no-show': { color: palette.statusError, icon: 'close-circle' },
    cancelled: { color: palette.statusWarning, icon: 'alert-circle' },
  };

  const getBookingStatus = (booking: any) => {
    // First check if we have an attendance_status field (new way)
    if (booking.attendance_status) {
      return booking.attendance_status;
    }

    // Fallback to old way for backwards compatibility
    if (booking.cancelled_at) return 'cancelled';
    if (booking.no_show) return 'no-show';
    if (booking.checked_in_at) return 'completed';
    if (new Date(booking.start_time) < new Date()) return 'completed';
    return 'scheduled';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
  };

  const renderBookingCard = (booking: Booking, index: number) => {
    const status = getBookingStatus(booking);
    const statusInfo = statusConfig[status];

    // Get club - either directly from booking or from class_time
    const club = booking.club || booking.class_time?.club;

    // Debug logging (can remove after confirming it works)
    if (index === 0) {
      console.log('[TrialsScreen] First booking data:', {
        id: booking.id,
        hasClub: !!booking.club,
        hasClassTime: !!booking.class_time,
        hasClassTimeClub: !!booking.class_time?.club,
        clubName: club?.name,
      });
    }

    return (
      <AnimatedPressable
        key={booking.id}
        onPress={() => {
          if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          router.push({
            pathname: '/booking-detail',
            params: { id: booking.id.toString() }
          });
        }}
      >
        <AnimatedCard
          variant="elevated"
          style={styles.trialCard}
          entering={FadeInDown.delay(index * 80).duration(400).springify()}
        >
          <View style={styles.trialHeader}>
            <View style={styles.trialHeaderLeft}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {booking.names?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || ''}
                </Text>
              </View>
              <View style={styles.nameSection}>
                <Text style={styles.trialName}>{booking.names || ''}</Text>
                <View style={styles.statusContainer}>
                  <View style={[styles.statusDot, { backgroundColor: statusInfo?.color }]} />
                  <Text style={[styles.statusText, { color: statusInfo?.color }]}>
                    {status === 'completed' ? 'Attended' : status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.statusBadgeContainer}>
              {booking.status ? (
                <View style={[
                  styles.statusBadge,
                  {
                    backgroundColor: `${getStatusColor(booking.status, palette)}15`,
                    borderColor: getStatusColor(booking.status, palette),
                  }
                ]}>
                  <Ionicons
                    name={getStatusIcon(booking.status)}
                    size={16}
                    color={getStatusColor(booking.status, palette)}
                  />
                  <Text style={[styles.statusBadgeText, { color: getStatusColor(booking.status, palette) }]}>
                    {getStatusLabel(booking.status)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.trialDetails}>
            <View style={styles.detailGrid}>
              {club && (
                <View style={styles.detailItem}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="business" size={14} color={palette.statusInfo} />
                  </View>
                  <Text style={styles.detailText}>{club.name || ''}</Text>
                </View>
              )}

              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <Ionicons name="calendar" size={14} color={palette.tint} />
                </View>
                <Text style={styles.detailText}>{formatDate(booking.start_time)}</Text>
              </View>

              {booking.class_time?.name ? (
                <View style={styles.detailItem}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons
                      name={'people'}
                      size={14}
                      color={palette.statusWarning}
                    />
                  </View>
                  <Text style={styles.detailText}>{booking.class_time.name}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Show action buttons based on booking state */}
          {(() => {
            const isPastBooking = new Date(booking.start_time) < new Date();

            // For pending status bookings that are completed (checked in), show only Kit Status button
            if (booking.status === 'pending' && (booking.checked_in_at || status === 'completed')) {
              return (
                <Animated.View
                  entering={FadeIn.delay(200).duration(300)}
                  style={styles.actionButtons}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionButton,
                      { flex: 1 },
                      pressed && styles.actionButtonPressed
                    ]}
                    onPress={() => handleBookingPress(booking)}
                    accessibilityLabel="Update kit status"
                    accessibilityRole="button"
                    accessibilityHint="Opens payment status selection to record kit items and conversion status"
                  >
                    <Ionicons name="shirt" size={16} color={palette.tint} />
                    <Text style={[styles.actionButtonText, { color: palette.tint }]}>
                      Update Kit Status
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            }

            // For pending status bookings that are in the past and scheduled (not checked in), show No Show and Check In buttons
            if (booking.status === 'pending' && status === 'scheduled' && isPastBooking) {
              return (
                <Animated.View
                  entering={FadeIn.delay(200).duration(300)}
                  style={styles.actionButtons}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionButton,
                      styles.actionButtonOutline,
                      pressed && styles.actionButtonPressed
                    ]}
                    onPress={() => handleAttendanceStatusUpdate(booking.id, 'no-show')}
                    accessibilityLabel="Mark as no show"
                    accessibilityRole="button"
                    accessibilityHint="Records that participant did not attend their trial session"
                  >
                    <Ionicons name="close" size={16} color={palette.statusError} />
                    <Text style={[styles.actionButtonText, { color: palette.statusError }]}>
                      No Show
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionButton,
                      styles.actionButtonPrimary,
                      pressed && styles.actionButtonPressed
                    ]}
                    onPress={() => handleBookingPress(booking)}
                    accessibilityLabel="Check in participant"
                    accessibilityRole="button"
                    accessibilityHint="Marks participant as attended and enables payment status update"
                  >
                    <Ionicons name="checkmark" size={16} color={palette.statusSuccess} />
                    <Text style={[styles.actionButtonText, { color: palette.statusSuccess }]}>
                      Check In
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            }

            // No action buttons for other states (when status is not pending or for future bookings)
            return null;
          })()}
        </AnimatedCard>
      </AnimatedPressable>
    );
  };

  const tshirtSizes = ['Small Youth', 'Medium Youth', 'Large Youth', 'XL Youth', 'Small', 'Medium', 'Large', 'XL', '2XL', '3XL'];
  const trouserSizes = ['Small Youth', 'Medium Youth', 'Large Youth', 'XL Youth', 'Small', 'Medium', 'Large', 'XL', '2XL', '3XL'];
  const gloveSizes = ['8oz', '10oz', '12oz', '14oz', '16oz'];
  const shinpadSizes = ['Small', 'Medium', 'Large', 'XL'];

  const handleAttendanceStatusUpdate = (bookingId: number, newStatus: string) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    updateBookingStatus(bookingId, newStatus as 'completed' | 'no-show');
  };

  const handleBookingPress = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowStatusModal(true);
  };

  /**
   * Handles payment status selection and routes to appropriate sub-flow.
   *
   * Flow routing:
   * - Paid statuses (paid_dd, paid_awaiting_dd) → Kit selection modal (2-step flow)
   * - Unpaid follow-up (unpaid_coach_call) → Reminder scheduling modal
   * - Other statuses (unpaid_dd, not_joining) → Direct submission (no additional data needed)
   *
   * @param status - The selected payment status
   */
  const handleStatusSelect = (status: BookingStatus) => {
    setSelectedStatus(status);
    setShowStatusModal(false);

    if (status === 'paid_dd' || status === 'paid_awaiting_dd') {
      // Show kit selection modal
      setKitItems([]);
      setSelectedPackage(null);
      setKitSelectionStep(1);
      setShowKitModal(true);
    } else if (status === 'unpaid_coach_call') {
      // Show reminder modal
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setReminderDate(tomorrow);
      setShowReminderModal(true);
    } else {
      // Submit directly
      if (selectedBooking) {
        submitStatusUpdate(selectedBooking.id, status);
      }
    }
  };

  /**
   * Submits booking conversion status update to the API with optional kit items or reminder.
   *
   * This function constructs the API request based on provided parameters:
   * - Always includes the payment status
   * - Optionally includes kit items and package name (for paid statuses)
   * - Optionally includes reminder time (for unpaid_coach_call status)
   * - Optionally includes alternative phone number (for unpaid_coach_call status)
   *
   * On success: Shows success alert, resets modal state, and refreshes booking list
   * On error: Shows error alert with failure message
   *
   * @param bookingId - The ID of the booking to update
   * @param status - The new payment status
   * @param kitItemsData - Optional array of kit items (for paid statuses)
   * @param packageName - Optional package name: 'basic', 'silver', or 'gold'
   * @param reminderTime - Optional reminder timestamp in ISO 8601 format
   * @param alternativePhone - Optional alternative phone number to use instead of booking phone
   */
  const submitStatusUpdate = async (
    bookingId: number,
    status: BookingStatus,
    kitItemsData?: KitItem[],
    packageName?: 'basic' | 'silver' | 'gold',
    reminderTime?: string,
    alternativePhone?: string
  ) => {
    const updateParams: any = { status };

    if (kitItemsData && kitItemsData.length > 0) {
      updateParams.kit_items = kitItemsData;
    }

    if (packageName) {
      updateParams.package_name = packageName;
    }

    if (reminderTime) {
      updateParams.reminder_time = reminderTime;
    }

    if (alternativePhone) {
      updateParams.alternative_phone_number = alternativePhone;
    }

    try {
      await bookingsService.updateBookingConversionStatus(bookingId, updateParams);

      Alert.alert('Success', `Booking ${status === 'not_joining' ? 'marked as not joining' : 'updated successfully'}`);

      // Reset state
      setSelectedBooking(null);
      setSelectedStatus(null);
      setKitItems([]);
      setSelectedPackage(null);
      setKitSelectionStep(1);
      setAlternativePhoneNumber('');

      // Reload bookings
      refreshBookings();
    } catch (error) {
      console.error('Failed to update booking:', error);
      Alert.alert('Error', 'Failed to update booking status');
    }
  };

  const handleKitSubmit = () => {
    if (!selectedPackage) {
      Alert.alert('Error', 'Please select a package (Basic, Silver, or Gold)');
      return;
    }

    const validKitItems = kitItems.filter(item => item.type && item.size);

    if (validKitItems.length === 0) {
      Alert.alert('Error', 'Please add at least one kit item with both type and size');
      return;
    }

    setShowKitModal(false);
    if (selectedBooking && selectedStatus) {
      submitStatusUpdate(selectedBooking.id, selectedStatus, validKitItems, selectedPackage);
    }
  };

  const handleReminderSubmit = () => {
    setShowReminderModal(false);
    if (selectedBooking && selectedStatus) {
      // The reminder will be created automatically by the API when updating status with reminder_time
      submitStatusUpdate(selectedBooking.id, selectedStatus, undefined, undefined, reminderDate.toISOString(), alternativePhoneNumber || undefined);
    }
  };

  const updateKitItem = (index: number, field: 'type' | 'size', value: string) => {
    const updated = [...kitItems];
    updated[index] = { ...updated[index], [field]: value };
    setKitItems(updated);
  };

  const getSizeOptions = (type: string) => {
    switch (type) {
      case 'tshirt': return tshirtSizes;
      case 'trousers': return trouserSizes;
      case 'gloves': return gloveSizes;
      case 'shinpads': return shinpadSizes;
      case 'kitbag': return ['One Size'];
      default: return [];
    }
  };

  const handlePackageSelection = (packageType: 'basic' | 'silver' | 'gold') => {
    // Auto-populate kit items based on selected package
    const newKitItems: KitItem[] = [];

    // All packages get T-shirt, Trousers and Boxing gloves
    newKitItems.push({ type: 'tshirt', size: '' });
    newKitItems.push({ type: 'trousers', size: '' });
    newKitItems.push({ type: 'gloves', size: '' });

    // Silver and Gold get Shinpads
    if (packageType === 'silver' || packageType === 'gold') {
      newKitItems.push({ type: 'shinpads', size: '' });
    }

    // Gold gets Kit bag
    if (packageType === 'gold') {
      newKitItems.push({ type: 'kitbag', size: 'One Size' });
    }

    setKitItems(newKitItems);
    setSelectedPackage(packageType);

    // Move to size selection step
    setTimeout(() => {
      setKitSelectionStep(2);
    }, 200);

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const getStatusColor = (status: string, palette: ThemeColors) => {
    switch (status) {
      case 'paid_dd': return palette.statusSuccess;
      case 'paid_awaiting_dd': return palette.statusInfo;
      case 'unpaid_dd':
      case 'unpaid_coach_call': return palette.statusWarning;
      case 'not_joining': return palette.statusError;
      default: return palette.textSecondary;
    }
  };

  const getStatusIcon = (status: string): any => {
    switch (status) {
      case 'paid_dd': return 'checkmark-circle';
      case 'paid_awaiting_dd': return 'time';
      case 'unpaid_dd': return 'card-outline';
      case 'unpaid_coach_call': return 'call';
      case 'not_joining': return 'close-circle';
      default: return 'ellipse';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid_dd': return 'Paid';
      case 'paid_awaiting_dd': return 'Paid (DD Pending)';
      case 'unpaid_dd': return 'Unpaid (DD)';
      case 'unpaid_coach_call': return 'Follow Up';
      case 'not_joining': return 'Not Joining';
      default: return 'Pending';
    }
  };

  return (
    <>
    <View style={styles.container}>
      <LinearGradient
        colors={[
          palette.backgroundSecondary,
          palette.background,
          palette.backgroundSecondary,
        ]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refreshBookings}
          colors={[palette.tint]}
          tintColor={palette.tint}
        />
      }>
      <View style={styles.content}>
        <Animated.View
          entering={FadeInDown.duration(400).springify()}
          style={styles.header}
        >
          <LinearGradient
            colors={[palette.background, palette.background + 'F0']}
            style={styles.headerGradient}
          >
          <View style={styles.headerInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Trial Bookings</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{pagination.totalItems}</Text>
              </View>
            </View>
            {isOffline && (
              <Animated.View
                entering={FadeIn.duration(300)}
                style={styles.offlineBadge}
              >
                <Ionicons name="cloud-offline" size={14} color="#FFF" />
                <Text style={styles.offlineText}>Offline Mode</Text>
              </Animated.View>
            )}
          </View>
          <AnimatedPressable
            onPress={() => {
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              setShowCreateBookingModal(true);
            }}
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed
            ]}
          >
            <Ionicons name="add" size={24} color={palette.tint} />
          </AnimatedPressable>
          </LinearGradient>
        </Animated.View>

        {lastSync && (
          <Animated.Text
            entering={FadeIn.delay(200).duration(300)}
            style={styles.syncText}
          >
            Last synced {new Date(lastSync).toLocaleString('en-US', {
              day: 'numeric',
              month: 'short',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Animated.Text>
        )}

        <Animated.View
          entering={FadeInDown.delay(100).duration(400).springify()}
          style={[styles.searchContainer, searchAnimatedStyle]}
        >
          <Ionicons
            name="search"
            size={20}
            color={palette.textSecondary}
            style={styles.searchIcon}
          />
          <AnimatedTextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or phone..."
            placeholderTextColor={palette.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => {
              searchFocused.value = 1;
            }}
            onBlur={() => {
              searchFocused.value = 0;
            }}
          />
          {searchQuery.length > 0 && (
            <Animated.View entering={FadeIn.duration(200)}>
              <Pressable
                onPress={() => {
                  setSearchQuery('');
                  if (Platform.OS === 'ios') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color={palette.textSecondary} />
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(250).duration(400).springify()}
          style={styles.viewModeContainer}
        >
          <View style={styles.viewModeTabs}>
            <Pressable
              style={styles.viewModeTab}
              onPress={() => switchViewMode('outstanding')}
            >
              <Text
                style={[
                  styles.viewModeTabText,
                  viewMode === 'outstanding' && { color: palette.tint }
                ]}
              >
                Outstanding
              </Text>
            </Pressable>
            <Pressable
              style={styles.viewModeTab}
              onPress={() => switchViewMode('all')}
            >
              <Text
                style={[
                  styles.viewModeTabText,
                  viewMode === 'all' && { color: palette.tint }
                ]}
              >
                All
              </Text>
            </Pressable>
          </View>
          <Animated.View
            style={[
              styles.viewModeIndicator,
              tabIndicatorAnimatedStyle
            ]}
          />
        </Animated.View>

        {/* Bookings List */}
        {bookings.length > 0 ? (
          <>
            <View style={styles.bookingsList}>
              {bookings.map((booking, index) => renderBookingCard(booking, index))}
            </View>

            {!isOffline && pagination.totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <Pressable
                  disabled={pagination.currentPage === 1}
                  onPress={() => {
                    fetchBookingsPage(pagination.currentPage - 1);
                    if (Platform.OS === 'ios') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.paginationButton,
                    pagination.currentPage === 1 && styles.paginationButtonDisabled,
                    pressed && pagination.currentPage !== 1 && styles.paginationButtonPressed
                  ]}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={pagination.currentPage === 1 ? palette.textTertiary : palette.tint}
                  />
                </Pressable>

                <View style={styles.paginationInfo}>
                  <Text style={styles.paginationText}>
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </Text>
                  <Text style={styles.paginationSubtext}>
                    {Math.min((pagination.currentPage - 1) * pagination.perPage + 1, pagination.totalItems)}-
                    {Math.min(pagination.currentPage * pagination.perPage, pagination.totalItems)} of {pagination.totalItems}
                  </Text>
                </View>

                <Pressable
                  disabled={pagination.currentPage === pagination.totalPages}
                  onPress={() => {
                    fetchBookingsPage(pagination.currentPage + 1);
                    if (Platform.OS === 'ios') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.paginationButton,
                    pagination.currentPage === pagination.totalPages && styles.paginationButtonDisabled,
                    pressed && pagination.currentPage !== pagination.totalPages && styles.paginationButtonPressed
                  ]}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={pagination.currentPage === pagination.totalPages ? palette.textTertiary : palette.tint}
                  />
                </Pressable>
              </View>
            )}
          </>
        ) : (
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.emptyState}
          >
            <View style={styles.emptyIconContainer}>
              <Ionicons name="calendar-outline" size={64} color={palette.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No results found' : 'No bookings yet'}
            </Text>
            <Text style={styles.emptyMessage}>
              {searchQuery
                ? `Try adjusting your search for "${searchQuery}"`
                : 'Trial bookings will appear here once scheduled'}
            </Text>
            {searchQuery && (
              <Pressable
                style={styles.clearSearchButton}
                onPress={() => {
                  setSearchQuery('');
                  if (Platform.OS === 'ios') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
              >
                <Text style={styles.clearSearchButtonText}>Clear Search</Text>
              </Pressable>
            )}
          </Animated.View>
        )}
      </View>
    </ScrollView>
    </View>

      <Modal
        visible={showStatusModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowStatusModal(false)}
      >
        <Pressable
          style={styles.modalContainer}
          onPress={() => setShowStatusModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Update Booking Status
              </Text>
              <Pressable
                onPress={() => setShowStatusModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={palette.textSecondary} />
              </Pressable>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={styles.modalSubtitleContainer}>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarText}>
                    {selectedBooking?.names?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.modalSubtitle}>{selectedBooking?.names || ''}</Text>
              </View>

              <View style={styles.statusOptionsContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.statusOption,
                  pressed && styles.statusOptionPressed
                ]}
                onPress={() => handleStatusSelect('paid_dd')}
              >
                <View style={[styles.statusIconContainer, { backgroundColor: `${palette.statusSuccess}15` }]}>
                  <Ionicons name="checkmark-circle" size={20} color={palette.statusSuccess} />
                </View>
                <View style={styles.statusTextContainer}>
                  <Text style={styles.statusOptionLabel}>Paid (Direct Debit)</Text>
                  <Text style={styles.statusOptionDescription}>Payment confirmed via DD</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={palette.textTertiary} />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.statusOption,
                  pressed && styles.statusOptionPressed
                ]}
                onPress={() => handleStatusSelect('paid_awaiting_dd')}
              >
                <View style={[styles.statusIconContainer, { backgroundColor: `${palette.statusInfo}15` }]}>
                  <Ionicons name="time" size={20} color={palette.statusInfo} />
                </View>
                <View style={styles.statusTextContainer}>
                  <Text style={styles.statusOptionLabel}>Paid (Awaiting DD)</Text>
                  <Text style={styles.statusOptionDescription}>Payment made, DD setup pending</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={palette.textTertiary} />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.statusOption,
                  pressed && styles.statusOptionPressed
                ]}
                onPress={() => handleStatusSelect('unpaid_dd')}
              >
                <View style={[styles.statusIconContainer, { backgroundColor: `${palette.statusWarning}15` }]}>
                  <Ionicons name="card" size={20} color={palette.statusWarning} />
                </View>
                <View style={styles.statusTextContainer}>
                  <Text style={styles.statusOptionLabel}>Unpaid (DD Scheduled)</Text>
                  <Text style={styles.statusOptionDescription}>Will be billed via Direct Debit</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={palette.textTertiary} />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.statusOption,
                  pressed && styles.statusOptionPressed
                ]}
                onPress={() => handleStatusSelect('unpaid_coach_call')}
              >
                <View style={[styles.statusIconContainer, { backgroundColor: `${palette.tint}15` }]}>
                  <Ionicons name="call" size={20} color={palette.tint} />
                </View>
                <View style={styles.statusTextContainer}>
                  <Text style={styles.statusOptionLabel}>Unpaid (Follow Up)</Text>
                  <Text style={styles.statusOptionDescription}>Coach will contact for payment</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={palette.textTertiary} />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.statusOption,
                  pressed && styles.statusOptionPressed
                ]}
                onPress={() => handleStatusSelect('not_joining')}
              >
                <View style={[styles.statusIconContainer, { backgroundColor: `${palette.statusError}15` }]}>
                  <Ionicons name="close-circle" size={20} color={palette.statusError} />
                </View>
                <View style={styles.statusTextContainer}>
                  <Text style={styles.statusOptionLabel}>Not Joining</Text>
                  <Text style={styles.statusOptionDescription}>Decided not to continue</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={palette.textTertiary} />
              </Pressable>
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showKitModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowKitModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowKitModal(false)}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              {kitSelectionStep === 2 && (
                <Pressable
                  onPress={() => setKitSelectionStep(1)}
                  style={styles.modalBackButton}
                >
                  <Ionicons name="arrow-back" size={24} color={palette.textSecondary} />
                </Pressable>
              )}
              <Text style={[styles.modalTitle, kitSelectionStep === 2 && styles.modalTitleWithBack]}>
                {kitSelectionStep === 1 ? 'Select Package' : 'Select Sizes'}
              </Text>
              <Pressable
                onPress={() => {
                  setShowKitModal(false);
                  setKitSelectionStep(1);
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={palette.textSecondary} />
              </Pressable>
            </View>
            {kitSelectionStep === 1 ? (
              // Step 1: Package Selection
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}>
                <View style={styles.modalCompactHeader}>
                  <View style={[styles.modalAvatarSmall, { backgroundColor: `${palette.statusInfo}15` }]}>
                    <Ionicons name="shirt" size={20} color={palette.statusInfo} />
                  </View>
                  <Text style={styles.modalSubtitle}>{selectedBooking?.names || ''}</Text>
                </View>

                <View style={styles.packageSelectionContainer}>
                  <View style={styles.packageOptions}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.packageOption,
                        pressed && styles.packageOptionPressed
                      ]}
                      onPress={() => handlePackageSelection('basic')}
                    >
                      <View style={styles.packageOptionContent}>
                        <Text style={styles.packageOptionLabel}>Basic</Text>
                        <Text style={styles.packageOptionDescription}>T-shirt, Trousers & Boxing gloves</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={palette.textTertiary} />
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.packageOption,
                        pressed && styles.packageOptionPressed
                      ]}
                      onPress={() => handlePackageSelection('silver')}
                    >
                      <View style={styles.packageOptionContent}>
                        <Text style={styles.packageOptionLabel}>Silver</Text>
                        <Text style={styles.packageOptionDescription}>T-shirt, Trousers, Boxing gloves & Shinpads</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={palette.textTertiary} />
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.packageOption,
                        pressed && styles.packageOptionPressed
                      ]}
                      onPress={() => handlePackageSelection('gold')}
                    >
                      <View style={styles.packageOptionContent}>
                        <Text style={styles.packageOptionLabel}>Gold</Text>
                        <Text style={styles.packageOptionDescription}>T-shirt, Trousers, Boxing gloves, Shinpads & Kit bag</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={palette.textTertiary} />
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            ) : (
              // Step 2: Size Selection
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}>
                <View style={styles.modalCompactHeader}>
                  <View style={[styles.modalAvatarSmall, { backgroundColor: `${palette.statusInfo}15` }]}>
                    <Ionicons name="shirt" size={20} color={palette.statusInfo} />
                  </View>
                  <Text style={styles.modalSubtitle}>{selectedBooking?.names || ''}</Text>
                  <View style={[styles.packageBadge]}>
                    <Text style={styles.packageBadgeText}>
                      {selectedPackage?.charAt(0).toUpperCase()}{selectedPackage?.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.sizeSelectionContainer}>
                  {kitItems.map((item, index) => (
                    <View key={index} style={styles.sizeItem}>
                      <View style={styles.sizeItemHeader}>
                        <Ionicons
                          name={item.type === 'tshirt' ? 'shirt' : item.type === 'trousers' ? 'body' : item.type === 'gloves' ? 'hand-left' : item.type === 'shinpads' ? 'shield' : 'bag'}
                          size={20}
                          color={palette.tint}
                        />
                        <Text style={styles.sizeItemLabel}>
                          {item.type === 'tshirt' ? 'T-Shirt' : item.type === 'trousers' ? 'Trousers' : item.type === 'gloves' ? 'Boxing Gloves' : item.type === 'shinpads' ? 'Shin Pads' : 'Kit Bag'}
                        </Text>
                      </View>
                      <Dropdown
                        value={item.size}
                        options={getSizeOptions(item.type).map(size => ({
                          label: size,
                          value: size
                        }))}
                        onValueChange={(value) => updateKitItem(index, 'size', value)}
                        placeholder="Select size"
                      />
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}

            {kitSelectionStep === 2 && (
              <View style={styles.modalFooter}>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalCancelButton,
                    pressed && styles.modalButtonPressed
                  ]}
                  onPress={() => setKitSelectionStep(1)}
                >
                  <Text style={styles.modalCancelButtonText}>Back</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalPrimaryButton,
                    kitItems.length === 0 && styles.modalButtonDisabled,
                    pressed && !kitItems.length && styles.modalButtonPressed
                  ]}
                  onPress={handleKitSubmit}
                  disabled={kitItems.length === 0}
                >
                  <Ionicons name="checkmark" size={18} color={palette.textInverse} />
                  <Text style={styles.modalPrimaryButtonText}>Confirm Kit</Text>
                </Pressable>
              </View>
            )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={showReminderModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowReminderModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <TouchableWithoutFeedback onPress={() => {
            Keyboard.dismiss();
            setShowReminderModal(false);
          }}>
            <View style={styles.modalContainer}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      Set Call Reminder
                    </Text>
                    <Pressable
                      onPress={() => {
                        Keyboard.dismiss();
                        setShowReminderModal(false);
                      }}
                      style={styles.modalCloseButton}
                    >
                      <Ionicons name="close" size={24} color={palette.textSecondary} />
                    </Pressable>
                  </View>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.modalScrollContent}
                  >
                    <View style={styles.modalSubtitleContainer}>
                      <View style={[styles.modalAvatar, { backgroundColor: `${palette.tint}15` }]}>
                        <Ionicons name="call" size={28} color={palette.tint} />
                      </View>
                      <Text style={styles.modalSubtitle}>{selectedBooking?.names || ''}</Text>
                      <Text style={styles.modalDescription}>Set a reminder to follow up</Text>
                    </View>

                    <View style={styles.reminderContent}>
              <Text style={styles.reminderLabel}>Remind me on:</Text>

              <View style={styles.dateTimeContainer}>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowTimePicker(false); // Close time picker if open
                    setShowDatePicker(true);
                  }}
                >
                  <Ionicons name="calendar-outline" size={20} color={palette.tint} />
                  <Text style={styles.dateTimeButtonText}>
                    {reminderDate.toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowDatePicker(false); // Close date picker if open
                    setShowTimePicker(true);
                  }}
                >
                  <Ionicons name="time-outline" size={20} color={palette.tint} />
                  <Text style={styles.dateTimeButtonText}>
                    {reminderDate.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.reminderLabel}>Alternative phone number (optional):</Text>
              <TextInput
                style={styles.alternativePhoneInput}
                value={alternativePhoneNumber}
                onChangeText={setAlternativePhoneNumber}
                placeholder={selectedBooking?.phone ? `Default: ${selectedBooking.phone}` : 'Enter phone number...'}
                placeholderTextColor={palette.textTertiary}
                keyboardType="phone-pad"
              />
              <Text style={styles.phoneHelpText}>
                Leave blank to use the booking's phone number
              </Text>
                    </View>

                    <View style={styles.modalFooter}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.modalCancelButton,
                          pressed && styles.modalButtonPressed
                        ]}
                        onPress={() => {
                          Keyboard.dismiss();
                          setShowReminderModal(false);
                          setShowDatePicker(false);
                          setShowTimePicker(false);
                        }}
                      >
                        <Text style={styles.modalCancelButtonText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [
                          styles.modalPrimaryButton,
                          pressed && styles.modalButtonPressed
                        ]}
                        onPress={() => {
                          Keyboard.dismiss();
                          handleReminderSubmit();
                        }}
                      >
                        <Ionicons name="notifications" size={18} color={palette.textInverse} />
                        <Text style={styles.modalPrimaryButtonText}>Set Reminder</Text>
                      </Pressable>
                    </View>
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* iOS Date Picker in Modal */}
      {Platform.OS === 'ios' && showDatePicker && (
        <Modal
          transparent
          visible={showDatePicker}
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  style={styles.datePickerButton}
                >
                  <Text style={styles.datePickerButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Select Date</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowDatePicker(false);
                  }}
                  style={styles.datePickerButton}
                >
                  <Text style={[styles.datePickerButtonText, { color: palette.tint }]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={reminderDate}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={(_event, selectedDate) => {
                  if (selectedDate) {
                    const newDate = new Date(reminderDate);
                    newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                    setReminderDate(newDate);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* iOS Time Picker in Modal */}
      {Platform.OS === 'ios' && showTimePicker && (
        <Modal
          transparent
          visible={showTimePicker}
          animationType="slide"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity
                  onPress={() => setShowTimePicker(false)}
                  style={styles.datePickerButton}
                >
                  <Text style={styles.datePickerButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Select Time</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowTimePicker(false);
                  }}
                  style={styles.datePickerButton}
                >
                  <Text style={[styles.datePickerButtonText, { color: palette.tint }]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={reminderDate}
                mode="time"
                display="spinner"
                onChange={(_event, selectedDate) => {
                  if (selectedDate) {
                    const newDate = new Date(reminderDate);
                    newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
                    setReminderDate(newDate);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android Date Picker */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={reminderDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (event.type === 'set' && selectedDate) {
              const newDate = new Date(reminderDate);
              newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
              setReminderDate(newDate);
            }
          }}
        />
      )}

      {/* Android Time Picker */}
      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker
          value={reminderDate}
          mode="time"
          display="default"
          onChange={(event, selectedDate) => {
            setShowTimePicker(false);
            if (event.type === 'set' && selectedDate) {
              const newDate = new Date(reminderDate);
              newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
              setReminderDate(newDate);
            }
          }}
        />
      )}

      {/* Booking Creation Modal */}
      <BookingCreationModal
        visible={showCreateBookingModal}
        onClose={() => setShowCreateBookingModal(false)}
        onSuccess={() => {
          setShowCreateBookingModal(false);
          refreshBookings();
        }}
      />
    </>
  );
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 80, // Extra padding to ensure pagination is accessible
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: Theme.spacing['2xl'],
    backgroundColor: palette.background,
    borderRadius: Theme.borderRadius.xl,
    ...Theme.shadows.md,
  },
  loadingText: {
    marginTop: Theme.spacing.lg,
    fontSize: Theme.typography.sizes.md,
    color: palette.textSecondary,
    fontFamily: Theme.typography.fonts.medium,
  },
  errorContainer: {
    alignItems: 'center',
    padding: Theme.spacing['2xl'],
    backgroundColor: palette.background,
    borderRadius: Theme.borderRadius.xl,
    ...Theme.shadows.md,
    maxWidth: 320,
  },
  errorIconContainer: {
    padding: Theme.spacing.lg,
    backgroundColor: `${palette.statusError}15`,
    borderRadius: Theme.borderRadius.full,
    marginBottom: Theme.spacing.lg,
  },
  errorTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  errorMessage: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: palette.tint,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.full,
    ...Theme.shadows.sm,
  },
  retryButtonText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
  },
  content: {
    paddingHorizontal: Theme.spacing.xs,
  },
  header: {
    marginBottom: Theme.spacing.lg,
    overflow: 'hidden',
  },
  headerGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  title: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
  },
  countBadge: {
    backgroundColor: palette.tint,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    shadowColor: palette.tint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  countText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.bold,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.statusWarning,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    gap: Theme.spacing.xs,
    marginTop: Theme.spacing.sm,
    alignSelf: 'flex-start',
    ...Theme.shadows.sm,
  },
  offlineText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.semibold,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.tint,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: palette.tint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
  syncText: {
    fontSize: Theme.typography.sizes.xs,
    color: palette.textTertiary,
    fontFamily: Theme.typography.fonts.regular,
    marginBottom: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.background,
    borderRadius: Theme.borderRadius.xl,
    paddingHorizontal: Theme.spacing.lg ,
    marginBottom: Theme.spacing.lg,
    marginHorizontal: Theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIcon: {
    marginRight: Theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 52,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textPrimary,
  },
  clearButton: {
    padding: Theme.spacing.xs,
  },
  filterContainer: {
    marginBottom: Theme.spacing.lg,
    flexGrow: 0,
  },
  filterChip: {
    marginRight: Theme.spacing.sm,
  },
  bookingsList: {
    gap: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.xxl,
  },
  trialCard: {
    marginBottom: 0,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    backgroundColor: palette.isDark ? '#2A2A2A' : palette.card,
  },
  trialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  trialHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: `${palette.tint}20`,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: palette.tint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.tint,
  },
  nameSection: {
    flex: 1,
  },
  trialName: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: Theme.borderRadius.full,
  },
  statusText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
  },
  classBadge: {
    alignSelf: 'flex-start',
  },
  statusBadgeContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statusBadgeText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
  },
  trialDetails: {
    marginBottom: Theme.spacing.md,
  },
  detailGrid: {
    gap: Theme.spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  detailIconContainer: {
    width: 32,
    height: 32,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: palette.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  detailText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    paddingTop: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.borderLight,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonOutline: {
    borderWidth: 2,
    borderColor: palette.statusError,
    backgroundColor: `${palette.statusError}08`,
  },
  actionButtonPrimary: {
    borderWidth: 2,
    borderColor: palette.statusSuccess,
    backgroundColor: `${palette.statusSuccess}08`,
  },
  actionButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  actionButtonText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.xl,
    marginBottom: Theme.spacing['3xl'],
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.borderLight,
  },
  paginationButton: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: palette.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadows.sm,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonPressed: {
    opacity: 0.8,
  },
  paginationInfo: {
    flex: 1,
    alignItems: 'center',
  },
  paginationText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
  },
  paginationSubtext: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textTertiary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Theme.spacing['3xl'],
  },
  emptyIconContainer: {
    padding: Theme.spacing.xl,
    backgroundColor: `${palette.textTertiary}10`,
    borderRadius: Theme.borderRadius.full,
    marginBottom: Theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  emptyMessage: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  viewModeContainer: {
    marginBottom: Theme.spacing.lg,
    marginHorizontal: Theme.spacing.md,
    backgroundColor: palette.background,
    borderRadius: Theme.borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  viewModeTabs: {
    flexDirection: 'row',
    padding: Theme.spacing.xs,
    width: '100%',
  },
  viewModeTab: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeTabText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textSecondary,
  },
  viewModeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: Theme.spacing.xs,
    width: '48%',
    height: 4,
    backgroundColor: palette.tint,
    borderRadius: 2,
    shadowColor: palette.tint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  clearSearchButton: {
    marginTop: Theme.spacing.lg,
    backgroundColor: palette.tint,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
  },
  clearSearchButtonText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: palette.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: palette.background,
    borderRadius: Theme.borderRadius.xl,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    ...Theme.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  modalTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
    flex: 1,
  },
  modalCloseButton: {
    padding: Theme.spacing.xs,
    marginLeft: Theme.spacing.md,
  },
  modalSubtitleContainer: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
  },
  modalAvatar: {
    width: 56,
    height: 56,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: `${palette.tint}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  modalAvatarText: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.tint,
  },
  modalSubtitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    marginTop: Theme.spacing.xs,
    textAlign: 'center',
  },
  statusOptionsContainer: {
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xl,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.borderLight,
  },
  statusOptionPressed: {
    backgroundColor: palette.backgroundSecondary,
    transform: [{ scale: 0.98 }],
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusOptionLabel: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginBottom: 2,
  },
  statusOptionDescription: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xl,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.borderLight,
  },
  modalCancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: palette.borderDefault,
    backgroundColor: palette.background,
  },
  modalCancelButtonText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textSecondary,
  },
  modalPrimaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.xs,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: palette.tint,
    ...Theme.shadows.sm,
  },
  modalPrimaryButtonText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textInverse,
  },
  modalButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  modalButtonDisabled: {
    opacity: 0.5,
    backgroundColor: palette.textTertiary,
  },
  kitList: {
    maxHeight: 300,
    marginBottom: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xl,
  },
  kitItem: {
    backgroundColor: palette.background,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: palette.borderLight,
    ...Theme.shadows.sm,
  },
  kitItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  kitItemNumber: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.tint,
  },
  removeButton: {
    padding: Theme.spacing.sm,
    backgroundColor: `${palette.statusError}10`,
    borderRadius: Theme.borderRadius.sm,
  },
  pickerContainer: {
    marginBottom: Theme.spacing.md,
  },
  pickerLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
    marginBottom: Theme.spacing.xs,
  },
  noItemsText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textTertiary,
    textAlign: 'center',
    paddingVertical: Theme.spacing.xl,
  },
  addKitButtonNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    paddingVertical: Theme.spacing.md,
    marginHorizontal: Theme.spacing.xl,
    marginBottom: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: `${palette.tint}10`,
    borderWidth: 1.5,
    borderColor: palette.tint,
    borderStyle: 'dashed',
  },
  addKitButtonPressed: {
    backgroundColor: `${palette.tint}20`,
  },
  addKitButtonText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.tint,
  },
  reminderContent: {
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: Theme.spacing.lg,
  },
  reminderLabel: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.md,
  },
  dateTimeContainer: {
    flexDirection: 'column',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: palette.background,
    borderWidth: 1.5,
    borderColor: palette.borderDefault,
    ...Theme.shadows.sm,
  },
  dateTimeButtonText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    flex: 1,
  },
  modalScrollView: {
    flexGrow: 0,
    flexShrink: 1,
  },
  modalScrollContent: {
    paddingBottom: Theme.spacing.lg,
    flexGrow: 1,
  },
  modalCompactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  modalAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  packageSelectionContainer: {
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: Theme.spacing.md,
  },
  packageSelectionTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.md,
  },
  packageOptions: {
    gap: Theme.spacing.sm,
  },
  packageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: palette.borderDefault,
    backgroundColor: palette.background,
    marginBottom: Theme.spacing.xs,
  },
  packageOptionSelected: {
    borderColor: palette.tint,
    backgroundColor: `${palette.tint}10`,
  },
  packageOptionPressed: {
    opacity: 0.8,
  },
  packageOptionContent: {
    flex: 1,
  },
  packageOptionLabel: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginBottom: 2,
  },
  packageOptionLabelSelected: {
    color: palette.tint,
  },
  packageOptionDescription: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
  },
  kitSizeSelectionHeader: {
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: Theme.spacing.sm,
  },
  kitSizeSelectionTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  kitSizeSelectionSubtitle: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    fontStyle: 'italic',
  },
  modalBackButton: {
    padding: Theme.spacing.xs,
    marginRight: Theme.spacing.xs,
  },
  modalTitleWithBack: {
    marginLeft: 0,
  },
  packageBadge: {
    backgroundColor: palette.tint,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
  },
  packageBadgeText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
  },
  sizeSelectionContainer: {
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: Theme.spacing.lg,
  },
  sizeItem: {
    marginBottom: Theme.spacing.lg,
  },
  sizeItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  sizeItemLabel: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
  },
  sectionHeader: {
    marginTop: Theme.spacing.xl,
    marginBottom: Theme.spacing.lg,
    marginHorizontal: Theme.spacing.xl,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
  },
  sectionBadge: {
    backgroundColor: `${palette.statusWarning}15`,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    shadowColor: palette.statusWarning,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionBadgeText: {
    color: palette.statusWarning,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.bold,
  },
  sectionSubtitle: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    marginLeft: 32,
  },
  alternativePhoneInput: {
    padding: Theme.spacing.md,
    backgroundColor: palette.backgroundSecondary,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: palette.borderLight,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  phoneHelpText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textTertiary,
    marginBottom: Theme.spacing.md,
  },
  datePickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerContainer: {
    backgroundColor: palette.background,
    borderTopLeftRadius: Theme.borderRadius.xl,
    borderTopRightRadius: Theme.borderRadius.xl,
    paddingBottom: 40,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  datePickerTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
  },
  datePickerButton: {
    padding: Theme.spacing.sm,
  },
  datePickerButtonText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
  },
});
