import { Button } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { Theme } from '@/constants/Theme';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { calendarService } from '@/services/api/calendar.service';
import { CreateEventRequest } from '@/types/calendar';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, addHours, addDays, addWeeks, addMonths, setHours, setMinutes } from 'date-fns';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState, useRef } from 'react';
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
  Dimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AddEventModalProps {
  visible: boolean;
  onClose: () => void;
  initialDate?: Date;
  onSubmit?: () => void;
}

type EventType = 'event' | 'meeting' | 'training';
type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

interface EventFormData {
  title: string;
  type: EventType;
  date: Date;
  startTime: Date;
  endTime: Date;
  description: string;
  location: string;
  recurrence: RecurrenceType;
  recurrenceEndDate: Date | null;
  visibility: 'all' | 'coaches' | 'admins';
  sendNotification: boolean;
  isAllDay: boolean;
}

const EVENT_TYPES: { value: EventType; label: string; icon: string; color: string }[] = [
  { value: 'event', label: 'Event', icon: 'calendar', color: '#2196F3' },
  { value: 'meeting', label: 'Meeting', icon: 'people', color: '#4CAF50' },
  { value: 'training', label: 'Training', icon: 'fitness', color: '#FF8133' },
];

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string; icon: string }[] = [
  { value: 'none', label: 'One-time', icon: 'calendar' },
  { value: 'daily', label: 'Daily', icon: 'today' },
  { value: 'weekly', label: 'Weekly', icon: 'calendar-sharp' },
  { value: 'monthly', label: 'Monthly', icon: 'calendar-number' },
];

const STEPS = ['Basic Info', 'Details', 'Settings', 'Review'];

export const AddEventModal: React.FC<AddEventModalProps> = ({
  visible,
  onClose,
  initialDate,
  onSubmit,
}) => {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const scrollViewRef = useRef<ScrollView>(null);

  // Form state
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showRecurrenceEndPicker, setShowRecurrenceEndPicker] = useState(false);

  // Form data
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    type: 'event',
    date: initialDate || new Date(),
    startTime: setMinutes(setHours(new Date(), 10), 0),
    endTime: setMinutes(setHours(new Date(), 11), 0),
    description: '',
    location: '',
    recurrence: 'none',
    recurrenceEndDate: null,
    visibility: 'all',
    sendNotification: true,
    isAllDay: false,
  });

  // Animation values
  const stepProgress = useSharedValue(0);
  const formTranslateX = useSharedValue(0);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${((stepProgress.value + 1) / STEPS.length) * 100}%`,
  }));

  const indicatorStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      stepProgress.value,
      [0, 0.5, 1, 1.5, 2, 2.5, 3],
      [1, 1.05, 1, 1.05, 1, 1.05, 1]
    );
    return {
      transform: [{ scale: withTiming(scale, { duration: 200 }) }],
    };
  });

  const validateCurrentStep = useCallback(() => {
    switch (currentStep) {
      case 0: // Basic Info
        if (!formData.title.trim()) {
          toast.error('Please enter an event title');
          return false;
        }
        if (formData.title.trim().length < 3) {
          toast.error('Event title must be at least 3 characters');
          return false;
        }
        return true;

      case 1: // Details
        if (!formData.isAllDay && formData.startTime >= formData.endTime) {
          toast.error('End time must be after start time');
          return false;
        }
        return true;

      case 2: // Settings
        if (formData.recurrence !== 'none' && !formData.recurrenceEndDate) {
          toast.error('Please select an end date for recurring events');
          return false;
        }
        if (formData.recurrenceEndDate && formData.recurrenceEndDate <= formData.date) {
          toast.error('Recurrence end date must be after the event date');
          return false;
        }
        return true;

      default:
        return true;
    }
  }, [currentStep, formData]);

  const handleNext = useCallback(() => {
    if (!validateCurrentStep()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    stepProgress.value = withTiming(currentStep + 1, {
      duration: 300,
      easing: Easing.out(Easing.cubic)
    });
    setCurrentStep(prev => prev + 1);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, [currentStep, validateCurrentStep]);

  const handlePrevious = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    stepProgress.value = withTiming(currentStep - 1, {
      duration: 300,
      easing: Easing.out(Easing.cubic)
    });
    setCurrentStep(prev => prev - 1);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    if (!validateCurrentStep()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);

    try {
      // Prepare event data for API
      const eventData: CreateEventRequest = {
        title: formData.title.trim(),
        type: formData.type,
        date: format(formData.date, 'yyyy-MM-dd'),
        start_time: formData.isAllDay ? undefined : format(formData.startTime, 'HH:mm:ss'),
        end_time: formData.isAllDay ? undefined : format(formData.endTime, 'HH:mm:ss'),
        description: formData.description.trim() || undefined,
        location: formData.location.trim() || undefined,
        recurrence: formData.recurrence,
        recurrence_end_date: formData.recurrenceEndDate ?
          format(formData.recurrenceEndDate, 'yyyy-MM-dd') : undefined,
        visibility: formData.visibility,
        send_notification: formData.sendNotification,
        is_all_day: formData.isAllDay,
      };

      // Create event via API
      const response = await calendarService.createEvent(eventData);
      console.log('Event created:', response.data);

      // Success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Close modal
      onClose();

      // Reset form
      setCurrentStep(0);
      stepProgress.value = 0;
      setFormData({
        title: '',
        type: 'event',
        date: new Date(),
        startTime: setMinutes(setHours(new Date(), 10), 0),
        endTime: setMinutes(setHours(new Date(), 11), 0),
        description: '',
        location: '',
        recurrence: 'none',
        recurrenceEndDate: null,
        visibility: 'all',
        sendNotification: true,
        isAllDay: false,
      });

      // Show success toast after modal closes
      setTimeout(() => {
        toast.success('Event created successfully!');
        onSubmit?.();
      }, 300);
    } catch (error) {
      let errorMessage = 'Failed to create event';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, 5000);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit, onClose, validateCurrentStep]);

  const handleClose = useCallback(() => {
    // Save draft if there's data
    if (formData.title.trim()) {
      Alert.alert(
        'Save Draft?',
        'Do you want to save this event as a draft?',
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setCurrentStep(0);
              stepProgress.value = 0;
              onClose();
            },
          },
          {
            text: 'Save Draft',
            onPress: () => {
              // TODO: Save draft to local storage
              console.log('Saving draft:', formData);
              onClose();
            },
          },
        ]
      );
    } else {
      setCurrentStep(0);
      stepProgress.value = 0;
      onClose();
    }
  }, [formData, onClose]);

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      <View style={styles.progressBarBackground}>
        <Animated.View style={[styles.progressBar, progressBarStyle]} />
      </View>
      <View style={styles.stepsRow}>
        {STEPS.map((step, index) => (
          <View key={step} style={styles.stepItem}>
            <Animated.View
              style={[
                styles.stepCircle,
                index <= currentStep && styles.stepCircleActive,
                index === currentStep && indicatorStyle,
              ]}
            >
              {index < currentStep ? (
                <Ionicons name="checkmark" size={16} color={palette.textInverse} />
              ) : (
                <Text style={[
                  styles.stepNumber,
                  index <= currentStep && styles.stepNumberActive,
                ]}>
                  {index + 1}
                </Text>
              )}
            </Animated.View>
            <Text style={[
              styles.stepLabel,
              index <= currentStep && styles.stepLabelActive,
            ]}>
              {step}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Basic Information</Text>

      {/* Title Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Event Title *</Text>
        <TextInput
          style={styles.input}
          value={formData.title}
          onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
          placeholder="Enter event title..."
          placeholderTextColor={palette.textTertiary}
          maxLength={100}
        />
        <Text style={styles.charCount}>{formData.title.length}/100</Text>
      </View>

      {/* Event Type */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Event Type</Text>
        <View style={styles.typeGrid}>
          {EVENT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeCard,
                formData.type === type.value && styles.typeCardActive,
                { borderColor: formData.type === type.value ? type.color : palette.borderLight }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFormData(prev => ({ ...prev, type: type.value }));
              }}
            >
              <View style={[styles.typeIcon, { backgroundColor: type.color + '20' }]}>
                <Ionicons name={type.icon as any} size={24} color={type.color} />
              </View>
              <Text style={[
                styles.typeLabel,
                formData.type === type.value && styles.typeLabelActive,
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Date Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Event Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowDatePicker(true);
          }}
        >
          <Ionicons name="calendar-outline" size={20} color={palette.tint} />
          <Text style={styles.dateButtonText}>
            {format(formData.date, 'EEEE, MMMM d, yyyy')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Event Details</Text>

      {/* All Day Toggle */}
      <View style={styles.inputGroup}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFormData(prev => ({ ...prev, isAllDay: !prev.isAllDay }));
          }}
        >
          <View style={[styles.checkbox, formData.isAllDay && styles.checkboxChecked]}>
            {formData.isAllDay && (
              <Ionicons name="checkmark" size={16} color={palette.textInverse} />
            )}
          </View>
          <Text style={styles.checkboxLabel}>All-day event</Text>
        </TouchableOpacity>
      </View>

      {/* Time Selection */}
      {!formData.isAllDay && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Time</Text>
          <View style={styles.timeRow}>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowStartTimePicker(true);
              }}
            >
              <Ionicons name="time-outline" size={16} color={palette.tint} />
              <Text style={styles.timeButtonText}>
                {format(formData.startTime, 'h:mm a')}
              </Text>
            </TouchableOpacity>
            <Ionicons name="arrow-forward" size={16} color={palette.textTertiary} />
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowEndTimePicker(true);
              }}
            >
              <Ionicons name="time-outline" size={16} color={palette.tint} />
              <Text style={styles.timeButtonText}>
                {format(formData.endTime, 'h:mm a')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Location */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Location (Optional)</Text>
        <TextInput
          style={styles.input}
          value={formData.location}
          onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
          placeholder="Enter location or meeting link..."
          placeholderTextColor={palette.textTertiary}
          maxLength={200}
        />
      </View>

      {/* Description */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Description (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.description}
          onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
          placeholder="Add event description..."
          placeholderTextColor={palette.textTertiary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={styles.charCount}>{formData.description.length}/500</Text>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Event Settings</Text>

      {/* Recurrence */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Recurrence</Text>
        <View style={styles.recurrenceGrid}>
          {RECURRENCE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.recurrenceCard,
                formData.recurrence === option.value && styles.recurrenceCardActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFormData(prev => ({ ...prev, recurrence: option.value }));
              }}
            >
              <Ionicons
                name={option.icon as any}
                size={20}
                color={formData.recurrence === option.value ? palette.textInverse : palette.textSecondary}
              />
              <Text style={[
                styles.recurrenceLabel,
                formData.recurrence === option.value && styles.recurrenceLabelActive,
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recurrence End Date */}
      {formData.recurrence !== 'none' && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Repeat Until *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowRecurrenceEndPicker(true);
            }}
          >
            <Ionicons name="calendar-outline" size={20} color={palette.tint} />
            <Text style={styles.dateButtonText}>
              {formData.recurrenceEndDate
                ? format(formData.recurrenceEndDate, 'MMMM d, yyyy')
                : 'Select end date'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Visibility */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Visibility</Text>
        <View style={styles.visibilityOptions}>
          {[
            { value: 'all', label: 'Everyone', icon: 'globe' },
            { value: 'coaches', label: 'Coaches Only', icon: 'people' },
            { value: 'admins', label: 'Admins Only', icon: 'shield' },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.visibilityOption,
                formData.visibility === option.value && styles.visibilityOptionActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFormData(prev => ({ ...prev, visibility: option.value as any }));
              }}
            >
              <Ionicons
                name={option.icon as any}
                size={18}
                color={formData.visibility === option.value ? palette.tint : palette.textTertiary}
              />
              <Text style={[
                styles.visibilityLabel,
                formData.visibility === option.value && styles.visibilityLabelActive,
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Send Notification */}
      <View style={styles.inputGroup}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFormData(prev => ({ ...prev, sendNotification: !prev.sendNotification }));
          }}
        >
          <View style={[styles.checkbox, formData.sendNotification && styles.checkboxChecked]}>
            {formData.sendNotification && (
              <Ionicons name="checkmark" size={16} color={palette.textInverse} />
            )}
          </View>
          <Text style={styles.checkboxLabel}>Send notification to attendees</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep4 = () => {
    const selectedType = EVENT_TYPES.find(t => t.value === formData.type);

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Review & Submit</Text>
        <Text style={styles.reviewSubtitle}>Please review your event details</Text>

        <View style={styles.reviewSection}>
          <View style={styles.reviewHeader}>
            <View style={[styles.reviewTypeIcon, { backgroundColor: selectedType?.color + '20' }]}>
              <Ionicons name={selectedType?.icon as any} size={24} color={selectedType?.color} />
            </View>
            <Text style={styles.reviewTitle}>{formData.title}</Text>
          </View>

          <View style={styles.reviewDetails}>
            <View style={styles.reviewRow}>
              <Ionicons name="pricetag-outline" size={18} color={palette.textSecondary} />
              <Text style={styles.reviewLabel}>Type:</Text>
              <Text style={styles.reviewValue}>{selectedType?.label}</Text>
            </View>

            <View style={styles.reviewRow}>
              <Ionicons name="calendar-outline" size={18} color={palette.textSecondary} />
              <Text style={styles.reviewLabel}>Date:</Text>
              <Text style={styles.reviewValue}>{format(formData.date, 'MMMM d, yyyy')}</Text>
            </View>

            {!formData.isAllDay && (
              <View style={styles.reviewRow}>
                <Ionicons name="time-outline" size={18} color={palette.textSecondary} />
                <Text style={styles.reviewLabel}>Time:</Text>
                <Text style={styles.reviewValue}>
                  {format(formData.startTime, 'h:mm a')} - {format(formData.endTime, 'h:mm a')}
                </Text>
              </View>
            )}

            {formData.isAllDay && (
              <View style={styles.reviewRow}>
                <Ionicons name="sunny-outline" size={18} color={palette.textSecondary} />
                <Text style={styles.reviewLabel}>Duration:</Text>
                <Text style={styles.reviewValue}>All day</Text>
              </View>
            )}

            {formData.location && (
              <View style={styles.reviewRow}>
                <Ionicons name="location-outline" size={18} color={palette.textSecondary} />
                <Text style={styles.reviewLabel}>Location:</Text>
                <Text style={styles.reviewValue} numberOfLines={2}>{formData.location}</Text>
              </View>
            )}

            <View style={styles.reviewRow}>
              <Ionicons name="refresh-outline" size={18} color={palette.textSecondary} />
              <Text style={styles.reviewLabel}>Recurrence:</Text>
              <Text style={styles.reviewValue}>
                {formData.recurrence === 'none'
                  ? 'One-time event'
                  : `${RECURRENCE_OPTIONS.find(r => r.value === formData.recurrence)?.label} until ${formData.recurrenceEndDate ? format(formData.recurrenceEndDate, 'MMM d, yyyy') : 'N/A'}`}
              </Text>
            </View>

            <View style={styles.reviewRow}>
              <Ionicons name="eye-outline" size={18} color={palette.textSecondary} />
              <Text style={styles.reviewLabel}>Visibility:</Text>
              <Text style={styles.reviewValue}>
                {formData.visibility === 'all' ? 'Everyone' :
                 formData.visibility === 'coaches' ? 'Coaches Only' : 'Admins Only'}
              </Text>
            </View>

            {formData.sendNotification && (
              <View style={styles.reviewRow}>
                <Ionicons name="notifications-outline" size={18} color={palette.statusInfo} />
                <Text style={[styles.reviewValue, { color: palette.statusInfo }]}>
                  Notification will be sent
                </Text>
              </View>
            )}
          </View>

          {formData.description && (
            <View style={styles.reviewDescription}>
              <Text style={styles.reviewDescLabel}>Description:</Text>
              <Text style={styles.reviewDescText}>{formData.description}</Text>
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={20} color={palette.statusInfo} />
          <Text style={styles.infoText}>
            Once created, this event will appear on the calendar for all selected users.
            {formData.sendNotification && ' A notification will be sent to all attendees.'}
          </Text>
        </View>
      </View>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderStep1();
      case 1:
        return renderStep2();
      case 2:
        return renderStep3();
      case 3:
        return renderStep4();
      default:
        return null;
    }
  };

  // Create custom entering animation for the modal
  const modalEntering = () => {
    'worklet';
    const animations = {
      transform: [
        {
          translateY: withTiming(0, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
          }),
        },
      ],
    };
    const initialValues = {
      transform: [{ translateY: 1000 }],
    };
    return {
      animations,
      initialValues,
    };
  };

  const modalExiting = () => {
    'worklet';
    const animations = {
      transform: [
        {
          translateY: withTiming(1000, {
            duration: 250,
            easing: Easing.in(Easing.cubic),
          }),
        },
      ],
    };
    const initialValues = {
      transform: [{ translateY: 0 }],
    };
    return {
      animations,
      initialValues,
    };
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View
        entering={FadeIn.duration(150)}
        exiting={FadeOut.duration(150)}
        style={styles.overlay}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <Animated.View
            entering={modalEntering}
            exiting={modalExiting}
            style={styles.modal}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Create New Event</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={palette.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Step Indicator */}
            {renderStepIndicator()}

            {/* Content */}
            <View style={styles.content}>
              <ScrollView
                ref={scrollViewRef}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ flexGrow: 1 }}
              >
                {renderCurrentStep()}
              </ScrollView>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onPress={handlePrevious}
                  style={styles.actionButton}
                >
                  Previous
                </Button>
              )}
              {currentStep < STEPS.length - 1 ? (
                <Button
                  variant="primary"
                  onPress={handleNext}
                  style={[styles.actionButton, currentStep === 0 && styles.fullWidthButton]}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onPress={handleSubmit}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  style={styles.actionButton}
                >
                  Create Event
                </Button>
              )}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>

      {/* Date Pickers */}
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
                  onPress={() => setShowDatePicker(false)}
                  style={styles.datePickerButton}
                >
                  <Text style={[styles.datePickerButtonText, { color: palette.tint }]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={formData.date}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setFormData(prev => ({ ...prev, date: selectedDate }));
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'ios' && showStartTimePicker && (
        <Modal
          transparent
          visible={showStartTimePicker}
          animationType="slide"
          onRequestClose={() => setShowStartTimePicker(false)}
        >
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity
                  onPress={() => setShowStartTimePicker(false)}
                  style={styles.datePickerButton}
                >
                  <Text style={styles.datePickerButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Start Time</Text>
                <TouchableOpacity
                  onPress={() => setShowStartTimePicker(false)}
                  style={styles.datePickerButton}
                >
                  <Text style={[styles.datePickerButtonText, { color: palette.tint }]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={formData.startTime}
                mode="time"
                display="spinner"
                onChange={(event, selectedTime) => {
                  if (selectedTime) {
                    setFormData(prev => ({
                      ...prev,
                      startTime: selectedTime,
                      endTime: addHours(selectedTime, 1) // Auto-adjust end time
                    }));
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'ios' && showEndTimePicker && (
        <Modal
          transparent
          visible={showEndTimePicker}
          animationType="slide"
          onRequestClose={() => setShowEndTimePicker(false)}
        >
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity
                  onPress={() => setShowEndTimePicker(false)}
                  style={styles.datePickerButton}
                >
                  <Text style={styles.datePickerButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>End Time</Text>
                <TouchableOpacity
                  onPress={() => setShowEndTimePicker(false)}
                  style={styles.datePickerButton}
                >
                  <Text style={[styles.datePickerButtonText, { color: palette.tint }]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={formData.endTime}
                mode="time"
                display="spinner"
                minimumDate={formData.startTime}
                onChange={(event, selectedTime) => {
                  if (selectedTime) {
                    setFormData(prev => ({ ...prev, endTime: selectedTime }));
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'ios' && showRecurrenceEndPicker && (
        <Modal
          transparent
          visible={showRecurrenceEndPicker}
          animationType="slide"
          onRequestClose={() => setShowRecurrenceEndPicker(false)}
        >
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity
                  onPress={() => setShowRecurrenceEndPicker(false)}
                  style={styles.datePickerButton}
                >
                  <Text style={styles.datePickerButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Repeat Until</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (!formData.recurrenceEndDate) {
                      // Set default end date based on recurrence type
                      let defaultEnd = formData.date;
                      switch (formData.recurrence) {
                        case 'daily':
                          defaultEnd = addDays(formData.date, 30);
                          break;
                        case 'weekly':
                          defaultEnd = addWeeks(formData.date, 12);
                          break;
                        case 'monthly':
                          defaultEnd = addMonths(formData.date, 6);
                          break;
                      }
                      setFormData(prev => ({ ...prev, recurrenceEndDate: defaultEnd }));
                    }
                    setShowRecurrenceEndPicker(false);
                  }}
                  style={styles.datePickerButton}
                >
                  <Text style={[styles.datePickerButtonText, { color: palette.tint }]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={formData.recurrenceEndDate || addMonths(formData.date, 3)}
                mode="date"
                display="spinner"
                minimumDate={addDays(formData.date, 1)}
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setFormData(prev => ({ ...prev, recurrenceEndDate: selectedDate }));
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android Date/Time Pickers */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={formData.date}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (event.type === 'set' && selectedDate) {
              setFormData(prev => ({ ...prev, date: selectedDate }));
            }
          }}
        />
      )}

      {Platform.OS === 'android' && showStartTimePicker && (
        <DateTimePicker
          value={formData.startTime}
          mode="time"
          display="default"
          onChange={(event, selectedTime) => {
            setShowStartTimePicker(false);
            if (event.type === 'set' && selectedTime) {
              setFormData(prev => ({
                ...prev,
                startTime: selectedTime,
                endTime: addHours(selectedTime, 1)
              }));
            }
          }}
        />
      )}

      {Platform.OS === 'android' && showEndTimePicker && (
        <DateTimePicker
          value={formData.endTime}
          mode="time"
          display="default"
          onChange={(event, selectedTime) => {
            setShowEndTimePicker(false);
            if (event.type === 'set' && selectedTime) {
              setFormData(prev => ({ ...prev, endTime: selectedTime }));
            }
          }}
        />
      )}

      {Platform.OS === 'android' && showRecurrenceEndPicker && (
        <DateTimePicker
          value={formData.recurrenceEndDate || addMonths(formData.date, 3)}
          mode="date"
          display="default"
          minimumDate={addDays(formData.date, 1)}
          onChange={(event, selectedDate) => {
            setShowRecurrenceEndPicker(false);
            if (event.type === 'set' && selectedDate) {
              setFormData(prev => ({ ...prev, recurrenceEndDate: selectedDate }));
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
      height: '95%',
      maxHeight: '95%',
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
    stepIndicatorContainer: {
      paddingHorizontal: Theme.spacing.lg,
      paddingVertical: Theme.spacing.md,
    },
    progressBarBackground: {
      height: 4,
      backgroundColor: palette.borderLight,
      borderRadius: 2,
      marginBottom: Theme.spacing.lg,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      backgroundColor: palette.tint,
      borderRadius: 2,
    },
    stepsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    stepItem: {
      alignItems: 'center',
      flex: 1,
    },
    stepCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: palette.backgroundSecondary,
      borderWidth: 2,
      borderColor: palette.borderLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Theme.spacing.xs,
    },
    stepCircleActive: {
      backgroundColor: palette.tint,
      borderColor: palette.tint,
    },
    stepNumber: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textTertiary,
    },
    stepNumberActive: {
      color: palette.textInverse,
    },
    stepLabel: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textTertiary,
      textAlign: 'center',
    },
    stepLabelActive: {
      color: palette.textPrimary,
    },
    content: {
      flex: 1,
      paddingHorizontal: Theme.spacing.lg,
      paddingBottom: Theme.spacing.lg,
    },
    stepContent: {
      paddingVertical: Theme.spacing.md,
    },
    stepTitle: {
      fontSize: Theme.typography.sizes.lg,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
      marginBottom: Theme.spacing.lg,
    },
    inputGroup: {
      marginBottom: Theme.spacing.xl,
    },
    inputLabel: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
      marginBottom: Theme.spacing.sm,
    },
    input: {
      padding: Theme.spacing.md,
      backgroundColor: palette.backgroundSecondary,
      borderRadius: Theme.borderRadius.md,
      borderWidth: 1,
      borderColor: palette.borderLight,
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textPrimary,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    charCount: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textTertiary,
      textAlign: 'right',
      marginTop: Theme.spacing.xs,
    },
    typeGrid: {
      flexDirection: 'row',
      gap: Theme.spacing.md,
    },
    typeCard: {
      flex: 1,
      padding: Theme.spacing.md,
      backgroundColor: palette.backgroundSecondary,
      borderRadius: Theme.borderRadius.lg,
      borderWidth: 2,
      borderColor: palette.borderLight,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 100,
    },
    typeCardActive: {
      backgroundColor: palette.background,
    },
    typeIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Theme.spacing.xs,
    },
    typeLabel: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textSecondary,
      textAlign: 'center',
    },
    typeLabelActive: {
      color: palette.textPrimary,
      fontFamily: Theme.typography.fonts.semibold,
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.sm,
      padding: Theme.spacing.md,
      backgroundColor: palette.backgroundSecondary,
      borderRadius: Theme.borderRadius.md,
      borderWidth: 1,
      borderColor: palette.borderLight,
    },
    dateButtonText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textPrimary,
      flex: 1,
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
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.md,
    },
    timeButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.sm,
      padding: Theme.spacing.md,
      backgroundColor: palette.backgroundSecondary,
      borderRadius: Theme.borderRadius.md,
      borderWidth: 1,
      borderColor: palette.borderLight,
    },
    timeButtonText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textPrimary,
    },
    recurrenceGrid: {
      flexDirection: 'row',
      gap: Theme.spacing.sm,
    },
    recurrenceCard: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.xs,
      padding: Theme.spacing.sm,
      backgroundColor: palette.backgroundSecondary,
      borderRadius: Theme.borderRadius.md,
      borderWidth: 1,
      borderColor: palette.borderLight,
    },
    recurrenceCardActive: {
      backgroundColor: palette.tint,
      borderColor: palette.tint,
    },
    recurrenceLabel: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textSecondary,
    },
    recurrenceLabelActive: {
      color: palette.textInverse,
    },
    visibilityOptions: {
      flexDirection: 'row',
      gap: Theme.spacing.sm,
    },
    visibilityOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.xs,
      padding: Theme.spacing.md,
      backgroundColor: palette.backgroundSecondary,
      borderRadius: Theme.borderRadius.md,
      borderWidth: 1,
      borderColor: palette.borderLight,
    },
    visibilityOptionActive: {
      backgroundColor: `${palette.tint}10`,
      borderColor: palette.tint,
    },
    visibilityLabel: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textSecondary,
    },
    visibilityLabelActive: {
      color: palette.tint,
      fontFamily: Theme.typography.fonts.semibold,
    },
    reviewSubtitle: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
      marginBottom: Theme.spacing.lg,
    },
    reviewSection: {
      backgroundColor: palette.backgroundSecondary,
      borderRadius: Theme.borderRadius.lg,
      padding: Theme.spacing.lg,
      marginBottom: Theme.spacing.lg,
    },
    reviewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.md,
      marginBottom: Theme.spacing.lg,
    },
    reviewTypeIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reviewTitle: {
      flex: 1,
      fontSize: Theme.typography.sizes.lg,
      fontFamily: Theme.typography.fonts.bold,
      color: palette.textPrimary,
    },
    reviewDetails: {
      gap: Theme.spacing.md,
    },
    reviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.sm,
    },
    reviewLabel: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textSecondary,
      marginLeft: Theme.spacing.xs,
    },
    reviewValue: {
      flex: 1,
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
    },
    reviewDescription: {
      marginTop: Theme.spacing.lg,
      paddingTop: Theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: palette.borderLight,
    },
    reviewDescLabel: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textSecondary,
      marginBottom: Theme.spacing.xs,
    },
    reviewDescText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textPrimary,
      lineHeight: 20,
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
    fullWidthButton: {
      flex: 2,
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