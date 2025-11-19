import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Theme } from '@/constants/Theme';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { Input, Dropdown, Button, Card } from '@/components/ui';
import { ParticipantNameField } from './ParticipantNameField';
import { bookingsService } from '@/services/api/bookings.service';
import { useClubStore } from '@/store/clubStore';
import { classTimesService } from '@/services/api/classTimes.service';
import { ClassTime } from '@/types/api';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  withSpring,
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';

interface BookingCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface BookingFormData {
  email: string;
  phone: string;
  contact_name: string;
  club_id: string;
  class_time_id: string;
}

export const BookingCreationModal: React.FC<BookingCreationModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  // Form state
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<BookingFormData>({
    defaultValues: {
      email: '',
      phone: '',
      contact_name: '',
      club_id: '',
      class_time_id: '',
    },
  });

  // Watch club_id to filter class times
  const selectedClubId = watch('club_id');
  const selectedClassTimeId = watch('class_time_id');

  // Participant names state
  const [participantNames, setParticipantNames] = useState<string[]>(['']);
  const [nameErrors, setNameErrors] = useState<(string | undefined)[]>([undefined]);

  // Date/Time state
  const [bookingDate, setBookingDate] = useState<Date>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0); // Default to 10 AM
    return tomorrow;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Options state
  const [whatsappReminder, setWhatsappReminder] = useState(true);
  const [mailingListOptIn, setMailingListOptIn] = useState(false);

  // Data loading state
  const [isLoadingClassTimes, setIsLoadingClassTimes] = useState(false);
  const [classTimes, setClassTimes] = useState<ClassTime[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Clubs from store
  const { clubs, fetchClubs, isLoading: isLoadingClubs } = useClubStore();

  // Success animation
  const successScale = useSharedValue(0);
  const successAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
  }));

  /**
   * Calculate the next occurrence of a specific day of the week with a given time
   * @param dayOfWeek - Day name (e.g., "Monday", "Tuesday")
   * @param startTime - Time in HH:MM:SS format (e.g., "10:00:00")
   * @returns Date object for the next occurrence
   */
  const getNextOccurrence = (dayOfWeek: string, startTime: string): Date => {
    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const targetDay = dayMap[dayOfWeek.toLowerCase()];
    const now = new Date();
    const currentDay = now.getDay();

    // Calculate days until target day
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) {
      daysUntil += 7; // Next week if day has passed or is today
    }

    // Create the next occurrence date
    const nextDate = new Date(now);
    nextDate.setDate(now.getDate() + daysUntil);

    // Parse and set the time from start_time (HH:MM:SS)
    const [hours, minutes] = startTime.split(':').map(Number);
    nextDate.setHours(hours, minutes, 0, 0);

    return nextDate;
  };

  // Load clubs on mount
  useEffect(() => {
    if (visible && clubs.length === 0) {
      fetchClubs();
    }
  }, [visible]);

  // Load class times when club is selected
  useEffect(() => {
    if (selectedClubId) {
      loadClassTimes(Number(selectedClubId));
    } else {
      setClassTimes([]);
    }
  }, [selectedClubId]);

  // Update booking date when class time is selected
  useEffect(() => {
    if (selectedClassTimeId && classTimes.length > 0) {
      const selectedClassTime = classTimes.find((ct) => ct.id === Number(selectedClassTimeId));

      if (selectedClassTime) {
        // Calculate next occurrence of this class
        const nextDate = getNextOccurrence(selectedClassTime.day, selectedClassTime.start_time);
        setBookingDate(nextDate);
      }
    }
  }, [selectedClassTimeId, classTimes]);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      reset();
      setParticipantNames(['']);
      setNameErrors([undefined]);
      setWhatsappReminder(true);
      setMailingListOptIn(false);
      setShowSuccess(false);
      successScale.value = 0;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      setBookingDate(tomorrow);
    }
  }, [visible]);

  const loadClassTimes = async (clubId: number) => {
    try {
      setIsLoadingClassTimes(true);
      const times = await classTimesService.getClassTimes({ club_id: clubId });
      setClassTimes(times);
    } catch (error) {
      console.error('Failed to load class times:', error);
      Alert.alert('Error', 'Failed to load class times. Please try again.');
    } finally {
      setIsLoadingClassTimes(false);
    }
  };

  const handleAddName = () => {
    if (participantNames.length < 5) {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setParticipantNames([...participantNames, '']);
      setNameErrors([...nameErrors, undefined]);
    }
  };

  const handleRemoveName = (index: number) => {
    if (participantNames.length > 1) {
      const newNames = participantNames.filter((_, i) => i !== index);
      const newErrors = nameErrors.filter((_, i) => i !== index);
      setParticipantNames(newNames);
      setNameErrors(newErrors);
    }
  };

  const handleNameChange = (index: number, value: string) => {
    const newNames = [...participantNames];
    newNames[index] = value;
    setParticipantNames(newNames);

    // Clear error when user starts typing
    const newErrors = [...nameErrors];
    newErrors[index] = undefined;
    setNameErrors(newErrors);
  };

  const validateNames = (): boolean => {
    const newErrors: (string | undefined)[] = [];
    let isValid = true;

    participantNames.forEach((name, index) => {
      if (!name || name.trim().length === 0) {
        newErrors[index] = 'Name is required';
        isValid = false;
      } else if (name.trim().length > 100) {
        newErrors[index] = 'Name too long (max 100 characters)';
        isValid = false;
      } else {
        newErrors[index] = undefined;
      }
    });

    setNameErrors(newErrors);
    return isValid;
  };

  const onSubmit = async (data: BookingFormData) => {
    // Validate names first
    if (!validateNames()) {
      Alert.alert('Validation Error', 'Please check all participant names.');
      return;
    }

    // Validate date is in the future
    const now = new Date();
    if (bookingDate <= now) {
      Alert.alert('Invalid Date', 'Booking date must be in the future.');
      return;
    }

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      setIsSubmitting(true);

      // Format datetime to ISO 8601
      const datetimeISO = bookingDate.toISOString();

      // Create booking
      await bookingsService.createBooking({
        class_id: Number(data.class_time_id),
        datetime: datetimeISO,
        phone: data.phone,
        email: data.email,
        names: participantNames.map((name) => name.trim()),
        whatsapp_reminder: whatsappReminder,
        mailing_list_opt_in: mailingListOptIn,
        contact_name: mailingListOptIn && data.contact_name ? data.contact_name : undefined,
      });

      // Show success animation
      setShowSuccess(true);
      successScale.value = withSpring(1, {
        damping: 12,
        stiffness: 150,
      });

      // Wait for animation, then call success callback
      setTimeout(() => {
        onSuccess();
      }, 800);
    } catch (error: any) {
      console.error('Failed to create booking:', error);
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to create booking. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (date: Date): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    let dateStr = '';
    if (isToday) {
      dateStr = 'Today';
    } else if (isTomorrow) {
      dateStr = 'Tomorrow';
    } else {
      dateStr = date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }

    const timeStr = date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${dateStr} at ${timeStr}`;
  };

  const clubOptions = clubs.map((club) => ({
    label: club.name,
    value: club.id.toString(),
  }));

  const classTimeOptions = classTimes.map((ct) => ({
    label: `${ct.name || ''} • ${ct.day} • ${ct.start_time}`,
    value: ct.id.toString(),
  }));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={[styles.container, { backgroundColor: palette.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create Trial Booking</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={28} color={palette.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Participant Details Section */}
            <Animated.View entering={FadeInDown.delay(100).duration(300)}>
              <Card variant="elevated" style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="person" size={20} color={palette.tint} />
                  <Text style={styles.sectionTitle}>Participant Details</Text>
                </View>

                {/* Names */}
                {participantNames.map((name, index) => (
                  <ParticipantNameField
                    key={index}
                    index={index}
                    value={name}
                    onChangeText={(value) => handleNameChange(index, value)}
                    onRemove={() => handleRemoveName(index)}
                    canRemove={participantNames.length > 1}
                    error={nameErrors[index]}
                  />
                ))}

                {participantNames.length < 5 ? (
                  <TouchableOpacity onPress={handleAddName} style={styles.addButton}>
                    <Ionicons name="add-circle-outline" size={20} color={palette.tint} />
                    <Text style={styles.addButtonText}>Add Another Participant</Text>
                  </TouchableOpacity>
                ) : null}

                {/* Email */}
                <Controller
                  control={control}
                  name="email"
                  rules={{
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Email"
                      placeholder="email@example.com"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.email?.message}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      leftIcon="mail"
                    />
                  )}
                />

                {/* Phone */}
                <Controller
                  control={control}
                  name="phone"
                  rules={{
                    required: 'Phone number is required',
                    minLength: {
                      value: 10,
                      message: 'Phone number must be at least 10 digits',
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Phone"
                      placeholder="+44 7123 456789"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.phone?.message}
                      keyboardType="phone-pad"
                      leftIcon="call"
                    />
                  )}
                />

                {/* Contact Name (conditional) */}
                {mailingListOptIn ? (
                  <Animated.View entering={FadeIn.duration(200)}>
                    <Controller
                      control={control}
                      name="contact_name"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                          label="Contact Name (optional)"
                          placeholder="Name for mailing list"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          helperText="If different from participant name"
                          autoCapitalize="words"
                        />
                      )}
                    />
                  </Animated.View>
                ) : null}
              </Card>
            </Animated.View>

            {/* Class & Location Section */}
            <Animated.View entering={FadeInDown.delay(200).duration(300)}>
              <Card variant="elevated" style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="business" size={20} color={palette.tint} />
                  <Text style={styles.sectionTitle}>Class & Location</Text>
                </View>

                {/* Club Selection */}
                <Controller
                  control={control}
                  name="club_id"
                  rules={{ required: 'Please select a club' }}
                  render={({ field: { onChange, value } }) => (
                    <Dropdown
                      label="Club"
                      value={value}
                      options={clubOptions}
                      onValueChange={onChange}
                      placeholder="Select a club"
                      disabled={isLoadingClubs}
                      error={errors.club_id?.message}
                    />
                  )}
                />

                {/* Class Time Selection */}
                <Controller
                  control={control}
                  name="class_time_id"
                  rules={{ required: 'Please select a class time' }}
                  render={({ field: { onChange, value } }) => (
                    <Dropdown
                      label="Class Time"
                      value={value}
                      options={classTimeOptions}
                      onValueChange={onChange}
                      placeholder={selectedClubId ? 'Select a class time' : 'Select a club first'}
                      disabled={!selectedClubId || isLoadingClassTimes}
                      error={errors.class_time_id?.message}
                    />
                  )}
                />
              </Card>
            </Animated.View>

            {/* Date & Time Section */}
            <Animated.View entering={FadeInDown.delay(300).duration(300)}>
              <Card variant="elevated" style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="calendar" size={20} color={palette.tint} />
                  <Text style={styles.sectionTitle}>Date & Time</Text>
                </View>

                <View style={styles.dateTimeContainer}>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => {
                      if (Platform.OS === 'ios') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setShowTimePicker(false);
                      setShowDatePicker(true);
                    }}
                  >
                    <Ionicons name="calendar-outline" size={20} color={palette.tint} />
                    <Text style={styles.dateTimeButtonText}>
                      {bookingDate.toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => {
                      if (Platform.OS === 'ios') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setShowDatePicker(false);
                      setShowTimePicker(true);
                    }}
                  >
                    <Ionicons name="time-outline" size={20} color={palette.tint} />
                    <Text style={styles.dateTimeButtonText}>
                      {bookingDate.toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.dateTimePreview}>
                  <Ionicons name="information-circle-outline" size={16} color={palette.textSecondary} />
                  <Text style={styles.dateTimePreviewText}>{formatDateTime(bookingDate)}</Text>
                </View>
              </Card>
            </Animated.View>

            {/* Options Section */}
            <Animated.View entering={FadeInDown.delay(400).duration(300)}>
              <Card variant="elevated" style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="settings" size={20} color={palette.tint} />
                  <Text style={styles.sectionTitle}>Options</Text>
                </View>

                {/* WhatsApp Reminder */}
                <View style={styles.optionRow}>
                  <View style={styles.optionLabel}>
                    <Ionicons name="logo-whatsapp" size={20} color={palette.statusSuccess} />
                    <Text style={styles.optionText}>Send WhatsApp reminder</Text>
                  </View>
                  <Switch
                    value={whatsappReminder}
                    onValueChange={(value) => {
                      if (Platform.OS === 'ios') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setWhatsappReminder(value);
                    }}
                    trackColor={{ false: palette.borderDefault, true: palette.statusSuccess + '60' }}
                    thumbColor={whatsappReminder ? palette.statusSuccess : palette.background}
                  />
                </View>

                {/* Mailing List Opt-in */}
                <View style={styles.optionRow}>
                  <View style={styles.optionLabel}>
                    <Ionicons name="mail" size={20} color={palette.statusInfo} />
                    <Text style={styles.optionText}>Add to mailing list</Text>
                  </View>
                  <Switch
                    value={mailingListOptIn}
                    onValueChange={(value) => {
                      if (Platform.OS === 'ios') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setMailingListOptIn(value);
                    }}
                    trackColor={{ false: palette.borderDefault, true: palette.statusInfo + '60' }}
                    thumbColor={mailingListOptIn ? palette.statusInfo : palette.background}
                  />
                </View>
              </Card>
            </Animated.View>
          </ScrollView>

          {/* Footer with Submit Button */}
          <View style={styles.footer}>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Booking...' : 'Create Booking'}
            </Button>
          </View>

          {/* Success Overlay */}
          {showSuccess ? (
            <View style={styles.successOverlay}>
              <Animated.View style={[styles.successIcon, successAnimatedStyle]}>
                <Ionicons name="checkmark-circle" size={80} color={palette.statusSuccess} />
              </Animated.View>
              <Text style={styles.successText}>Booking Created!</Text>
            </View>
          ) : null}

          {/* iOS Date Picker */}
          {Platform.OS === 'ios' && showDatePicker ? (
            <Modal transparent visible={showDatePicker} animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
              <View style={styles.pickerOverlay}>
                <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
                  <View style={styles.pickerBackdrop} />
                </TouchableWithoutFeedback>
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.pickerButton}>
                      <Text style={styles.pickerButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerTitle}>Select Date</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setShowDatePicker(false);
                      }}
                      style={styles.pickerButton}
                    >
                      <Text style={[styles.pickerButtonText, { color: palette.tint }]}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={bookingDate}
                    mode="date"
                    display="spinner"
                    minimumDate={new Date()}
                    onChange={(_event, selectedDate) => {
                      if (selectedDate) {
                        const newDate = new Date(bookingDate);
                        newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                        setBookingDate(newDate);
                      }
                    }}
                  />
                </View>
              </View>
            </Modal>
          ) : null}

          {/* iOS Time Picker */}
          {Platform.OS === 'ios' && showTimePicker ? (
            <Modal transparent visible={showTimePicker} animationType="slide" onRequestClose={() => setShowTimePicker(false)}>
              <View style={styles.pickerOverlay}>
                <TouchableWithoutFeedback onPress={() => setShowTimePicker(false)}>
                  <View style={styles.pickerBackdrop} />
                </TouchableWithoutFeedback>
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.pickerButton}>
                      <Text style={styles.pickerButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerTitle}>Select Time</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setShowTimePicker(false);
                      }}
                      style={styles.pickerButton}
                    >
                      <Text style={[styles.pickerButtonText, { color: palette.tint }]}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={bookingDate}
                    mode="time"
                    display="spinner"
                    onChange={(_event, selectedDate) => {
                      if (selectedDate) {
                        const newDate = new Date(bookingDate);
                        newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
                        setBookingDate(newDate);
                      }
                    }}
                  />
                </View>
              </View>
            </Modal>
          ) : null}

          {/* Android Date Picker */}
          {Platform.OS === 'android' && showDatePicker ? (
            <DateTimePicker
              value={bookingDate}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (event.type === 'set' && selectedDate) {
                  const newDate = new Date(bookingDate);
                  newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                  setBookingDate(newDate);
                }
              }}
            />
          ) : null}

          {/* Android Time Picker */}
          {Platform.OS === 'android' && showTimePicker ? (
            <DateTimePicker
              value={bookingDate}
              mode="time"
              display="default"
              onChange={(event, selectedDate) => {
                setShowTimePicker(false);
                if (event.type === 'set' && selectedDate) {
                  const newDate = new Date(bookingDate);
                  newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
                  setBookingDate(newDate);
                }
              }}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Theme.spacing.xl,
      paddingTop: Platform.OS === 'ios' ? Theme.spacing['2xl'] : Theme.spacing.xl,
      paddingBottom: Theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderLight,
      backgroundColor: palette.background,
    },
    headerTitle: {
      fontSize: Theme.typography.sizes.xl,
      fontFamily: Theme.typography.fonts.bold,
      color: palette.textPrimary,
    },
    closeButton: {
      padding: Theme.spacing.xs,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: Theme.spacing.xl,
      paddingBottom: Theme.spacing['2xl'],
    },
    section: {
      marginBottom: Theme.spacing.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.sm,
      marginBottom: Theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: Theme.typography.sizes.lg,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.sm,
      paddingVertical: Theme.spacing.md,
      paddingHorizontal: Theme.spacing.lg,
      borderRadius: Theme.borderRadius.md,
      borderWidth: 1.5,
      borderColor: palette.tint,
      borderStyle: 'dashed',
      backgroundColor: palette.tint + '08',
      marginBottom: Theme.spacing.md,
    },
    addButtonText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.tint,
    },
    dateTimeContainer: {
      flexDirection: 'row',
      gap: Theme.spacing.md,
      marginBottom: Theme.spacing.md,
    },
    dateTimeButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.sm,
      paddingVertical: Theme.spacing.md,
      paddingHorizontal: Theme.spacing.lg,
      borderRadius: Theme.borderRadius.md,
      borderWidth: 1,
      borderColor: palette.borderDefault,
      backgroundColor: palette.background,
      minHeight: 48,
    },
    dateTimeButtonText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textPrimary,
      flex: 1,
    },
    dateTimePreview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.xs,
      paddingVertical: Theme.spacing.sm,
      paddingHorizontal: Theme.spacing.md,
      borderRadius: Theme.borderRadius.md,
      backgroundColor: palette.backgroundSecondary,
    },
    dateTimePreviewText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
    },
    optionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderLight,
    },
    optionLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.md,
      flex: 1,
    },
    optionText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textPrimary,
    },
    footer: {
      padding: Theme.spacing.xl,
      paddingBottom: Platform.OS === 'ios' ? Theme.spacing.xl + 20 : Theme.spacing.xl,
      borderTopWidth: 1,
      borderTopColor: palette.borderLight,
      backgroundColor: palette.background,
    },
    successOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: palette.background + 'F5',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999,
    },
    successIcon: {
      marginBottom: Theme.spacing.lg,
    },
    successText: {
      fontSize: Theme.typography.sizes.xl,
      fontFamily: Theme.typography.fonts.bold,
      color: palette.statusSuccess,
    },
    pickerOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    pickerBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    pickerContainer: {
      backgroundColor: palette.background,
      borderTopLeftRadius: Theme.borderRadius.xl,
      borderTopRightRadius: Theme.borderRadius.xl,
      paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    },
    pickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Theme.spacing.xl,
      paddingVertical: Theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderLight,
    },
    pickerTitle: {
      fontSize: Theme.typography.sizes.lg,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
    },
    pickerButton: {
      padding: Theme.spacing.sm,
      minWidth: 60,
    },
    pickerButtonText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textSecondary,
    },
  });
