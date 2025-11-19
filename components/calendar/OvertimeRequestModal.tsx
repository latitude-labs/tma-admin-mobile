import { Button } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { Dropdown, DropdownOption } from '@/components/ui/Dropdown';
import { Theme } from '@/constants/Theme';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { calendarSyncService } from '@/services/calendarSync.service';
import { useCalendarStore } from '@/store/calendarStore';
import { DayOfWeek, TimePreference, OvertimeType } from '@/types/calendar';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, addDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { clubsService } from '@/services/api/clubs.service';
import { Club } from '@/types/api';

interface OvertimeRequestModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit?: () => void;
}

const DAYS_OF_WEEK: { value: DayOfWeek; label: string; short: string }[] = [
  { value: 'monday', label: 'Monday', short: 'Mon' },
  { value: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { value: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { value: 'thursday', label: 'Thursday', short: 'Thu' },
  { value: 'friday', label: 'Friday', short: 'Fri' },
  { value: 'saturday', label: 'Saturday', short: 'Sat' },
  { value: 'sunday', label: 'Sunday', short: 'Sun' },
];

const TIME_PREFERENCES: { value: TimePreference; label: string; icon: string }[] = [
  { value: 'morning', label: 'Morning', icon: 'sunny' },
  { value: 'afternoon', label: 'Afternoon', icon: 'partly-sunny' },
  { value: 'evening', label: 'Evening', icon: 'moon' },
];

export const OvertimeRequestModal: React.FC<OvertimeRequestModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const { overtimeRequestDraft, setOvertimeRequestDraft } = useCalendarStore();

  // Request type
  const [requestType, setRequestType] = useState<OvertimeType>('one_time');

  // One-time fields
  const [startDate, setStartDate] = useState<Date | null>(
    overtimeRequestDraft?.startDate || null
  );
  const [endDate, setEndDate] = useState<Date | null>(
    overtimeRequestDraft?.endDate || null
  );

  // Recurring fields
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek | null>(
    (overtimeRequestDraft?.dayOfWeek as DayOfWeek) || null
  );
  const [durationWeeks, setDurationWeeks] = useState<string>(
    overtimeRequestDraft?.durationWeeks?.toString() || '4'
  );

  // Common fields
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [timePreference, setTimePreference] = useState<TimePreference | null>(
    (overtimeRequestDraft?.timePreference as TimePreference) || null
  );
  const [notes, setNotes] = useState(overtimeRequestDraft?.notes || '');

  // UI state
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const scale = useSharedValue(1);

  const animatedModalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Load clubs on mount
  useEffect(() => {
    if (visible) {
      loadClubs();
    }
  }, [visible]);

  const loadClubs = async () => {
    try {
      // Fetch all clubs regardless of user's assigned clubs
      const clubsList = await clubsService.getClubs(true);
      setClubs(clubsList);
      // Set initial club if there's a draft
      if (overtimeRequestDraft?.preferredClubId) {
        const club = clubsList.find(c => c.id === overtimeRequestDraft.preferredClubId);
        if (club) setSelectedClub(club);
      }
    } catch (error) {
      console.error('Failed to load clubs:', error);
    }
  };

  const handleRequestTypeChange = useCallback((type: OvertimeType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRequestType(type);
  }, []);

  const handleDaySelect = useCallback((day: DayOfWeek) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDayOfWeek(day);
  }, []);

  const handleTimePreferenceSelect = useCallback((pref: TimePreference) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimePreference(pref);
  }, []);

  const handleClubSelect = useCallback((clubId: string) => {
    const club = clubs.find(c => c.id === parseInt(clubId));
    if (club) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedClub(club);
    }
  }, [clubs]);

  const handleSubmit = useCallback(async () => {
    // Validation
    if (requestType === 'one_time') {
      if (!startDate || !endDate) {
        toast.error('Please select both start and end dates');
        return;
      }
      if (startDate > endDate) {
        toast.error('End date must be after start date');
        return;
      }
    } else {
      if (!dayOfWeek) {
        toast.error('Please select a day of the week');
        return;
      }
      const weeks = parseInt(durationWeeks);
      if (!weeks || weeks < 1 || weeks > 52) {
        toast.error('Duration must be between 1 and 52 weeks');
        return;
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);

    try {
      const requestData: any = {
        type: requestType,
        notes: notes.trim() || undefined,
        preferred_club_id: selectedClub?.id || undefined,
        time_preference: timePreference || undefined,
      };

      if (requestType === 'one_time') {
        requestData.start_date = startDate ? format(startDate, 'yyyy-MM-dd') : undefined;
        requestData.end_date = endDate ? format(endDate, 'yyyy-MM-dd') : undefined;
      } else {
        requestData.day_of_week = dayOfWeek;
        requestData.duration_weeks = parseInt(durationWeeks);
      }

      await calendarSyncService.submitOvertimeRequest(requestData);

      // Clear draft
      setOvertimeRequestDraft(null);

      // Success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Close modal first
      onClose();

      // Show success toast after modal closes
      setTimeout(() => {
        toast.success('Overtime request submitted successfully!');
        onSubmit?.();
      }, 300);
    } catch (error) {
      let errorMessage = 'Failed to submit overtime request';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, 5000);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    requestType,
    startDate,
    endDate,
    dayOfWeek,
    durationWeeks,
    selectedClub,
    timePreference,
    notes,
    onSubmit,
    onClose,
  ]);

  const handleClose = useCallback(() => {
    // Save draft
    setOvertimeRequestDraft({
      type: requestType,
      startDate,
      endDate,
      dayOfWeek,
      durationWeeks: durationWeeks ? parseInt(durationWeeks) : undefined,
      preferredClubId: selectedClub?.id,
      timePreference,
      notes,
    });
    onClose();
  }, [
    requestType,
    startDate,
    endDate,
    dayOfWeek,
    durationWeeks,
    selectedClub,
    timePreference,
    notes,
    onClose,
  ]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={styles.overlay}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <Animated.View
            entering={SlideInDown.springify()}
            exiting={SlideOutDown.springify()}
            style={[styles.modal, animatedModalStyle]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Request Overtime</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={palette.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Request Type Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Request Type</Text>
                <View style={styles.typeRow}>
                  <TouchableOpacity
                    style={[
                      styles.typeCard,
                      requestType === 'one_time' && styles.typeCardActive,
                    ]}
                    onPress={() => handleRequestTypeChange('one_time')}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={requestType === 'one_time' ? palette.textInverse : palette.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeText,
                        requestType === 'one_time' && styles.typeTextActive,
                      ]}
                    >
                      One-time
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeCard,
                      requestType === 'recurring' && styles.typeCardActive,
                    ]}
                    onPress={() => handleRequestTypeChange('recurring')}
                  >
                    <Ionicons
                      name="sync-outline"
                      size={20}
                      color={requestType === 'recurring' ? palette.textInverse : palette.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeText,
                        requestType === 'recurring' && styles.typeTextActive,
                      ]}
                    >
                      Recurring
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Date Selection for One-Time */}
              {requestType === 'one_time' && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Dates</Text>
                  <View style={styles.dateRow}>
                    <View style={styles.dateContainer}>
                      <Text style={styles.dateLabel}>From</Text>
                      <TouchableOpacity
                        style={styles.dateDisplay}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setShowEndPicker(false);
                          setShowStartPicker(true);
                        }}
                      >
                        <Ionicons name="calendar-outline" size={16} color={palette.tint} />
                        <Text style={styles.dateText}>
                          {startDate ? format(startDate, 'MMM dd, yyyy') : 'Select date'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.dateSeparator}>
                      <Ionicons name="arrow-forward" size={16} color={palette.textTertiary} />
                    </View>
                    <View style={styles.dateContainer}>
                      <Text style={styles.dateLabel}>To</Text>
                      <TouchableOpacity
                        style={styles.dateDisplay}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setShowStartPicker(false);
                          setShowEndPicker(true);
                        }}
                      >
                        <Ionicons name="calendar-outline" size={16} color={palette.tint} />
                        <Text style={styles.dateText}>
                          {endDate ? format(endDate, 'MMM dd, yyyy') : 'Select date'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* Day and Duration for Recurring */}
              {requestType === 'recurring' && (
                <>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Day of the Week</Text>
                    <View style={styles.daysGrid}>
                      {DAYS_OF_WEEK.map((day) => (
                        <TouchableOpacity
                          key={day.value}
                          style={[
                            styles.dayCard,
                            dayOfWeek === day.value && styles.dayCardActive,
                          ]}
                          onPress={() => handleDaySelect(day.value)}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              dayOfWeek === day.value && styles.dayTextActive,
                            ]}
                          >
                            {day.short}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Duration (weeks)</Text>
                    <TextInput
                      style={styles.input}
                      value={durationWeeks}
                      onChangeText={setDurationWeeks}
                      placeholder="Number of weeks (1-52)"
                      placeholderTextColor={palette.textTertiary}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                </>
              )}

              {/* Preferred Club */}
              <View style={styles.section}>
                <Dropdown
                  label="Preferred Club (Optional)"
                  value={selectedClub?.id?.toString() || ''}
                  options={clubs.map(club => ({
                    label: club.name,
                    value: club.id.toString(),
                  }))}
                  onValueChange={handleClubSelect}
                  placeholder="Select a club"
                />
              </View>

              {/* Notes */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add any additional information..."
                  placeholderTextColor={palette.textTertiary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                />
                <Text style={styles.charCount}>{notes.length}/500</Text>
              </View>

              {/* Info */}
              <View style={styles.infoContainer}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={palette.statusInfo}
                />
                <Text style={styles.infoText}>
                  Your overtime request will be sent to an admin for approval. You'll be notified
                  once it's been reviewed.
                </Text>
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.actions}>
              <Button
                variant="outline"
                onPress={handleClose}
                style={styles.actionButton}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onPress={handleSubmit}
                loading={isSubmitting}
                disabled={isSubmitting}
                style={styles.actionButton}
              >
                Submit Request
              </Button>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>

      {/* iOS Date Pickers */}
      {Platform.OS === 'ios' && showStartPicker && (
        <Modal
          transparent
          visible={showStartPicker}
          animationType="slide"
          onRequestClose={() => setShowStartPicker(false)}
        >
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity
                  onPress={() => setShowStartPicker(false)}
                  style={styles.datePickerButton}
                >
                  <Text style={styles.datePickerButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Select Start Date</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowStartPicker(false);
                    if (!startDate) {
                      setStartDate(new Date());
                    }
                  }}
                  style={styles.datePickerButton}
                >
                  <Text style={[styles.datePickerButtonText, { color: palette.tint }]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={startDate || new Date()}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setStartDate(selectedDate);
                    if (endDate && selectedDate > endDate) {
                      setEndDate(selectedDate);
                    }
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'ios' && showEndPicker && (
        <Modal
          transparent
          visible={showEndPicker}
          animationType="slide"
          onRequestClose={() => setShowEndPicker(false)}
        >
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity
                  onPress={() => setShowEndPicker(false)}
                  style={styles.datePickerButton}
                >
                  <Text style={styles.datePickerButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Select End Date</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowEndPicker(false);
                    if (!endDate) {
                      setEndDate(startDate || new Date());
                    }
                  }}
                  style={styles.datePickerButton}
                >
                  <Text style={[styles.datePickerButtonText, { color: palette.tint }]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={endDate || startDate || new Date()}
                mode="date"
                display="spinner"
                minimumDate={startDate || undefined}
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setEndDate(selectedDate);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android Date Pickers */}
      {Platform.OS === 'android' && showStartPicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowStartPicker(false);
            if (event.type === 'set' && selectedDate) {
              setStartDate(selectedDate);
              if (endDate && selectedDate > endDate) {
                setEndDate(selectedDate);
              }
            }
          }}
        />
      )}

      {Platform.OS === 'android' && showEndPicker && (
        <DateTimePicker
          value={endDate || startDate || new Date()}
          mode="date"
          display="default"
          minimumDate={startDate || undefined}
          onChange={(event, selectedDate) => {
            setShowEndPicker(false);
            if (event.type === 'set' && selectedDate) {
              setEndDate(selectedDate);
            }
          }}
        />
      )}
    </Modal>
  );
};

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    keyboardView: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: palette.background,
      borderTopLeftRadius: Theme.borderRadius.xl,
      borderTopRightRadius: Theme.borderRadius.xl,
      maxHeight: '90%',
      ...Theme.shadows.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderLight,
    },
    title: {
      fontSize: Theme.typography.sizes.lg,
      fontFamily: Theme.typography.fonts.bold,
      color: palette.textPrimary,
    },
    closeButton: {
      padding: Theme.spacing.sm,
    },
    content: {
      padding: Theme.spacing.lg,
    },
    section: {
      marginBottom: Theme.spacing.xl,
    },
    sectionTitle: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
      marginBottom: Theme.spacing.md,
    },
    typeRow: {
      flexDirection: 'row',
      gap: Theme.spacing.md,
    },
    typeCard: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Theme.spacing.sm,
      padding: Theme.spacing.md,
      backgroundColor: palette.backgroundSecondary,
      borderRadius: Theme.borderRadius.md,
      borderWidth: 1,
      borderColor: palette.borderLight,
    },
    typeCardActive: {
      backgroundColor: palette.tint,
      borderColor: palette.tint,
    },
    typeText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textSecondary,
    },
    typeTextActive: {
      color: palette.textInverse,
    },
    quickSelectRow: {
      flexDirection: 'row',
      gap: Theme.spacing.sm,
      marginBottom: Theme.spacing.md,
    },
    quickSelectChip: {
      paddingHorizontal: Theme.spacing.md,
      paddingVertical: Theme.spacing.sm,
      backgroundColor: palette.backgroundSecondary,
      borderRadius: Theme.borderRadius.full || 999,
      borderWidth: 1,
      borderColor: palette.borderLight,
    },
    quickSelectText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textPrimary,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.sm,
    },
    dateContainer: {
      flex: 1,
    },
    dateSeparator: {
      paddingTop: 20,
    },
    dateLabel: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textSecondary,
      marginBottom: Theme.spacing.xs,
    },
    dateDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.sm,
      padding: Theme.spacing.md,
      backgroundColor: palette.backgroundSecondary,
      borderRadius: Theme.borderRadius.md,
      borderWidth: 1,
      borderColor: palette.borderLight,
    },
    dateText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textPrimary,
      flex: 1,
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Theme.spacing.xs,
    },
    dayCard: {
      width: 44,
      height: 44,
      backgroundColor: palette.backgroundSecondary,
      borderRadius: Theme.borderRadius.md,
      borderWidth: 1,
      borderColor: palette.borderLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayCardActive: {
      backgroundColor: palette.tint,
      borderColor: palette.tint,
    },
    dayText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textSecondary,
    },
    dayTextActive: {
      color: palette.textInverse,
    },
    input: {
      padding: Theme.spacing.md,
      backgroundColor: palette.backgroundSecondary,
      borderRadius: Theme.borderRadius.md,
      borderWidth: 1,
      borderColor: palette.borderLight,
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textPrimary,
    },
    timeGrid: {
      flexDirection: 'row',
      gap: Theme.spacing.sm,
    },
    timeCard: {
      flex: 1,
      alignItems: 'center',
      gap: Theme.spacing.xs,
      padding: Theme.spacing.md,
      backgroundColor: palette.backgroundSecondary,
      borderRadius: Theme.borderRadius.md,
      borderWidth: 1,
      borderColor: palette.borderLight,
    },
    timeCardActive: {
      backgroundColor: palette.tint,
      borderColor: palette.tint,
    },
    timeText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textSecondary,
    },
    timeTextActive: {
      color: palette.textInverse,
    },
    notesInput: {
      padding: Theme.spacing.md,
      backgroundColor: palette.backgroundSecondary,
      borderRadius: Theme.borderRadius.md,
      borderWidth: 1,
      borderColor: palette.borderLight,
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textPrimary,
      minHeight: 100,
    },
    charCount: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textTertiary,
      textAlign: 'right',
      marginTop: Theme.spacing.xs,
    },
    infoContainer: {
      flexDirection: 'row',
      gap: Theme.spacing.sm,
      padding: Theme.spacing.md,
      backgroundColor: `${palette.statusInfo}10`,
      borderRadius: Theme.borderRadius.md,
      marginBottom: Theme.spacing.lg,
    },
    infoText: {
      flex: 1,
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.statusInfo,
      lineHeight: 18,
    },
    actions: {
      flexDirection: 'row',
      gap: Theme.spacing.md,
      padding: Theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: palette.borderLight,
    },
    actionButton: {
      flex: 1,
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