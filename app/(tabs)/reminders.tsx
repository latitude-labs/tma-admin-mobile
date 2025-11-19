import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, isPast, isToday, isTomorrow, formatDistanceToNow } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Theme } from '@/constants/Theme';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { remindersService } from '@/services/api/reminders.service';
import { useAuthStore } from '@/store/authStore';

interface Reminder {
  id: number;
  title: string;
  description?: string;
  reminder_time: string;
  status: 'pending' | 'completed' | 'snoozed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  booking_id?: number;
  user_id: number;
  created_at?: string;
  updated_at?: string;
}

export default function RemindersScreen() {
  const { user } = useAuthStore();
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Add reminder form state
  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    priority: 'medium' as Reminder['priority'],
    date: new Date(),
    time: new Date(),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const response = await remindersService.getDashboardReminders();
      setReminders(response.reminders || []);
    } catch (error) {
      console.error('Failed to load reminders:', error);
      Alert.alert('Error', 'Failed to load reminders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadReminders();
  };

  const handleCompleteReminder = async (id: number) => {
    try {
      await remindersService.completeReminder(id);
      loadReminders();
    } catch (error) {
      console.error('Failed to complete reminder:', error);
      Alert.alert('Error', 'Failed to complete reminder');
    }
  };

  const handleSnoozeReminder = (reminder: Reminder) => {
    Alert.alert(
      '⏰ Snooze Reminder',
      `"${reminder.title}"`,
      [
        {
          text: '15 minutes',
          onPress: async () => {
            const snoozeTime = new Date();
            snoozeTime.setMinutes(snoozeTime.getMinutes() + 15);
            try {
              await remindersService.snoozeReminder(reminder.id, snoozeTime);
              loadReminders();
            } catch (error) {
              Alert.alert('Error', 'Failed to snooze reminder');
            }
          }
        },
        {
          text: '1 hour',
          onPress: async () => {
            const snoozeTime = new Date();
            snoozeTime.setHours(snoozeTime.getHours() + 1);
            try {
              await remindersService.snoozeReminder(reminder.id, snoozeTime);
              loadReminders();
            } catch (error) {
              Alert.alert('Error', 'Failed to snooze reminder');
            }
          }
        },
        {
          text: 'Tomorrow 9am',
          onPress: async () => {
            const snoozeTime = new Date();
            snoozeTime.setDate(snoozeTime.getDate() + 1);
            snoozeTime.setHours(9, 0, 0, 0);
            try {
              await remindersService.snoozeReminder(reminder.id, snoozeTime);
              loadReminders();
            } catch (error) {
              Alert.alert('Error', 'Failed to snooze reminder');
            }
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleDeleteReminder = (reminder: Reminder) => {
    Alert.alert(
      'Delete Reminder',
      `Are you sure you want to delete "${reminder.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await remindersService.deleteReminder(reminder.id);
              loadReminders();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete reminder');
            }
          }
        }
      ]
    );
  };

  const handleAddReminder = async () => {
    if (!newReminder.title.trim()) {
      Alert.alert('Error', 'Please enter a title for the reminder');
      return;
    }

    const reminderDateTime = new Date(newReminder.date);
    reminderDateTime.setHours(newReminder.time.getHours());
    reminderDateTime.setMinutes(newReminder.time.getMinutes());

    try {
      await remindersService.createReminder({
        title: newReminder.title,
        description: newReminder.description,
        reminder_time: reminderDateTime.toISOString(),
        priority: newReminder.priority,
      });

      setShowAddModal(false);
      setNewReminder({
        title: '',
        description: '',
        priority: 'medium',
        date: new Date(),
        time: new Date(),
      });
      loadReminders();
    } catch (error) {
      console.error('Failed to create reminder:', error);
      Alert.alert('Error', 'Failed to create reminder');
    }
  };

  const getTimeDisplay = (reminderTime: string) => {
    const date = new Date(reminderTime);

    if (isPast(date)) {
      return {
        text: 'Overdue',
        subtext: formatDistanceToNow(date, { addSuffix: true }),
        color: Theme.colors.status.error,
      };
    }

    if (isToday(date)) {
      return {
        text: 'Today',
        subtext: format(date, 'h:mm a'),
        color: Theme.colors.status.warning,
      };
    }

    if (isTomorrow(date)) {
      return {
        text: 'Tomorrow',
        subtext: format(date, 'h:mm a'),
        color: Theme.colors.status.info,
      };
    }

    return {
      text: format(date, 'MMM d'),
      subtext: format(date, 'h:mm a'),
      color: palette.textSecondary,
    };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return Theme.colors.status.error;
      case 'high':
        return Theme.colors.status.warning;
      case 'medium':
        return Theme.colors.status.info;
      default:
        return palette.textTertiary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'snoozed':
        return 'time';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'notifications';
    }
  };


  const renderReminderItem = ({ item }: { item: Reminder }) => {
    const timeDisplay = getTimeDisplay(item.reminder_time);
    const priorityColor = getPriorityColor(item.priority);
    const isOverdue = isPast(new Date(item.reminder_time)) && item.status === 'pending';

    return (
      <Card style={styles.reminderCard} variant="elevated">
        <LinearGradient
          colors={[
            `${priorityColor}08`,
            `${priorityColor}03`,
            palette.card,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.reminderCardGradient}
        >
          <View style={[styles.priorityBar, { backgroundColor: priorityColor }]}>
            <View style={[styles.priorityBarGlow, { backgroundColor: priorityColor, opacity: 0.4 }]} />
          </View>

          <View style={styles.reminderContent}>
            <View style={styles.reminderHeader}>
              <View style={styles.reminderTitleRow}>
                <View style={[styles.iconContainer, { backgroundColor: `${priorityColor}15` }]}>
                  <View style={[styles.iconGlow, { backgroundColor: priorityColor }]} />
                  <Ionicons
                    name={getStatusIcon(item.status)}
                    size={18}
                    color={isOverdue ? Theme.colors.status.error : priorityColor}
                  />
                </View>
                <Text style={styles.reminderTitle} numberOfLines={1}>
                  {item.title}
                </Text>
              </View>

              <View style={[
                styles.statusBadge,
                {
                  backgroundColor: `${priorityColor}12`,
                  borderColor: priorityColor,
                  shadowColor: priorityColor,
                }
              ]}>
                <Text style={[styles.statusText, { color: priorityColor }]}>
                  {item.priority}
                </Text>
              </View>
            </View>

            {item.description ? (
              <Text style={styles.reminderDescription} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            <View style={styles.reminderFooter}>
              <View style={styles.timeInfo}>
                <View style={[styles.timeBadge, { backgroundColor: `${timeDisplay.color}12`, borderColor: timeDisplay.color }]}>
                  <Ionicons name="time-outline" size={14} color={timeDisplay.color} />
                  <Text style={[styles.timeText, { color: timeDisplay.color }]}>
                    {timeDisplay.text}
                  </Text>
                </View>
                <Text style={styles.timeSubtext}>
                  {timeDisplay.subtext}
                </Text>
              </View>

              {item.status === 'pending' ? (
                <View style={styles.reminderActions}>
                  <TouchableOpacity
                    onPress={() => handleCompleteReminder(item.id)}
                    style={[
                      styles.actionButton,
                      styles.completeButton,
                      { backgroundColor: `${Theme.colors.status.success}12`, borderColor: Theme.colors.status.success }
                    ]}
                  >
                    <Ionicons name="checkmark" size={20} color={Theme.colors.status.success} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleSnoozeReminder(item)}
                    style={[
                      styles.actionButton,
                      { backgroundColor: `${palette.textSecondary}10`, borderColor: palette.borderDefault }
                    ]}
                  >
                    <Ionicons name="time-outline" size={20} color={palette.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteReminder(item)}
                    style={[
                      styles.actionButton,
                      { backgroundColor: `${Theme.colors.status.error}12`, borderColor: Theme.colors.status.error }
                    ]}
                  >
                    <Ionicons name="trash-outline" size={20} color={Theme.colors.status.error} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>
        </LinearGradient>
      </Card>
    );
  };

  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddModal(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <LinearGradient
            colors={[palette.background, palette.backgroundSecondary]}
            style={styles.modalGradient}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <View style={[styles.modalIconContainer, { backgroundColor: `${Theme.colors.primary}15` }]}>
                  <Ionicons name="add-circle" size={24} color={Theme.colors.primary} />
                </View>
                <Text style={styles.modalTitle}>New Reminder</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={palette.textPrimary} />
              </TouchableOpacity>
            </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Title *</Text>
              <TextInput
                style={styles.textInput}
                value={newReminder.title}
                onChangeText={(text) => setNewReminder({ ...newReminder, title: text })}
                placeholder="Enter reminder title"
                placeholderTextColor={palette.textTertiary}
                returnKeyType="next"
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={newReminder.description}
                onChangeText={(text) => setNewReminder({ ...newReminder, description: text })}
                placeholder="Add details (optional)"
                placeholderTextColor={palette.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                returnKeyType="done"
                blurOnSubmit={true}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Priority</Text>
              <View style={styles.priorityButtons}>
                {(['low', 'medium', 'high', 'urgent'] as const).map(priority => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityButton,
                      newReminder.priority === priority && styles.priorityButtonActive,
                      { borderColor: getPriorityColor(priority) }
                    ]}
                    onPress={() => setNewReminder({ ...newReminder, priority })}
                  >
                    <Text style={[
                      styles.priorityButtonText,
                      { color: newReminder.priority === priority ? palette.textInverse : getPriorityColor(priority) },
                    ]}>
                      {priority}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.dateTimeRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Date</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar" size={18} color={Theme.colors.primary} />
                  <Text style={styles.dateTimeText}>
                    {format(newReminder.date, 'MMM d, yyyy')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Time</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Ionicons name="time" size={18} color={Theme.colors.primary} />
                  <Text style={styles.dateTimeText}>
                    {format(newReminder.time, 'h:mm a')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Button
                variant="outline"
                onPress={() => setShowAddModal(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onPress={handleAddReminder}
                style={styles.modalButton}
              >
                Add Reminder
              </Button>
            </View>
          </ScrollView>

          {showDatePicker && (
            <DateTimePicker
              value={newReminder.date}
              mode="date"
              minimumDate={new Date()}
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) {
                  setNewReminder({ ...newReminder, date });
                }
              }}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={newReminder.time}
              mode="time"
              onChange={(event, time) => {
                setShowTimePicker(false);
                if (time) {
                  setNewReminder({ ...newReminder, time });
                }
              }}
            />
          )}
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              style={styles.headerButton}
            >
              <Ionicons name="add-circle" size={28} color={Theme.colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

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

        <View style={styles.header}>
          <LinearGradient
            colors={[palette.background, palette.background + 'F0']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View style={styles.titleRow}>
                <Text style={styles.headerTitle}>Reminders</Text>
                {reminders.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{reminders.length}</Text>
                  </View>
                )}
              </View>
            </View>
          </LinearGradient>
        </View>

        <FlatList
          data={reminders}
          renderItem={renderReminderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconContainer, { backgroundColor: `${palette.textTertiary}10` }]}>
                <Ionicons name="notifications-off" size={48} color={palette.textTertiary} />
              </View>
              <Text style={styles.emptyText}>No reminders yet</Text>
              <Text style={styles.emptySubtext}>
                Tap + to create your first reminder
              </Text>
            </View>
          }
        />

        {renderAddModal()}
      </View>
    </>
  );
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    marginRight: 8,
  },
  header: {
    marginBottom: Theme.spacing.md,
    overflow: 'hidden',
  },
  headerGradient: {
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  headerTitle: {
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
  listContent: {
    paddingVertical: Theme.spacing.md,
  },
  reminderCard: {
    marginHorizontal: Theme.spacing.lg,
    marginVertical: Theme.spacing.sm,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  reminderCardGradient: {
    flex: 1,
    position: 'relative',
  },
  priorityBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    overflow: 'hidden',
  },
  priorityBarGlow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 8,
  },
  reminderContent: {
    paddingLeft: Theme.spacing.lg,
    paddingRight: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  reminderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  iconGlow: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 12,
    opacity: 0.3,
  },
  reminderTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginLeft: Theme.spacing.md,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  statusText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reminderDescription: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    marginBottom: Theme.spacing.sm,
    lineHeight: Theme.typography.sizes.sm * 1.4,
  },
  reminderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Theme.spacing.sm,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    flex: 1,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1.5,
  },
  timeText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeSubtext: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textTertiary,
  },
  reminderActions: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  completeButton: {
    shadowColor: Theme.colors.status.success,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xxl * 2,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginTop: Theme.spacing.lg,
  },
  emptySubtext: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    marginTop: Theme.spacing.xs,
    textAlign: 'center',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalGradient: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
    marginBottom: Theme.spacing.lg,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
  },
  modalCloseButton: {
    padding: Theme.spacing.xs,
  },
  formGroup: {
    marginBottom: Theme.spacing.lg,
  },
  formLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
    marginBottom: Theme.spacing.sm,
  },
  textInput: {
    backgroundColor: palette.backgroundSecondary,
    borderRadius: Theme.borderRadius.lg,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textPrimary,
    borderWidth: 1.5,
    borderColor: palette.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  priorityButtonActive: {
    backgroundColor: Theme.colors.primary,
    shadowColor: Theme.colors.primary,
    shadowOpacity: 0.3,
  },
  priorityButtonText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    textTransform: 'capitalize',
    letterSpacing: 0.5,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.backgroundSecondary,
    borderRadius: Theme.borderRadius.lg,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: palette.borderLight,
    gap: Theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  dateTimeText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    paddingTop: Theme.spacing.lg,
  },
  modalButton: {
    flex: 1,
  },
});