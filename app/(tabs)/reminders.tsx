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

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
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

type FilterStatus = 'all' | 'pending' | 'completed' | 'snoozed' | 'cancelled';
type FilterPriority = 'all' | 'low' | 'medium' | 'high' | 'urgent';

export default function RemindersScreen() {
  const { user } = useAuthStore();
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('pending');
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('all');
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

  const filteredReminders = reminders.filter(reminder => {
    if (statusFilter !== 'all' && reminder.status !== statusFilter) {
      return false;
    }
    if (priorityFilter !== 'all' && reminder.priority !== priorityFilter) {
      return false;
    }
    return true;
  });

  const renderReminderItem = ({ item }: { item: Reminder }) => {
    const timeDisplay = getTimeDisplay(item.reminder_time);
    const priorityColor = getPriorityColor(item.priority);
    const isOverdue = isPast(new Date(item.reminder_time)) && item.status === 'pending';

    return (
      <Card style={styles.reminderCard} variant="elevated">
        <View style={[styles.priorityBar, { backgroundColor: priorityColor }]} />

        <View style={styles.reminderContent}>
          <View style={styles.reminderHeader}>
            <View style={styles.reminderTitleRow}>
              <Ionicons
                name={getStatusIcon(item.status)}
                size={18}
                color={isOverdue ? Theme.colors.status.error : priorityColor}
              />
              <Text style={styles.reminderTitle} numberOfLines={1}>
                {item.title}
              </Text>
            </View>

            <View style={styles.statusBadge}>
              <Text style={[styles.statusText, { color: priorityColor }]}>
                {item.priority}
              </Text>
            </View>
          </View>

          {item.description && (
            <Text style={styles.reminderDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.reminderFooter}>
            <View style={styles.timeInfo}>
              <Text style={[styles.timeText, { color: timeDisplay.color }]}>
                {timeDisplay.text}
              </Text>
              <Text style={styles.timeSubtext}>
                {timeDisplay.subtext}
              </Text>
            </View>

            {item.status === 'pending' && (
              <View style={styles.reminderActions}>
                <TouchableOpacity
                  onPress={() => handleCompleteReminder(item.id)}
                  style={[styles.actionButton, styles.completeButton]}
                >
                  <Ionicons name="checkmark" size={18} color={Theme.colors.status.success} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSnoozeReminder(item)}
                  style={styles.actionButton}
                >
                  <Ionicons name="time-outline" size={18} color={palette.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDeleteReminder(item)}
                  style={styles.actionButton}
                >
                  <Ionicons name="trash-outline" size={18} color={Theme.colors.status.error} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
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
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Reminder</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.container, { backgroundColor: palette.backgroundSecondary }]}>
        <ScreenHeader
          title="Reminders"
          rightAction={
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              style={styles.headerButton}
            >
              <Ionicons name="add-circle" size={32} color={Theme.colors.primary} />
            </TouchableOpacity>
          }
        />

        <View style={[styles.filterSection, { backgroundColor: palette.background, borderBottomColor: palette.borderLight }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Status:</Text>
              {(['all', 'pending', 'completed', 'snoozed'] as FilterStatus[]).map(status => (
                <Chip
                  key={status}
                  label={status}
                  selected={statusFilter === status}
                  onPress={() => setStatusFilter(status)}
                  style={styles.filterChip}
                />
              ))}
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Priority:</Text>
              {(['all', 'urgent', 'high', 'medium', 'low'] as FilterPriority[]).map(priority => (
                <Chip
                  key={priority}
                  label={priority}
                  selected={priorityFilter === priority}
                  onPress={() => setPriorityFilter(priority)}
                  style={styles.filterChip}
                />
              ))}
            </View>
          </ScrollView>
        </View>

        <FlatList
          data={filteredReminders}
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
              <Ionicons name="notifications-off" size={48} color={palette.textTertiary} />
              <Text style={styles.emptyText}>No reminders found</Text>
              <Text style={styles.emptySubtext}>
                {statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Tap + to create your first reminder'}
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
    backgroundColor: palette.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: 60,
    paddingBottom: Theme.spacing.md,
    backgroundColor: palette.background,
  },
  headerTitle: {
    fontSize: Theme.typography.sizes['2xl'],
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
  },
  headerButton: {
    padding: 4,
  },
  filterSection: {
    backgroundColor: palette.background,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Theme.spacing.lg,
  },
  filterLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
    marginRight: Theme.spacing.sm,
  },
  filterChip: {
    marginHorizontal: Theme.spacing.xs / 2,
  },
  listContent: {
    paddingVertical: Theme.spacing.md,
  },
  reminderCard: {
    marginHorizontal: Theme.spacing.lg,
    marginVertical: Theme.spacing.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  priorityBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  reminderContent: {
    paddingLeft: Theme.spacing.md,
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
  reminderTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: palette.backgroundSecondary,
  },
  statusText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.medium,
    textTransform: 'uppercase',
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
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  timeText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
  },
  timeSubtext: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textTertiary,
  },
  reminderActions: {
    flexDirection: 'row',
    gap: Theme.spacing.xs,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: Theme.colors.status.success + '15',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xxl * 2,
  },
  emptyText: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginTop: Theme.spacing.md,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: palette.background,
    borderTopLeftRadius: Theme.borderRadius.xl,
    borderTopRightRadius: Theme.borderRadius.xl,
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl,
    maxHeight: '80%',
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
  modalTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
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
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textPrimary,
    borderWidth: 1,
    borderColor: palette.borderLight,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  priorityButtonActive: {
    backgroundColor: Theme.colors.primary,
  },
  priorityButtonText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    textTransform: 'capitalize',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.backgroundSecondary,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    borderWidth: 1,
    borderColor: palette.borderLight,
    gap: Theme.spacing.sm,
  },
  dateTimeText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
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