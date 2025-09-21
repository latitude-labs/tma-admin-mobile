import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Pressable,
  Platform,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card, Button, Badge, Chip, Dropdown } from '@/components/ui';
import { Theme } from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import { useBookingStore } from '@/store/bookingStore';
import { useClubStore } from '@/store/clubStore';
import { bookingsService } from '@/services/api/bookings.service';
import { Booking } from '@/types/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  FadeIn,
  FadeInDown,
  FadeInUp,
  Layout,
  Easing,
  SlideInRight
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';

const AnimatedCard = Animated.createAnimatedComponent(Card);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type BookingStatus = 'pending' | 'paid_dd' | 'paid_awaiting_dd' | 'unpaid_dd' | 'unpaid_coach_call' | 'not_joining';

interface KitItem {
  type: 'tshirt' | 'trousers' | 'gloves' | 'shinpads' | 'kitbag';
  size: string;
}

export default function TrialsScreen() {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchFocused = useSharedValue(0);
  const pulseOpacity = useSharedValue(0.3);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | null>(null);
  const [showKitModal, setShowKitModal] = useState(false);
  const [kitItems, setKitItems] = useState<KitItem[]>([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderDate, setReminderDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const {
    bookings,
    isLoading,
    error,
    isOffline,
    lastSync,
    pagination,
    fetchBookings,
    fetchBookingsPage,
    refreshBookings,
    setFilters,
    getFilteredBookings,
    updateBookingStatus,
    setSearchQuery: updateSearchQuery,
  } = useBookingStore();
  const { clubs } = useClubStore();

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    setFilters({ status: filterStatus as any, searchQuery });
    updateSearchQuery(searchQuery);
  }, [filterStatus, searchQuery]);

  const statusConfig: Record<string, { color: string; icon: string }> = {
    
    scheduled: { color: palette.statusInfo, icon: 'calendar' },
    completed: { color: palette.statusSuccess, icon: 'checkmark-circle' },
    'no-show': { color: palette.statusError, icon: 'close-circle' },
    cancelled: { color: palette.statusWarning, icon: 'alert-circle' },
  };

  const sortedBookings = getFilteredBookings();

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
      return `Today at ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const tshirtSizes = ['X Small Youth', 'Small Youth', 'Medium Youth', 'Large Youth', 'XL Youth', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
  const trouserSizes = ['7XS', '6XS', '5XS', '4XS', '3XS', '2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL'];
  const gloveSizes = ['6oz', '10oz', '16oz'];
  const shinpadSizes = ['XS', 'S', 'M', 'L', 'XL'];

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

  const handleStatusSelect = (status: BookingStatus) => {
    setSelectedStatus(status);
    setShowStatusModal(false);

    if (status === 'paid_dd' || status === 'paid_awaiting_dd') {
      // Show kit selection modal
      setKitItems([]);
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

  const submitStatusUpdate = async (
    bookingId: number,
    status: BookingStatus,
    kitItemsData?: KitItem[],
    reminderTime?: string
  ) => {
    const updateParams: any = { status };

    if (kitItemsData && kitItemsData.length > 0) {
      updateParams.kit_items = kitItemsData;
    }

    if (reminderTime) {
      updateParams.reminder_time = reminderTime;
    }

    try {
      const response = await bookingsService.updateBookingConversionStatus(bookingId, updateParams);

      Alert.alert('Success', `Booking ${status === 'not_joining' ? 'marked as not joining' : 'updated successfully'}`);

      // Reset state
      setSelectedBooking(null);
      setSelectedStatus(null);
      setKitItems([]);

      // Reload bookings
      refreshBookings();
    } catch (error) {
      console.error('Failed to update booking:', error);
      Alert.alert('Error', 'Failed to update booking status');
    }
  };

  const handleKitSubmit = () => {
    const validKitItems = kitItems.filter(item => item.type && item.size);

    if (validKitItems.length === 0) {
      Alert.alert('Error', 'Please add at least one kit item with both type and size');
      return;
    }

    setShowKitModal(false);
    if (selectedBooking && selectedStatus) {
      submitStatusUpdate(selectedBooking.id, selectedStatus, validKitItems);
    }
  };

  const handleReminderSubmit = () => {
    setShowReminderModal(false);
    if (selectedBooking && selectedStatus) {
      // The reminder will be created automatically by the API when updating status with reminder_time
      submitStatusUpdate(selectedBooking.id, selectedStatus, undefined, reminderDate.toISOString());
    }
  };

  const addKitItem = () => {
    setKitItems([...kitItems, { type: 'tshirt', size: '' }]);
  };

  const removeKitItem = (index: number) => {
    setKitItems(kitItems.filter((_, i) => i !== index));
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

  const getStatusBadgeVariant = (status?: string) => {
    if (!status || status === 'pending') return 'secondary';
    switch (status) {
      case 'paid_dd': return 'success';
      case 'paid_awaiting_dd': return 'info';
      case 'unpaid_dd':
      case 'unpaid_coach_call': return 'warning';
      case 'not_joining': return 'error';
      default: return 'secondary';
    }
  };

  useEffect(() => {
    if (isLoading && bookings.length === 0) {
      pulseOpacity.value = withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) })
      );
    }
  }, [isLoading, bookings.length]);

  const loadingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // Loading state
  if (isLoading && bookings.length === 0) {
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

  // Error state
  if (error && bookings.length === 0) {
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

  const searchAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: withSpring(
      searchFocused.value ? palette.tint : palette.borderDefault,
      { damping: 15, stiffness: 150 }
    ),
    borderWidth: withSpring(searchFocused.value ? 2 : 1),
  }));

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
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
            }}
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed
            ]}
          >
            <Ionicons name="add" size={20} color={palette.textInverse} />
            <Text style={styles.addButtonText}>Add Trial</Text>
          </AnimatedPressable>
        </Animated.View>

        {lastSync && (
          <Animated.Text
            entering={FadeIn.delay(200).duration(300)}
            style={styles.syncText}
          >
            Last synced {new Date(lastSync).toLocaleString('en-GB', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
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
          entering={FadeInDown.delay(200).duration(400).springify()}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
            {['All', 'Scheduled', 'Completed', 'Cancelled', 'No Show'].map((status, index) => {
              const value = status === 'All' ? null : status.toLowerCase().replace(' ', '-');
              const isSelected = filterStatus === value || (status === 'All' && !filterStatus);

              return (
                <Animated.View
                  key={status}
                  entering={SlideInRight.delay(index * 50).duration(300).springify()}
                >
                  <Chip
                    label={status}
                    selected={isSelected}
                    onPress={() => {
                      setFilterStatus(value);
                      if (Platform.OS === 'ios') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                    style={styles.filterChip}
                  />
                </Animated.View>
              );
            })}
          </ScrollView>
        </Animated.View>

        {sortedBookings.length > 0 ? (
          <>
            <View style={styles.bookingsList}>
              {sortedBookings.map((booking, index) => {
                const status = getBookingStatus(booking);
                const statusInfo = statusConfig[status];

                return (
                  <AnimatedPressable
                    key={booking.id}
                    onPress={() => {
                      if (Platform.OS === 'ios') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                  >
                    <AnimatedCard
                      variant="elevated"
                      style={styles.trialCard}
                      entering={FadeInDown.delay(index * 80).duration(400).springify()}
                      layout={Layout.springify()}
                    >
                      <View style={styles.trialHeader}>
                        <View style={styles.trialHeaderLeft}>
                          <View style={styles.avatarContainer}>
                            <Text style={styles.avatarText}>
                              {booking.names?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.nameSection}>
                            <Text style={styles.trialName}>{booking.names}</Text>
                            <View style={styles.statusContainer}>
                              <View style={[styles.statusDot, { backgroundColor: statusInfo?.color }]} />
                              <Text style={[styles.statusText, { color: statusInfo?.color }]}>
                                {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.badgeContainer}>
                          {booking.status && (
                            <Badge
                              variant={getStatusBadgeVariant(booking.status)}
                              size="sm"
                              style={styles.classBadge}
                            >
                              {booking.status === 'paid_dd' && 'Paid DD'}
                              {booking.status === 'paid_awaiting_dd' && 'Paid (Awaiting DD)'}
                              {booking.status === 'unpaid_dd' && 'Unpaid DD'}
                              {booking.status === 'unpaid_coach_call' && 'Follow Up'}
                              {booking.status === 'not_joining' && 'Not Joining'}
                            </Badge>
                          )}
                          {booking.class_time?.name && (
                            <Badge
                              variant={booking.class_time.name.toLowerCase().includes('kid') ? 'warning' : 'info'}
                              size="sm"
                              style={styles.classBadge}
                            >
                              {booking.class_time.name}
                            </Badge>
                          )}
                        </View>
                      </View>

                      <View style={styles.trialDetails}>
                        <View style={styles.detailGrid}>
                          <View style={styles.detailItem}>
                            <View style={styles.detailIconContainer}>
                              <Ionicons name="calendar" size={14} color={palette.tint} />
                            </View>
                            <Text style={styles.detailText}>{formatDate(booking.start_time)}</Text>
                          </View>

                          {booking.club && (
                            <View style={styles.detailItem}>
                              <View style={styles.detailIconContainer}>
                                <Ionicons name="business" size={14} color={palette.statusInfo} />
                              </View>
                              <Text style={styles.detailText}>{booking.club.name}</Text>
                            </View>
                          )}

                          {booking.email && (
                            <View style={styles.detailItem}>
                              <View style={styles.detailIconContainer}>
                                <Ionicons name="mail" size={14} color={palette.statusSuccess} />
                              </View>
                              <Text style={styles.detailText}>{booking.email}</Text>
                            </View>
                          )}

                          {booking.phone && (
                            <View style={styles.detailItem}>
                              <View style={styles.detailIconContainer}>
                                <Ionicons name="call" size={14} color={palette.statusWarning} />
                              </View>
                              <Text style={styles.detailText}>{booking.phone}</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {status === 'scheduled' && (
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
                          >
                            <Ionicons name="checkmark" size={16} color={palette.statusSuccess} />
                            <Text style={[styles.actionButtonText, { color: palette.statusSuccess }]}>
                              Check In
                            </Text>
                          </Pressable>
                        </Animated.View>
                      )}
                    </AnimatedCard>
                  </AnimatedPressable>
                );
              })}
            </View>

            {!isOffline && pagination.totalPages > 1 && (
              <Animated.View
                entering={FadeInUp.delay(300).duration(400).springify()}
                style={styles.paginationContainer}
              >
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
              </Animated.View>
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
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
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
            <View style={styles.modalSubtitleContainer}>
              <View style={styles.modalAvatar}>
                <Text style={styles.modalAvatarText}>
                  {selectedBooking?.names?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.modalSubtitle}>{selectedBooking?.names}</Text>
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
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showKitModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowKitModal(false)}
      >
        <Pressable
          style={styles.modalContainer}
          onPress={() => setShowKitModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select Kit Items
              </Text>
              <Pressable
                onPress={() => setShowKitModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={palette.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.modalSubtitleContainer}>
              <View style={[styles.modalAvatar, { backgroundColor: `${palette.statusInfo}15` }]}>
                <Ionicons name="shirt" size={28} color={palette.statusInfo} />
              </View>
              <Text style={styles.modalSubtitle}>{selectedBooking?.names}</Text>
              <Text style={styles.modalDescription}>Select the kit items needed</Text>
            </View>

            {kitItems.length === 0 ? (
              <Text style={styles.noItemsText}>No items added yet</Text>
            ) : (
              <ScrollView style={styles.kitList} showsVerticalScrollIndicator={false}>
                {kitItems.map((item, index) => (
                  <View key={index} style={styles.kitItem}>
                    <View style={styles.kitItemHeader}>
                      <Text style={styles.kitItemNumber}>Item {index + 1}</Text>
                      <TouchableOpacity
                        onPress={() => removeKitItem(index)}
                        style={styles.removeButton}
                      >
                        <Ionicons name="trash-outline" size={18} color={palette.statusError} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.pickerContainer}>
                      <Text style={styles.pickerLabel}>Type:</Text>
                      <Dropdown
                        value={item.type}
                        options={[
                          { label: 'T-Shirt', value: 'tshirt' },
                          { label: 'Trousers', value: 'trousers' },
                          { label: 'Gloves', value: 'gloves' },
                          { label: 'Shin Pads', value: 'shinpads' },
                          { label: 'Kit Bag', value: 'kitbag' },
                        ]}
                        onValueChange={(value) => updateKitItem(index, 'type', value)}
                        placeholder="Select item type"
                      />
                    </View>

                    <View style={styles.pickerContainer}>
                      <Text style={styles.pickerLabel}>Size:</Text>
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
                  </View>
                ))}
              </ScrollView>
            )}

            <Pressable
              onPress={addKitItem}
              style={({ pressed }) => [
                styles.addKitButtonNew,
                pressed && styles.addKitButtonPressed
              ]}
            >
              <Ionicons name="add-circle" size={20} color={palette.tint} />
              <Text style={styles.addKitButtonText}>Add Kit Item</Text>
            </Pressable>

            <View style={styles.modalFooter}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalCancelButton,
                  pressed && styles.modalButtonPressed
                ]}
                onPress={() => setShowKitModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
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
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showReminderModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowReminderModal(false)}
      >
        <Pressable
          style={styles.modalContainer}
          onPress={() => setShowReminderModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Set Call Reminder
              </Text>
              <Pressable
                onPress={() => setShowReminderModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={palette.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.modalSubtitleContainer}>
              <View style={[styles.modalAvatar, { backgroundColor: `${palette.tint}15` }]}>
                <Ionicons name="call" size={28} color={palette.tint} />
              </View>
              <Text style={styles.modalSubtitle}>{selectedBooking?.names}</Text>
              <Text style={styles.modalDescription}>Set a reminder to follow up</Text>
            </View>

            <View style={styles.reminderContent}>
              <Text style={styles.reminderLabel}>Remind me on:</Text>

              <View style={styles.dateTimeContainer}>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => {
                    if (Platform.OS === 'ios') {
                      setShowDatePicker(true);
                    } else {
                      setShowDatePicker(true);
                    }
                  }}
                >
                  <Ionicons name="calendar-outline" size={20} color={palette.textSecondary} />
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
                    if (Platform.OS === 'ios') {
                      setShowTimePicker(true);
                    } else {
                      setShowTimePicker(true);
                    }
                  }}
                >
                  <Ionicons name="time-outline" size={20} color={palette.textSecondary} />
                  <Text style={styles.dateTimeButtonText}>
                    {reminderDate.toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </TouchableOpacity>
              </View>

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
                  minimumDate={new Date()}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={reminderDate}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'compact' : 'default'}
                  onChange={(_event, date) => {
                    setShowTimePicker(false);
                    if (date) {
                      const newDate = new Date(reminderDate);
                      newDate.setHours(date.getHours(), date.getMinutes());
                      setReminderDate(newDate);
                    }
                  }}
                />
              )}
            </View>
            <View style={styles.modalFooter}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalCancelButton,
                  pressed && styles.modalButtonPressed
                ]}
                onPress={() => {
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
                onPress={handleReminderSubmit}
              >
                <Ionicons name="notifications" size={18} color={palette.textInverse} />
                <Text style={styles.modalPrimaryButtonText}>Set Reminder</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.backgroundSecondary,
  },
  scrollContent: {
    flexGrow: 1,
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
    padding: Theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
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
    fontSize: Theme.typography.sizes['2xl'],
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
  },
  countBadge: {
    backgroundColor: palette.tint,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
  },
  countText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.sm,
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
    color: '#FFF',
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.semibold,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    backgroundColor: palette.tint,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    ...Theme.shadows.sm,
  },
  addButtonPressed: {
    opacity: 0.8,
  },
  addButtonText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
  },
  syncText: {
    fontSize: Theme.typography.sizes.xs,
    color: palette.textTertiary,
    fontFamily: Theme.typography.fonts.regular,
    marginBottom: Theme.spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.background,
    borderRadius: Theme.borderRadius.lg,
    paddingHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
    ...Theme.shadows.sm,
  },
  searchIcon: {
    marginRight: Theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
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
    gap: Theme.spacing.md,
  },
  trialCard: {
    marginBottom: 0,
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
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
    width: 44,
    height: 44,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: `${palette.tint}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: Theme.typography.sizes.md,
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
  badgeContainer: {
    flexDirection: 'column',
    gap: Theme.spacing.xs,
    alignItems: 'flex-end',
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
    width: 28,
    height: 28,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: palette.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: Theme.spacing.xs,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.lg,
  },
  actionButtonOutline: {
    borderWidth: 1.5,
    borderColor: palette.statusError,
    backgroundColor: 'transparent',
  },
  actionButtonPrimary: {
    borderWidth: 1.5,
    borderColor: palette.statusSuccess,
    backgroundColor: 'transparent',
  },
  actionButtonPressed: {
    opacity: 0.8,
  },
  actionButtonText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.xl,
    paddingTop: Theme.spacing.lg,
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
});
