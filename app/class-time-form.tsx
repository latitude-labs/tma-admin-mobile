import { Button, Input, ScreenHeader, toast } from '@/components/ui';
import { Theme } from '@/constants/Theme';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { ClassTimeFormData, classTimesService } from '@/services/api/classTimes.service';
import { useClubStore } from '@/store/clubStore';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
] as const;

const DaySelector = React.memo(({
  value,
  onChange,
  styles
}: {
  value: string;
  onChange: (day: string) => void;
  styles: any;
}) => {
  return (
    <View style={styles.dayContainer}>
      <Text style={styles.label}>Day of the Week</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayScrollView}
      >
        <View style={styles.dayChips}>
          {DAYS.map((day) => {
            const isSelected = value === day;
            return (
              <Pressable
                key={day}
                onPress={() => {
                  if (Platform.OS === 'ios') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  onChange(day);
                }}
                style={[
                  styles.dayChip,
                  isSelected && styles.dayChipSelected
                ]}
              >
                <Text style={[
                  styles.dayChipText,
                  isSelected && styles.dayChipTextSelected
                ]}>
                  {day.substring(0, 3)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
});

const TimePickerField = React.memo(({
  label,
  value,
  onChange,
  palette,
  styles
}: {
  label: string;
  value: string;
  onChange: (time: string) => void;
  palette: ThemeColors;
  styles: any;
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(() => {
    if (value) {
      const [hours, minutes] = value.split(':').map(Number);
      const date = new Date();
      date.setHours(hours || 0);
      date.setMinutes(minutes || 0);
      return date;
    }
    return new Date();
  });

  const handleTimeChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selected) {
      setSelectedTime(selected);
      const hours = selected.getHours().toString().padStart(2, '0');
      const minutes = selected.getMinutes().toString().padStart(2, '0');
      onChange(`${hours}:${minutes}`);
    }
  };

  const formatTimeDisplay = (timeStr: string) => {
    if (!timeStr) return 'Select time';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <View style={styles.timeInput}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={styles.timePickerButton}
        onPress={() => {
          setShowPicker(true);
          if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }}
      >
        <Ionicons name="time-outline" size={20} color={palette.textSecondary} />
        <Text style={styles.timePickerText}>
          {formatTimeDisplay(value)}
        </Text>
      </Pressable>

      {Platform.OS === 'ios' ? (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowPicker(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setShowPicker(false)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </Pressable>
                <Text style={styles.modalTitle}>{label}</Text>
                <Pressable onPress={() => setShowPicker(false)}>
                  <Text style={styles.modalDone}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                style={styles.iosTimePicker}
              />
            </View>
          </Pressable>
        </Modal>
      ) : (
        showPicker && (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
        )
      )}
    </View>
  );
});

export default function ClassTimeFormScreen() {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { clubId, classTimeId } = useLocalSearchParams<{ clubId: string; classTimeId?: string }>();

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingClassTime, setIsFetchingClassTime] = useState(false);

  const scaleValue = useSharedValue(1);
  const { selectedClub, fetchAdminClub } = useClubStore();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
    watch
  } = useForm<ClassTimeFormData>({
    defaultValues: {
      club_id: parseInt(clubId),
      day: 'Monday',
      name: '',
      start_time: '',
      end_time: '',
      priority: 0,
      is_accepting_bookings: true,
    },
  });


  useEffect(() => {
    if (clubId && !selectedClub) {
      fetchAdminClub(parseInt(clubId));
    }
  }, [clubId]);

  useEffect(() => {
    if (classTimeId) {
      loadClassTime(parseInt(classTimeId));
    }
  }, [classTimeId]);

  const loadClassTime = async (id: number) => {
    setIsFetchingClassTime(true);
    try {
      const classTime = await classTimesService.getClassTime(id);
      setValue('day', classTime.day as ClassTimeFormData['day']);
      setValue('name', classTime.name || '');
      setValue('start_time', classTime.start_time?.substring(0, 5) || '');
      setValue('end_time', classTime.end_time?.substring(0, 5) || '');
    } catch (error) {
      toast.error('Failed to load class time details');
      router.back();
    } finally {
      setIsFetchingClassTime(false);
    }
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const formatTimeForAPI = (time: string) => {
    if (!time.includes(':')) return time;
    const parts = time.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
  };

  const onSubmit = async (data: ClassTimeFormData) => {
    setIsLoading(true);
    try {
      const formattedData = {
        ...data,
        start_time: formatTimeForAPI(data.start_time),
        end_time: formatTimeForAPI(data.end_time),
      };

      if (classTimeId) {
        await classTimesService.updateClassTime(parseInt(classTimeId), formattedData);
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        toast.success('Class time updated successfully');
        router.back();
      } else {
        await classTimesService.createClassTime(formattedData);
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        toast.success('Class time created successfully');
        router.back();
      }
    } catch (error) {
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      toast.error('Failed to save class time. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingClassTime) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <ScreenHeader title="Loading..." />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.tint} />
            <Text style={styles.loadingText}>Loading class time...</Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ScreenHeader
          title={classTimeId ? 'Edit Class Time' : 'New Class Time'}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInDown.duration(400).springify()}>
              <View style={styles.formSection}>
                <View style={styles.clubInfo}>
                  <Ionicons name="business" size={20} color={palette.tint} />
                  <Text style={styles.clubName}>{selectedClub?.name || 'Loading...'}</Text>
                </View>

                <Controller
                  control={control}
                  name="day"
                  rules={{ required: 'Please select a day' }}
                  render={({ field: { value, onChange } }) => (
                    <DaySelector
                      value={value}
                      onChange={onChange}
                      styles={styles}
                    />
                  )}
                />
                {errors.day && (
                  <Text style={styles.errorText}>{errors.day.message}</Text>
                )}

                <Controller
                  control={control}
                  name="name"
                  rules={{ required: 'Please select a class type' }}
                  render={({ field: { value, onChange } }) => (
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Class Type</Text>
                      <View style={styles.classTypeContainer}>
                        <Pressable
                          onPress={() => {
                            onChange('Kids');
                            if (Platform.OS === 'ios') {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                          }}
                          style={[
                            styles.classTypeButton,
                            value === 'Kids' && styles.classTypeButtonSelected
                          ]}
                        >
                          <Ionicons
                            name="happy"
                            size={24}
                            color={value === 'Kids' ? palette.textInverse : palette.textSecondary}
                          />
                          <Text style={[
                            styles.classTypeText,
                            value === 'Kids' && styles.classTypeTextSelected
                          ]}>
                            Kids
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => {
                            onChange('Adults');
                            if (Platform.OS === 'ios') {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                          }}
                          style={[
                            styles.classTypeButton,
                            value === 'Adults' && styles.classTypeButtonSelected
                          ]}
                        >
                          <Ionicons
                            name="people"
                            size={24}
                            color={value === 'Adults' ? palette.textInverse : palette.textSecondary}
                          />
                          <Text style={[
                            styles.classTypeText,
                            value === 'Adults' && styles.classTypeTextSelected
                          ]}>
                            Adults
                          </Text>
                        </Pressable>
                      </View>
                      {errors.name && (
                        <Text style={styles.errorText}>{errors.name.message}</Text>
                      )}
                    </View>
                  )}
                />

                <View style={styles.timeRow}>
                  <Controller
                    control={control}
                    name="start_time"
                    rules={{ required: 'Start time is required' }}
                    render={({ field: { value, onChange } }) => (
                      <TimePickerField
                        label="Start Time"
                        value={value}
                        onChange={onChange}
                        palette={palette}
                        styles={styles}
                      />
                    )}
                  />
                  {errors.start_time && (
                    <Text style={styles.errorText}>{errors.start_time.message}</Text>
                  )}

                  <Controller
                    control={control}
                    name="end_time"
                    rules={{ required: 'End time is required' }}
                    render={({ field: { value, onChange } }) => (
                      <TimePickerField
                        label="End Time"
                        value={value}
                        onChange={onChange}
                        palette={palette}
                        styles={styles}
                      />
                    )}
                  />
                  {errors.end_time && (
                    <Text style={styles.errorText}>{errors.end_time.message}</Text>
                  )}
                </View>

                <Controller
                  control={control}
                  name="is_accepting_bookings"
                  render={({ field: { value, onChange } }) => (
                    <Pressable
                      style={styles.toggleRow}
                      onPress={() => onChange(!value)}
                    >
                      <Text style={styles.toggleLabel}>Accepting Bookings</Text>
                      <View style={[
                        styles.toggle,
                        value && styles.toggleActive
                      ]}>
                        <Animated.View
                          style={[
                            styles.toggleThumb,
                            {
                              transform: [{
                                translateX: value ? 20 : 0
                              }]
                            }
                          ]}
                        />
                      </View>
                    </Pressable>
                  )}
                />
              </View>
            </Animated.View>

            <View style={styles.actionButtons}>
              <Animated.View style={[styles.actionButton, animatedButtonStyle]}>
                <Button
                  variant="primary"
                  size="lg"
                  onPress={handleSubmit(onSubmit)}
                  onPressIn={() => {
                    scaleValue.value = withSpring(0.95);
                  }}
                  onPressOut={() => {
                    scaleValue.value = withSpring(1);
                  }}
                  disabled={isLoading}
                  style={styles.submitButton}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={palette.textInverse} />
                  ) : (
                    <View style={styles.buttonContent}>
                      <Ionicons name="checkmark-circle" size={20} color={palette.textInverse} />
                      <Text style={styles.buttonText}>
                        {classTimeId ? 'Update Class' : 'Create Class'}
                      </Text>
                    </View>
                  )}
                </Button>
              </Animated.View>

              <Button
                variant="outline"
                size="lg"
                onPress={() => router.back()}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.backgroundSecondary,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Theme.spacing['3xl'],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Theme.spacing.lg,
    fontSize: Theme.typography.sizes.md,
    color: palette.textSecondary,
    fontFamily: Theme.typography.fonts.medium,
  },
  formSection: {
    padding: Theme.spacing.lg,
  },
  clubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.background,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    marginBottom: Theme.spacing.xl,
    ...Theme.shadows.sm,
  },
  clubName: {
    marginLeft: Theme.spacing.sm,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
  },
  inputContainer: {
    marginBottom: Theme.spacing.lg,
  },
  label: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  dayContainer: {
    marginBottom: Theme.spacing.lg,
  },
  dayScrollView: {
    marginTop: Theme.spacing.xs,
  },
  dayChips: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    paddingRight: Theme.spacing.lg,
  },
  dayChip: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: palette.background,
    borderWidth: 2,
    borderColor: palette.border,
    minWidth: 60,
    alignItems: 'center',
  },
  dayChipSelected: {
    backgroundColor: palette.tint,
    borderColor: palette.tint,
  },
  dayChipText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textPrimary,
  },
  dayChipTextSelected: {
    color: palette.textInverse,
    fontFamily: Theme.typography.fonts.bold,
  },
  timeRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  timeInput: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: palette.background,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.lg,
    marginBottom: Theme.spacing.lg,
  },
  toggleLabel: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textPrimary,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.borderLight,
    padding: 3,
  },
  toggleActive: {
    backgroundColor: palette.statusSuccess,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.background,
    ...Theme.shadows.sm,
  },
  errorText: {
    color: palette.statusError,
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.medium,
    marginTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.sm,
  },
  actionButtons: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xl,
    gap: Theme.spacing.md,
  },
  actionButton: {
    width: '100%',
  },
  submitButton: {
    width: '100%',
  },
  cancelButton: {
    width: '100%',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
  },
  buttonText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.bold,
  },
  classTypeContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.xs,
  },
  classTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: palette.background,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 2,
    borderColor: palette.border,
    ...Theme.shadows.sm,
  },
  classTypeButtonSelected: {
    backgroundColor: palette.tint,
    borderColor: palette.tint,
  },
  classTypeText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textSecondary,
  },
  classTypeTextSelected: {
    color: palette.textInverse,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.background,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    gap: Theme.spacing.sm,
  },
  timePickerText: {
    flex: 1,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: palette.background,
    borderTopLeftRadius: Theme.borderRadius.xl,
    borderTopRightRadius: Theme.borderRadius.xl,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  modalTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
  },
  modalCancel: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
  },
  modalDone: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.tint,
  },
  iosTimePicker: {
    width: '100%',
    height: 200,
  },
});