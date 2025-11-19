import { CalendarView } from '@/components/calendar/CalendarView';
import { HolidayRequestModal } from '@/components/calendar/HolidayRequestModal';
import { OvertimeRequestModal } from '@/components/calendar/OvertimeRequestModal';
import { AddEventModal } from '@/components/calendar/AddEventModal';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { calendarSyncService } from '@/services/calendarSync.service';
import { useAuthStore } from '@/store/authStore';
import { useCalendarStore } from '@/store/calendarStore';
import { CalendarEvent } from '@/types/calendar';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function CalendarScreen() {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
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
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [selectedDateForEvent, setSelectedDateForEvent] = useState<Date | undefined>(undefined);
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedDateForEvent(date);
      setShowAddEventModal(true);
    }
  }, [isAdmin]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <ScreenHeader
          title="Calendar"
          rightAction={
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
          }
        />

        <View style={styles.contentWrapper}>
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

        {!isAdmin ? (
          <View style={styles.bottomActions}>
            <View style={styles.bottomButtonsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={() => setShowHolidayModal(true)}
              >
                <Text style={styles.primaryButtonText}>Request Holiday</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.outlineButton]}
                onPress={() => setShowOvertimeModal(true)}
              >
                <Text style={styles.outlineButtonText}>Request Overtime</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>

      {isAdmin ? (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedDateForEvent(undefined);
            setShowAddEventModal(true);
          }}
        >
          <Ionicons name="add" size={24} color={palette.textInverse} />
        </TouchableOpacity>
      ) : null}

      <HolidayRequestModal
        visible={showHolidayModal}
        onClose={() => setShowHolidayModal(false)}
        onSubmit={() => {
          handleRefresh();
          setShowHolidayModal(false);
        }}
      />

      <OvertimeRequestModal
        visible={showOvertimeModal}
        onClose={() => setShowOvertimeModal(false)}
        onSubmit={() => {
          handleRefresh();
          setShowOvertimeModal(false);
        }}
      />

      <AddEventModal
        visible={showAddEventModal}
        onClose={() => {
          setShowAddEventModal(false);
          setSelectedDateForEvent(undefined);
        }}
        initialDate={selectedDateForEvent}
        onSubmit={() => {
          handleRefresh();
          setShowAddEventModal(false);
          setSelectedDateForEvent(undefined);
        }}
      />
    </View>
    </>
  );
}

const createStyles = (palette: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
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
      bottom: 56 + (Platform.OS === 'ios' ? 20 : 0), // Account for tab bar height
      left: 0,
      right: 0,
      backgroundColor: palette.background,
      borderTopWidth: 1,
      borderTopColor: palette.borderLight,
      paddingHorizontal: Theme.spacing.lg,
      paddingVertical: Theme.spacing.md,
      paddingBottom: Theme.spacing.md,
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
      bottom: 56 + (Platform.OS === 'ios' ? 20 : 0) + 80 + Theme.spacing.md, // Tab bar + buttons + spacing
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
