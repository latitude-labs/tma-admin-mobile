import { Card } from '@/components/ui';
import { Theme } from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';
import React, { useState } from 'react';
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import ColorPalette from '@/constants/Colors';

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
  const colorScheme = useColorScheme();
  const colors = ColorPalette[colorScheme ?? 'light'];
  const styles = React.useMemo(() => createStyles(colors), [colors]);

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
        color: colors.statusError,
        subtext: formatDistanceToNow(date, { addSuffix: true })
      };
    }

    if (isToday(date)) {
      return {
        icon: 'time',
        text: 'Today',
        color: colors.statusWarning,
        subtext: format(date, 'h:mm a')
      };
    }

    if (isTomorrow(date)) {
      return {
        icon: 'calendar',
        text: 'Tomorrow',
        color: colors.statusInfo,
        subtext: format(date, 'h:mm a')
      };
    }

    return {
      icon: 'calendar-outline',
      text: format(date, 'MMM d'),
      color: colors.textSecondary,
      subtext: format(date, 'h:mm a')
    };
  };

  const getPriorityIndicator = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { color: colors.statusError, icon: 'alert' };
      case 'high':
        return { color: colors.statusWarning, icon: 'warning' };
      case 'medium':
        return { color: colors.statusInfo, icon: 'information-circle' };
      default:
        return { color: colors.textTertiary, icon: 'ellipse' };
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
    return null; // Don't show anything when no reminders
  }

  // Get the first reminder for display
  const primaryReminder = activeReminders[0];
  const timeDisplay = getTimeDisplay(primaryReminder.reminder_time);
  const priorityIndicator = getPriorityIndicator(primaryReminder.priority);
  const isOverdue = isPast(new Date(primaryReminder.reminder_time));
  const remainingTotal = reminders.filter(r => r.status === 'pending').length;

  return (
    <View style={styles.container}>
      <View style={styles.toastContent}>
        <View style={[styles.priorityBar, { backgroundColor: priorityIndicator.color }]} />

        <View style={styles.toastLeft}>
          <Ionicons
            name={isOverdue ? 'alert-circle' : 'notifications'}
            size={18}
            color={isOverdue ? colors.statusError : colors.tint}
          />
        </View>

        <View style={styles.toastMiddle}>
          <Text style={styles.toastTitle} numberOfLines={1}>
            {primaryReminder.title}
          </Text>
          <Text style={styles.toastTime}>
            {timeDisplay.text} · {timeDisplay.subtext}
            {remainingTotal > 1 && ` · +${remainingTotal - 1} more`}
          </Text>
        </View>

        <View style={styles.toastActions}>
          <TouchableOpacity
            onPress={() => handleComplete(primaryReminder, 0)}
            style={styles.toastButton}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark" size={18} color={colors.statusSuccess} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleSnooze(primaryReminder)}
            style={styles.toastButton}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onViewAll}
            style={styles.toastButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-forward" size={18} color={colors.tint} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

type Palette = (typeof ColorPalette)['light'];

const createStyles = (palette: Palette) =>
  StyleSheet.create({
    container: {
      marginHorizontal: Theme.spacing.lg,
      marginBottom: Theme.spacing.md,
      borderRadius: Theme.borderRadius.md,
      backgroundColor: palette.tint + '08',
      borderWidth: 1,
      borderColor: palette.tint + '20',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    content: {
      padding: 0,
    },
    loadingContainer: {
      padding: Theme.spacing.lg,
    },
    shimmer: {
      height: 16,
      backgroundColor: palette.backgroundSecondary,
      borderRadius: Theme.borderRadius.sm,
      width: '80%',
    },
    toastContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Theme.spacing.sm,
      paddingHorizontal: Theme.spacing.md,
      position: 'relative',
    },
    priorityBar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
      borderTopLeftRadius: Theme.borderRadius.md,
      borderBottomLeftRadius: Theme.borderRadius.md,
    },
    toastLeft: {
      marginLeft: Theme.spacing.sm,
      marginRight: Theme.spacing.md,
    },
    toastMiddle: {
      flex: 1,
      justifyContent: 'center',
    },
    toastTitle: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
      marginBottom: 2,
    },
    toastTime: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
    },
    toastActions: {
      flexDirection: 'row',
      gap: Theme.spacing.xs,
    },
    toastButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: palette.backgroundSecondary,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
