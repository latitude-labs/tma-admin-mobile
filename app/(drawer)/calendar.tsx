import { CalendarView } from '@/components/calendar/CalendarView';
import { HolidayRequestModal } from '@/components/calendar/HolidayRequestModal';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { calendarSyncService } from '@/services/calendarSync.service';
import { useAuthStore } from '@/store/authStore';
import { useCalendarStore } from '@/store/calendarStore';
import { CalendarEvent } from '@/types/calendar';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CalendarScreen() {
  const palette = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(palette, insets), [palette, insets]);
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    events,
    eventsLoading,
    setSelectedDate,
    getCombinedEventsForDate,
  } = useCalendarStore();

  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = user?.is_admin;
  const canManageTeam = isAdmin;

  useEffect(() => {
    // Initialize calendar sync service
    calendarSyncService.initialize();

    // Cleanup on unmount
    return () => {
      calendarSyncService.dispose();
    };
  }, []);


  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await calendarSyncService.forceSync();
    setRefreshing(false);
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleEventSelect = useCallback((event: CalendarEvent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigate to event detail screen
    router.push({
      pathname: '/event-detail',
      params: { id: String(event.id) }
    });
  }, [router]);

  const handleDateLongPress = useCallback((date: Date) => {
    // For admins, show option to create event
    if (isAdmin) {
      Alert.alert(
        'Create Event',
        `Create an event for ${format(date, 'MMMM d, yyyy')}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create',
            onPress: () => {
              // Navigate to event creation
              console.log('Create event for', date);
            },
          },
        ]
      );
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [isAdmin]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleRefresh}
          >
            <Ionicons
              name="refresh"
              size={24}
              color={palette.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content - Calendar scrollable behind fixed buttons */}
      <View style={styles.contentWrapper}>
        {/* Calendar View */}
        <CalendarView
          onDateSelect={handleDateSelect}
          onEventSelect={handleEventSelect}
          onDateLongPress={handleDateLongPress}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[palette.tint]}
              tintColor={palette.tint}
              progressViewOffset={80}
            />
          }
        />

        {/* Fixed Bottom Action Buttons */}
        <View style={styles.bottomActions}>
          <View style={styles.bottomButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => setShowHolidayModal(true)}
            >
              <Ionicons name="airplane" size={20} color={palette.textInverse} />
              <Text style={styles.primaryButtonText}>Request Holiday</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.outlineButton]}
              onPress={() => setShowOvertimeModal(true)}
            >
              <Ionicons name="time" size={20} color={palette.tint} />
              <Text style={styles.outlineButtonText}>Request Overtime</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Floating Action Button for Admin */}
      {isAdmin && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => console.log('Create new event')}
        >
          <Ionicons name="add" size={24} color={palette.textInverse} />
        </TouchableOpacity>
      )}

      {/* Holiday Request Modal */}
      <HolidayRequestModal
        visible={showHolidayModal}
        onClose={() => setShowHolidayModal(false)}
        onSubmit={() => {
          handleRefresh();
          setShowHolidayModal(false);
        }}
      />
    </View>
  );
}

const createStyles = (palette: any, insets: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Theme.spacing.lg,
      paddingVertical: Theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderLight,
    },
    title: {
      fontSize: Theme.typography.sizes.xl,
      fontFamily: Theme.typography.fonts.bold,
      color: palette.textPrimary,
    },
    headerActions: {
      flexDirection: 'row',
      gap: Theme.spacing.sm,
    },
    headerButton: {
      padding: Theme.spacing.sm,
    },
    contentWrapper: {
      flex: 1,
      position: 'relative',
    },
    bottomActions: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: palette.background,
      borderTopWidth: 1,
      borderTopColor: palette.borderLight,
      paddingHorizontal: Theme.spacing.lg,
      paddingVertical: Theme.spacing.md,
      paddingBottom: Math.max(insets.bottom, Theme.spacing.md),
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: -2,
      },
      shadowOpacity: 0.05,
      shadowRadius: 3.84,
      elevation: 5,
    },
    bottomButtonsContainer: {
      flexDirection: 'row',
      gap: Theme.spacing.md,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Theme.spacing.sm,
      paddingVertical: Theme.spacing.md,
      borderRadius: Theme.borderRadius.lg,
    },
    primaryButton: {
      backgroundColor: palette.tint,
    },
    primaryButtonText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textInverse,
    },
    outlineButton: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: palette.tint,
    },
    outlineButtonText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.tint,
    },
    fab: {
      position: 'absolute',
      bottom: 120 + Math.max(insets.bottom, Theme.spacing.md),
      right: Theme.spacing.lg,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: palette.tint,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
  });
