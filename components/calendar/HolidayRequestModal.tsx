import { Button } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { Theme } from '@/constants/Theme';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { calendarSyncService } from '@/services/calendarSync.service';
import { useCalendarStore } from '@/store/calendarStore';
import { HolidayReason } from '@/types/calendar';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { differenceInDays, format, addDays, startOfWeek, isWeekend } from 'date-fns';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
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

interface HolidayRequestModalProps {
  visible: boolean;
  onClose: () => void;
  startDate?: Date;
  endDate?: Date;
  onSubmit?: () => void;
}

const HOLIDAY_REASONS: { value: HolidayReason; label: string; icon: string }[] = [
  { value: 'holiday', label: 'Holiday', icon: 'airplane' },
  { value: 'sick', label: 'Sick Leave', icon: 'medical' },
  { value: 'personal', label: 'Personal', icon: 'person' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

export const HolidayRequestModal: React.FC<HolidayRequestModalProps> = ({
  visible,
  onClose,
  startDate: propStartDate,
  endDate: propEndDate,
  onSubmit,
}) => {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const { holidayRequestDraft, setHolidayRequestDraft } = useCalendarStore();

  const [startDate, setStartDate] = useState<Date | null>(propStartDate || holidayRequestDraft?.start || null);
  const [endDate, setEndDate] = useState<Date | null>(propEndDate || holidayRequestDraft?.end || null);
  const [reason, setReason] = useState<HolidayReason>(holidayRequestDraft?.reason as HolidayReason || 'holiday');
  const [notes, setNotes] = useState(holidayRequestDraft?.notes || '');
  const [hasCoverArranged, setHasCoverArranged] = useState(holidayRequestDraft?.hasCoverArranged || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const scale = useSharedValue(1);

  const animatedModalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleReasonSelect = useCallback((selectedReason: HolidayReason) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReason(selectedReason);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    if (startDate > endDate) {
      toast.error('End date must be after start date');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);

    try {
      // If cover is arranged, prepend helper information to notes
      const finalNotes = hasCoverArranged && notes.trim()
        ? `Cover arranged: ${notes.trim()}`
        : notes.trim() || undefined;

      await calendarSyncService.submitHolidayRequest({
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        reason,
        notes: finalNotes,
        has_cover_arranged: hasCoverArranged,
      });

      // Clear draft
      setHolidayRequestDraft(null);

      // Success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Close modal first
      onClose();

      // Show success toast after modal closes
      setTimeout(() => {
        toast.success('Holiday request submitted successfully!');
        onSubmit?.();
      }, 300);
    } catch (error) {
      let errorMessage = 'Failed to submit holiday request';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, 5000);
    } finally {
      setIsSubmitting(false);
    }
  }, [startDate, endDate, reason, notes, onSubmit, onClose]);

  const handleClose = useCallback(() => {
    // Save draft
    if (startDate || endDate) {
      setHolidayRequestDraft({
        start: startDate,
        end: endDate,
        reason,
        notes,
        hasCoverArranged,
      });
    }
    onClose();
  }, [startDate, endDate, reason, notes, hasCoverArranged, onClose]);

  const dayCount = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return differenceInDays(endDate, startDate) + 1;
  }, [startDate, endDate]);

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
              <Text style={styles.title}>Request Holiday</Text>
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
              {/* Date Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Dates</Text>
                <View style={styles.dateRow}>
                  <View style={styles.dateContainer}>
                    <Text style={styles.dateLabel}>From</Text>
                    <TouchableOpacity
                      style={styles.dateDisplay}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowEndPicker(false); // Close end picker if open
                        setShowStartPicker(true);
                      }}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={palette.tint}
                      />
                      <Text style={styles.dateText}>
                        {startDate ? format(startDate, 'MMM dd, yyyy') : 'Select date'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.dateSeparator}>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={palette.textTertiary}
                    />
                  </View>
                  <View style={styles.dateContainer}>
                    <Text style={styles.dateLabel}>To</Text>
                    <TouchableOpacity
                      style={styles.dateDisplay}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowStartPicker(false); // Close start picker if open
                        setShowEndPicker(true);
                      }}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={palette.tint}
                      />
                      <Text style={styles.dateText}>
                        {endDate ? format(endDate, 'MMM dd, yyyy') : 'Select date'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {dayCount > 0 && (
                  <View style={styles.dayCountContainer}>
                    <Ionicons name="time-outline" size={16} color={palette.tint} />
                    <Text style={styles.dayCountText}>
                      {dayCount} {dayCount === 1 ? 'day' : 'days'}
                    </Text>
                  </View>
                )}
                {startDate && isWeekend(startDate) && (
                  <Text style={styles.weekendWarning}>
                    ⚠️ Start date falls on a weekend
                  </Text>
                )}
              </View>

              {/* Cover Arrangement */}
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setHasCoverArranged(!hasCoverArranged);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, hasCoverArranged && styles.checkboxChecked]}>
                    {hasCoverArranged && (
                      <Ionicons name="checkmark" size={16} color={palette.textInverse} />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>Has cover been arranged?</Text>
                </TouchableOpacity>
              </View>

              {/* Notes */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {hasCoverArranged ? 'Helper Names & Additional Notes' : 'Additional Notes (Optional)'}
                </Text>
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={
                    hasCoverArranged
                      ? "Enter helper names and any additional information..."
                      : "Add any additional information..."
                  }
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
                  Your request will be sent to an admin for approval. You'll be notified
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
                disabled={!startDate || !endDate || isSubmitting}
                style={styles.actionButton}
              >
                Submit Request
              </Button>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>

      {/* iOS Date Pickers in Modal */}
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
                    // If end date is before start date, update end date
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
              // If end date is before start date, update end date
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
    dayCountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.xs,
      marginTop: Theme.spacing.sm,
      padding: Theme.spacing.sm,
      backgroundColor: `${palette.tint}10`,
      borderRadius: Theme.borderRadius.sm,
      alignSelf: 'flex-start',
    },
    dayCountText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.tint,
    },
    quickSelectRow: {
      flexDirection: 'row',
      gap: Theme.spacing.sm,
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
    weekendWarning: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.statusWarning,
      marginTop: Theme.spacing.xs,
    },
    charCount: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textTertiary,
      textAlign: 'right',
      marginTop: Theme.spacing.xs,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.md,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: Theme.borderRadius.sm,
      borderWidth: 2,
      borderColor: palette.borderDefault,
      backgroundColor: palette.backgroundSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: palette.tint,
      borderColor: palette.tint,
    },
    checkboxLabel: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textPrimary,
    },
    reasonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    reasonCard: {
      width: '48%',
      padding: Theme.spacing.md,
      backgroundColor: palette.backgroundSecondary,
      borderRadius: Theme.borderRadius.md,
      borderWidth: 1,
      borderColor: palette.borderLight,
      alignItems: 'center',
      marginBottom: Theme.spacing.sm,
    },
    reasonCardActive: {
      backgroundColor: palette.tint,
      borderColor: palette.tint,
    },
    reasonText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textSecondary,
    },
    reasonTextActive: {
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