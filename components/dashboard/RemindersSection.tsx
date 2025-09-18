import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/Theme';
import { Card } from '@/components/ui';
import { formatDistanceToNow, isPast, isToday, isTomorrow, format } from 'date-fns';

interface Reminder {
  id: number;
  title: string;
  description?: string;
  reminder_time: string;
  status: 'pending' | 'completed' | 'snoozed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  booking_id?: number;
  user_id: number;
}

interface RemindersSectionProps {
  reminders: Reminder[];
  onCompleteReminder: (id: number) => void;
  onSnoozeReminder: (id: number, snoozeUntil: Date) => void;
  onAddReminder: () => void;
  onViewAll: () => void;
  loading?: boolean;
}

export function RemindersSection({
  reminders,
  onCompleteReminder,
  onSnoozeReminder,
  onAddReminder,
  onViewAll,
  loading = false
}: RemindersSectionProps) {
  const [animatedValues] = useState(() =>
    new Array(2).fill(null).map(() => new Animated.Value(1))
  );

  // Filter and sort reminders
  const activeReminders = reminders
    .filter(r => r.status === 'pending')
    .sort((a, b) => {
      // Sort by priority first (urgent > high > medium > low)
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by time
      return new Date(a.reminder_time).getTime() - new Date(b.reminder_time).getTime();
    })
    .slice(0, 2); // Only show top 2

  const remainingCount = reminders.filter(r => r.status === 'pending').length - 2;

  const handleComplete = (reminder: Reminder, index: number) => {
    // Animate out
    Animated.timing(animatedValues[index], {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onCompleteReminder(reminder.id);
      // Reset animation value for next reminder
      animatedValues[index].setValue(1);
    });
  };

  const handleSnooze = (reminder: Reminder) => {
    Alert.alert(
      '⏰ Snooze Reminder',
      `"${reminder.title}"`,
      [
        {
          text: '15 minutes',
          onPress: () => {
            const snoozeTime = new Date();
            snoozeTime.setMinutes(snoozeTime.getMinutes() + 15);
            onSnoozeReminder(reminder.id, snoozeTime);
          }
        },
        {
          text: '1 hour',
          onPress: () => {
            const snoozeTime = new Date();
            snoozeTime.setHours(snoozeTime.getHours() + 1);
            onSnoozeReminder(reminder.id, snoozeTime);
          }
        },
        {
          text: 'Tomorrow 9am',
          onPress: () => {
            const snoozeTime = new Date();
            snoozeTime.setDate(snoozeTime.getDate() + 1);
            snoozeTime.setHours(9, 0, 0, 0);
            onSnoozeReminder(reminder.id, snoozeTime);
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const getTimeDisplay = (reminderTime: string) => {
    const date = new Date(reminderTime);

    if (isPast(date)) {
      return {
        icon: 'alert-circle',
        text: 'Overdue',
        color: Theme.colors.status.error,
        subtext: formatDistanceToNow(date, { addSuffix: true })
      };
    }

    if (isToday(date)) {
      return {
        icon: 'time',
        text: 'Today',
        color: Theme.colors.status.warning,
        subtext: format(date, 'h:mm a')
      };
    }

    if (isTomorrow(date)) {
      return {
        icon: 'calendar',
        text: 'Tomorrow',
        color: Theme.colors.status.info,
        subtext: format(date, 'h:mm a')
      };
    }

    return {
      icon: 'calendar-outline',
      text: format(date, 'MMM d'),
      color: Theme.colors.text.secondary,
      subtext: format(date, 'h:mm a')
    };
  };

  const getPriorityIndicator = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { color: Theme.colors.status.error, icon: 'alert' };
      case 'high':
        return { color: Theme.colors.status.warning, icon: 'warning' };
      case 'medium':
        return { color: Theme.colors.status.info, icon: 'information-circle' };
      default:
        return { color: Theme.colors.text.tertiary, icon: 'ellipse' };
    }
  };

  if (loading) {
    return (
      <Card variant="elevated" style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.shimmer} />
          <View style={[styles.shimmer, { width: '60%', marginTop: 8 }]} />
        </View>
      </Card>
    );
  }

  if (activeReminders.length === 0) {
    return (
      <Card variant="elevated" style={styles.container}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="checkmark-circle" size={32} color={Theme.colors.status.success} />
          </View>
          <View style={styles.emptyTextContainer}>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtext}>No reminders pending</Text>
          </View>
          <TouchableOpacity onPress={onAddReminder} style={styles.addButton}>
            <Ionicons name="add" size={24} color={Theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </Card>
    );
  }

  return (
    <Card variant="elevated" style={styles.container}>
      <View style={styles.content}>
        {activeReminders.map((reminder, index) => {
          const timeDisplay = getTimeDisplay(reminder.reminder_time);
          const priorityIndicator = getPriorityIndicator(reminder.priority);
          const isOverdue = isPast(new Date(reminder.reminder_time));

          return (
            <Animated.View
              key={reminder.id}
              style={[
                styles.reminderItem,
                index > 0 && styles.reminderItemBorder,
                { opacity: animatedValues[index] }
              ]}
            >
              <View style={styles.reminderLeft}>
                <View style={[styles.timeIndicator, { backgroundColor: timeDisplay.color + '15' }]}>
                  <Ionicons name={timeDisplay.icon as any} size={20} color={timeDisplay.color} />
                </View>

                <View style={styles.reminderContent}>
                  <View style={styles.reminderHeader}>
                    <Text style={styles.reminderTitle} numberOfLines={1}>
                      {reminder.title}
                    </Text>
                    {reminder.priority !== 'low' && (
                      <View style={[styles.priorityDot, { backgroundColor: priorityIndicator.color }]} />
                    )}
                  </View>

                  <View style={styles.reminderMeta}>
                    <Text style={[styles.timeText, { color: timeDisplay.color }]}>
                      {timeDisplay.text}
                    </Text>
                    <Text style={styles.timeSubtext}>
                      {timeDisplay.subtext}
                    </Text>
                  </View>

                  {reminder.description && (
                    <Text style={styles.reminderDescription} numberOfLines={1}>
                      {reminder.description}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.reminderActions}>
                <TouchableOpacity
                  onPress={() => handleComplete(reminder, index)}
                  style={[styles.actionButton, styles.completeButton]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSnooze(reminder)}
                  style={[styles.actionButton, styles.snoozeButton]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={20} color={Theme.colors.text.secondary} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          );
        })}

        {remainingCount > 0 && (
          <TouchableOpacity onPress={onViewAll} style={styles.viewAllButton} activeOpacity={0.7}>
            <Text style={styles.viewAllText}>
              View {remainingCount} more reminder{remainingCount > 1 ? 's' : ''}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={Theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: '#fff',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    padding: 0,
  },
  loadingContainer: {
    padding: Theme.spacing.lg,
  },
  shimmer: {
    height: 16,
    backgroundColor: Theme.colors.background.secondary,
    borderRadius: Theme.borderRadius.sm,
    width: '80%',
  },
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  emptyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.colors.status.success + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  emptyTextContainer: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
  },
  emptySubtext: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  reminderItemBorder: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border.light,
  },
  reminderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  reminderContent: {
    flex: 1,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  reminderTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
    flex: 1,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: Theme.spacing.xs,
  },
  reminderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  timeText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
  },
  timeSubtext: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.tertiary,
  },
  reminderDescription: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
    marginTop: 4,
  },
  reminderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: Theme.colors.status.success,
  },
  snoozeButton: {
    backgroundColor: Theme.colors.background.secondary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    paddingVertical: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border.light,
  },
  viewAllText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.primary,
  },
});