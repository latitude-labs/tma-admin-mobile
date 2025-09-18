import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Alert, Modal, TextInput, Platform, ActionSheetIOS } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Card, Badge, Button } from '@/components/ui';
import { Theme } from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import { Booking } from '@/types/api';
import { bookingsService } from '@/services/api/bookings.service';
import DateTimePicker from '@react-native-community/datetimepicker';

type BookingStatus = 'pending' | 'paid_dd' | 'paid_awaiting_dd' | 'unpaid_dd' | 'unpaid_coach_call' | 'not_joining';

interface KitItem {
  type: 'tshirt' | 'trousers' | 'gloves' | 'shinpads' | 'kitbag';
  size: string;
}

// Custom Dropdown Component
interface DropdownProps {
  value: string;
  options: { label: string; value: string }[];
  onValueChange: (value: string) => void;
  placeholder?: string;
}

const Dropdown: React.FC<DropdownProps> = ({ value, options, onValueChange, placeholder = 'Select...' }) => {
  const [showModal, setShowModal] = useState(false);

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue);
    setShowModal(false);
  };

  const selectedOption = options.find(opt => opt.value === value);

  const showPicker = () => {
    if (Platform.OS === 'ios') {
      const iosOptions = [...options.map(opt => opt.label), 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: iosOptions,
          cancelButtonIndex: iosOptions.length - 1,
        },
        (buttonIndex) => {
          if (buttonIndex !== iosOptions.length - 1) {
            onValueChange(options[buttonIndex].value);
          }
        }
      );
    } else {
      setShowModal(true);
    }
  };

  const dropdownStyles = StyleSheet.create({
    button: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: Theme.colors.background.primary,
      borderRadius: Theme.borderRadius.md,
      borderWidth: 1,
      borderColor: Theme.colors.border.light,
      paddingHorizontal: Theme.spacing.md,
      paddingVertical: Theme.spacing.md,
      minHeight: 48,
    },
    buttonText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.regular,
      color: Theme.colors.text.primary,
      flex: 1,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: Theme.colors.background.primary,
      borderRadius: Theme.borderRadius.lg,
      width: '80%',
      maxHeight: '60%',
      padding: Theme.spacing.sm,
    },
    modalScroll: {
      maxHeight: 300,
    },
    option: {
      paddingVertical: Theme.spacing.md,
      paddingHorizontal: Theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: Theme.colors.border.light,
    },
    optionSelected: {
      backgroundColor: Theme.colors.primary + '10',
    },
    optionText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.regular,
      color: Theme.colors.text.primary,
    },
    optionTextSelected: {
      fontFamily: Theme.typography.fonts.semibold,
      color: Theme.colors.primary,
    },
  });

  return (
    <>
      <TouchableOpacity
        onPress={showPicker}
        style={dropdownStyles.button}
      >
        <Text style={dropdownStyles.buttonText}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={Theme.colors.text.secondary} />
      </TouchableOpacity>

      {Platform.OS === 'android' && (
        <Modal
          visible={showModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowModal(false)}
        >
          <TouchableOpacity
            style={dropdownStyles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowModal(false)}
          >
            <View style={dropdownStyles.modalContent}>
              <ScrollView style={dropdownStyles.modalScroll}>
                {options.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      dropdownStyles.option,
                      value === option.value && dropdownStyles.optionSelected
                    ]}
                    onPress={() => handleSelect(option.value)}
                  >
                    <Text
                      style={[
                        dropdownStyles.optionText,
                        value === option.value && dropdownStyles.optionTextSelected
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
};

export default function ClassBookingsScreen() {
  const params = useLocalSearchParams();
  const { classTimeId, className, clubName, startTime, endTime, date } = params as {
    classTimeId: string;
    className: string;
    clubName: string;
    startTime: string;
    endTime: string;
    date?: string;
  };

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [processedBookings, setProcessedBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'processed'>('pending');
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | null>(null);
  const [showKitModal, setShowKitModal] = useState(false);
  const [kitItems, setKitItems] = useState<KitItem[]>([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderDate, setReminderDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const tshirtSizes = ['X Small Youth', 'Small Youth', 'Medium Youth', 'Large Youth', 'XL Youth', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
  const trouserSizes = ['7XS', '6XS', '5XS', '4XS', '3XS', '2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL'];
  const gloveSizes = ['6oz', '10oz', '16oz'];
  const shinpadSizes = ['XS', 'S', 'M', 'L', 'XL'];

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    try {
      // Get the date from params or use today
      const targetDate = date || new Date().toISOString().split('T')[0];

      // Fetch all bookings for this class time
      const bookingsData = await bookingsService.getAllBookings({
        class_time_id: Number(classTimeId),
        start_date: targetDate,
        end_date: targetDate
      });

      // Filter out cancelled bookings
      const activeBookings = bookingsData.filter(booking => !booking.cancelled_at);

      // Separate pending and processed bookings
      const pending = activeBookings.filter(b => !b.status || b.status === 'pending');
      const processed = activeBookings.filter(b => b.status && b.status !== 'pending');

      setBookings(activeBookings);
      setPendingBookings(pending);
      setProcessedBookings(processed);
    } catch (error) {
      console.error('Failed to load bookings:', error);
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
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
      const response = await bookingsService.updateBookingStatus(bookingId, updateParams);

      Alert.alert('Success', `Booking ${status === 'not_joining' ? 'marked as not joining' : 'updated successfully'}`);

      // Reset state
      setSelectedBooking(null);
      setSelectedStatus(null);
      setKitItems([]);

      // Reload bookings
      loadBookings();
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

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  const displayBookings = activeTab === 'pending' ? pendingBookings : processedBookings;

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Theme.colors.text.primary} />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.className}>{className}</Text>
              <Text style={styles.classDetails}>
                {formatTime(startTime)} - {formatTime(endTime)} • {clubName}
                {date && ` • ${new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
              </Text>
            </View>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
              onPress={() => setActiveTab('pending')}
            >
              <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
                Pending ({pendingBookings.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'processed' && styles.activeTab]}
              onPress={() => setActiveTab('processed')}
            >
              <Text style={[styles.tabText, activeTab === 'processed' && styles.activeTabText]}>
                Processed ({processedBookings.length})
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>
            {activeTab === 'pending' ? 'Pending Bookings' : 'Processed Bookings'}
          </Text>

          {displayBookings.length === 0 ? (
            <Card variant="filled" style={styles.emptyCard}>
              <View style={styles.emptyState}>
                <Ionicons
                  name={activeTab === 'pending' ? "people-outline" : "checkmark-circle"}
                  size={48}
                  color={Theme.colors.text.tertiary}
                />
                <Text style={styles.emptyText}>
                  {activeTab === 'pending'
                    ? 'No pending bookings'
                    : 'No processed bookings'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {activeTab === 'pending'
                    ? 'All bookings have been processed'
                    : 'Process some bookings to see them here'}
                </Text>
              </View>
            </Card>
          ) : (
            displayBookings.map((booking) => (
              <TouchableOpacity
                key={booking.id}
                onPress={() => handleBookingPress(booking)}
                activeOpacity={0.7}
              >
                <Card variant="elevated" style={styles.bookingCard}>
                  <View style={styles.bookingHeader}>
                    <View style={styles.bookingInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.bookingName}>{booking.names}</Text>
                        {booking.status && booking.status !== 'pending' && (
                          <Badge
                            variant={getStatusBadgeVariant(booking.status)}
                            size="sm"
                          >
                            {booking.status.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </View>
                      {booking.email && (
                        <View style={styles.contactRow}>
                          <Ionicons name="mail-outline" size={14} color={Theme.colors.text.secondary} />
                          <Text style={styles.contactText}>{booking.email}</Text>
                        </View>
                      )}
                      {booking.phone && (
                        <View style={styles.contactRow}>
                          <Ionicons name="call-outline" size={14} color={Theme.colors.text.secondary} />
                          <Text style={styles.contactText}>{booking.phone}</Text>
                        </View>
                      )}
                      <View style={styles.sourceRow}>
                        <Badge variant="info" size="sm">
                          {booking.source || booking.channel}
                        </Badge>
                      </View>
                    </View>
                    <View style={styles.bookingAction}>
                      {activeTab === 'processed' && (
                        <Ionicons name="create-outline" size={20} color={Theme.colors.text.secondary} style={{ marginRight: 8 }} />
                      )}
                      <Ionicons name="chevron-forward" size={24} color={Theme.colors.text.secondary} />
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Status Selection Modal */}
      <Modal
        visible={showStatusModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {activeTab === 'processed' ? 'Change Booking Status' : 'Mark Booking Status'}
            </Text>
            <Text style={styles.modalSubtitle}>{selectedBooking?.names}</Text>

            <TouchableOpacity
              style={[styles.statusOption, styles.statusSuccess]}
              onPress={() => handleStatusSelect('paid_dd')}
            >
              <Ionicons name="checkmark-circle" size={24} color={Theme.colors.status.success} />
              <Text style={styles.statusText}>Paid & Direct Debit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusOption, styles.statusInfo]}
              onPress={() => handleStatusSelect('paid_awaiting_dd')}
            >
              <Ionicons name="time-outline" size={24} color={Theme.colors.status.info} />
              <Text style={styles.statusText}>Paid, Awaiting Direct Debit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusOption, styles.statusWarning]}
              onPress={() => handleStatusSelect('unpaid_dd')}
            >
              <Ionicons name="card-outline" size={24} color={Theme.colors.status.warning} />
              <Text style={styles.statusText}>Unpaid, with Direct Debit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusOption, styles.statusWarning]}
              onPress={() => handleStatusSelect('unpaid_coach_call')}
            >
              <Ionicons name="call-outline" size={24} color={Theme.colors.status.warning} />
              <Text style={styles.statusText}>Unpaid, Coach to Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusOption, styles.statusError]}
              onPress={() => handleStatusSelect('not_joining')}
            >
              <Ionicons name="close-circle" size={24} color={Theme.colors.status.error} />
              <Text style={styles.statusText}>Not Joining</Text>
            </TouchableOpacity>

            <Button
              variant="secondary"
              onPress={() => setShowStatusModal(false)}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
          </View>
        </View>
      </Modal>

      {/* Kit Selection Modal */}
      <Modal
        visible={showKitModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowKitModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Kit Selection</Text>
            <Text style={styles.modalSubtitle}>{selectedBooking?.names}</Text>

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
                        <Ionicons name="trash-outline" size={18} color={Theme.colors.status.error} />
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

            <TouchableOpacity
              onPress={addKitItem}
              style={styles.addKitButtonNew}
            >
              <Ionicons name="add-circle" size={24} color={Theme.colors.primary} />
              <Text style={styles.addKitButtonText}>Add Kit Item</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <Button
                variant="primary"
                onPress={handleKitSubmit}
                style={styles.modalButton}
                disabled={kitItems.length === 0}
              >
                Confirm Kit Order
              </Button>
              <Button
                variant="secondary"
                onPress={() => setShowKitModal(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reminder Modal */}
      <Modal
        visible={showReminderModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReminderModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Call Reminder</Text>
            <Text style={styles.modalSubtitle}>{selectedBooking?.names}</Text>

            <Text style={styles.reminderLabel}>Remind me to call on:</Text>

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
                <Ionicons name="calendar-outline" size={20} color={Theme.colors.text.secondary} />
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
                <Ionicons name="time-outline" size={20} color={Theme.colors.text.secondary} />
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

            <View style={styles.modalButtons}>
              <Button
                variant="primary"
                onPress={handleReminderSubmit}
                style={styles.modalButton}
              >
                Set Reminder
              </Button>
              <Button
                variant="secondary"
                onPress={() => {
                  setShowReminderModal(false);
                  setShowDatePicker(false);
                  setShowTimePicker(false);
                }}
                style={styles.modalButton}
              >
                Cancel
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.background.secondary,
  },
  loadingText: {
    fontSize: Theme.typography.sizes.lg,
    color: Theme.colors.text.secondary,
    fontFamily: Theme.typography.fonts.regular,
  },
  content: {
    padding: Theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  backButton: {
    marginRight: Theme.spacing.md,
  },
  headerText: {
    flex: 1,
  },
  className: {
    fontSize: Theme.typography.sizes['2xl'],
    fontFamily: Theme.typography.fonts.bold,
    color: Theme.colors.text.primary,
  },
  classDetails: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
    marginTop: Theme.spacing.xs,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.xl,
    backgroundColor: Theme.colors.background.primary,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    alignItems: 'center',
    borderRadius: Theme.borderRadius.sm,
  },
  activeTab: {
    backgroundColor: Theme.colors.primary + '10',
  },
  tabText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.secondary,
  },
  activeTabText: {
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fonts.semibold,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.md,
  },
  bookingCard: {
    marginBottom: Theme.spacing.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
  },
  bookingName: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    marginTop: Theme.spacing.xs,
  },
  contactText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
  },
  sourceRow: {
    marginTop: Theme.spacing.sm,
  },
  bookingAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyCard: {
    marginBottom: Theme.spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
  },
  emptyText: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.secondary,
    marginTop: Theme.spacing.md,
  },
  emptySubtext: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.tertiary,
    marginTop: Theme.spacing.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Theme.colors.background.primary,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.xl,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
    marginBottom: Theme.spacing.xl,
    textAlign: 'center',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.background.secondary,
    gap: Theme.spacing.md,
  },
  statusSuccess: {
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.status.success,
  },
  statusInfo: {
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.status.info,
  },
  statusWarning: {
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.status.warning,
  },
  statusError: {
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.status.error,
  },
  statusText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.primary,
    flex: 1,
  },
  cancelButton: {
    marginTop: Theme.spacing.lg,
  },
  kitList: {
    maxHeight: 300,
    marginBottom: Theme.spacing.md,
  },
  kitItem: {
    backgroundColor: Theme.colors.background.secondary,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
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
    color: Theme.colors.text.primary,
  },
  removeButton: {
    padding: Theme.spacing.xs,
  },
  pickerContainer: {
    marginBottom: Theme.spacing.md,
  },
  pickerLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.secondary,
    marginBottom: Theme.spacing.xs,
  },
  noItemsText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.tertiary,
    textAlign: 'center',
    paddingVertical: Theme.spacing.xl,
  },
  addKitButtonNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    paddingVertical: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.background.secondary,
  },
  addKitButtonText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.primary,
  },
  modalButtons: {
    gap: Theme.spacing.sm,
  },
  modalButton: {
    marginTop: Theme.spacing.sm,
  },
  reminderLabel: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.secondary,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
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
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
  },
  dateTimeButtonText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.primary,
    flex: 1,
  },
});