import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import type { RefreshControlProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/Theme';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { useCalendarStore } from '@/store/calendarStore';
import { CalendarEvent } from '@/types/calendar';
import { calendarSyncService } from '@/services/calendarSync.service';
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  isToday,
} from 'date-fns';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CALENDAR_PADDING = Theme.spacing.sm;
const CALENDAR_WIDTH = screenWidth - CALENDAR_PADDING * 2;
const DAY_WIDTH = CALENDAR_WIDTH / 7;
const MIN_HEIGHT = 120;
const SWIPE_THRESHOLD = 40;
const HOUR_HEIGHT = 60;
const TIME_AXIS_WIDTH = 50;
const TIMELINE_DURATION_HOURS = 16;
const TIMELINE_HEIGHT = TIMELINE_DURATION_HOURS * HOUR_HEIGHT;
const HOLIDAY_STRIPE_SPACING = 32;
const HOLIDAY_STRIPE_HEIGHT = 12;

interface CalendarViewProps {
  onDateSelect?: (date: Date) => void;
  onEventSelect?: (event: CalendarEvent) => void;
  onDateLongPress?: (date: Date) => void;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarView: React.FC<CalendarViewProps> = ({
  onDateSelect,
  onEventSelect,
  onDateLongPress,
  refreshControl,
}) => {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const {
    events,
    eventsLoading,
    filters,
    setSelectedDate,
    getFilteredEvents,
    getCombinedEventsForDate,
    userClassTimes,
    isMonthCached,
  } = useCalendarStore();

  const [currentDate, setCurrentDate] = useState(() => {
    try {
      return new Date();
    } catch (error) {
      console.error('Error initializing current date:', error);
      return new Date();
    }
  });
  const [selectedDate, setSelectedDateLocal] = useState(() => {
    const date = filters.selectedDate || new Date();
    return date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  });
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const scrollViewRef = useRef<ScrollView>(null);

  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const currentTimeLineTop = useSharedValue(0);

  const filteredEvents = useMemo(() => getFilteredEvents(), [events, filters]);

  // Update current time every minute
  useEffect(() => {
    const updateCurrentTime = () => {
      const now = new Date();
      setCurrentTime(now);
      const hours = now.getHours();
      const minutes = now.getMinutes();
      currentTimeLineTop.value = withTiming((hours + minutes / 60) * HOUR_HEIGHT, {
        duration: 300,
      });
    };

    updateCurrentTime();
    const interval = setInterval(updateCurrentTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const startHour = 8;

    // If current time is after 8 AM, scroll to show current time
    if (currentHour >= startHour) {
      const adjustedHour = currentHour - startHour;
      const scrollPosition = Math.max(0, (adjustedHour - 1) * HOUR_HEIGHT); // Show 1 hour before current time

      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: scrollPosition, animated: false });
      }, 100);
    }
  }, [currentDate]);

  // Get combined events for current day (custom + generated from class times)
  const dayEvents = useMemo(() => {
    try {
      const combined = getCombinedEventsForDate(currentDate) || [];
      // No filtering - show all events
      return combined;
    } catch (error) {
      console.error('Error getting day events:', error);
      return [];
    }
  }, [currentDate, events, userClassTimes]);

  // Check and load month data when date changes
  useEffect(() => {
    const loadMonthIfNeeded = async () => {
      if (!currentDate || !(currentDate instanceof Date) || isNaN(currentDate.getTime())) {
        return;
      }

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // getMonth() returns 0-11

      // Check if this month is already loaded
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;

      if (!isMonthCached(monthKey) && !isLoadingMonth) {
        console.log(`Loading data for ${monthKey}`);
        setIsLoadingMonth(true);

        try {
          // Load the month data
          await calendarSyncService.loadMonth(year, month);

          // Prefetch adjacent months in the background
          calendarSyncService.prefetchAdjacentMonths(year, month);
        } catch (error) {
          console.error(`Failed to load month ${monthKey}:`, error);
        } finally {
          setIsLoadingMonth(false);
        }
      }
    };

    loadMonthIfNeeded();
  }, [currentDate, isLoadingMonth, isMonthCached]);

  const handlePreviousDay = useCallback(() => {
    try {
      const previousDay = addDays(currentDate, -1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentDate(previousDay);
      setSelectedDateLocal(previousDay);
      setSelectedDate(previousDay);
    } catch (error) {
      console.error('Error in handlePreviousDay:', error);
    }
  }, [currentDate, setSelectedDate]);

  const handleNextDay = useCallback(() => {
    try {
      const nextDay = addDays(currentDate, 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentDate(nextDay);
      setSelectedDateLocal(nextDay);
      setSelectedDate(nextDay);
    } catch (error) {
      console.error('Error in handleNextDay:', error);
    }
  }, [currentDate, setSelectedDate]);

  const handleToday = useCallback(() => {
    try {
      const today = new Date();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentDate(today);
      setSelectedDateLocal(today);
      setSelectedDate(today);
    } catch (error) {
      console.error('Error in handleToday:', error);
    }
  }, [setSelectedDate]);

  const handleDatePress = useCallback((date: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDateLocal(date);
    setSelectedDate(date);
    onDateSelect?.(date);
  }, [onDateSelect, setSelectedDate]);

  const handleDateLongPress = useCallback((date: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDateLongPress?.(date);
  }, [onDateLongPress]);

  const pan = Gesture.Pan()
    .activeOffsetX([-30, 30]) // Only activate after 30px horizontal movement
    .failOffsetY([-10, 10]) // Fail if vertical movement is detected early
    .onUpdate((event) => {
      'worklet';
      translateX.value = event.translationX * 0.5; // Reduce sensitivity
    })
    .onEnd((event) => {
      'worklet';
      try {
        if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
          if (event.translationX > 0) {
            // Swipe right - previous day
            runOnJS(handlePreviousDay)();
          } else {
            // Swipe left - next day
            runOnJS(handleNextDay)();
          }
        }
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      } catch (error) {
        runOnJS(console.error)('Error in pan gesture:', error);
        translateX.value = withSpring(0);
      }
    });

  const animatedCalendarStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: opacity.value,
      transform: [
        { translateX: translateX.value * 0.3 },
      ],
    };
  });

  const getEventColor = (type: string): string => {
    switch (type) {
      case 'class':
        return palette.tint;
      case 'holiday':
        return palette.statusInfo;
      case 'overtime':
        return palette.statusSuccess;
      case 'custom':
        return '#9C27B0';
      default:
        return palette.textSecondary;
    }
  };

  const getDayLabel = () => {
    try {
      const dayLabel = format(currentDate, 'EEEE, MMMM d, yyyy');
      return dayLabel;
    } catch (error) {
      console.error('Error formatting day label:', error);
      return 'Day View';
    }
  };

  const isCurrentDateToday = useMemo(() => {
    try {
      return isToday(currentDate);
    } catch (error) {
      return false;
    }
  }, [currentDate]);

  // Helper function to clean event title by removing club name if it's duplicated
  const getCleanEventTitle = (event: CalendarEvent) => {
    if (!event.title) return '';

    // If there's a club name and it appears at the end of the title, remove it
    if (event.club?.name) {
      const clubName = event.club.name;
      // Check if title ends with " - ClubName"
      const suffix = ` - ${clubName}`;
      if (event.title.endsWith(suffix)) {
        return event.title.slice(0, -suffix.length);
      }
      // Check if title ends with just "ClubName"
      if (event.title.endsWith(clubName)) {
        const cleanTitle = event.title.slice(0, -clubName.length).trim();
        // Remove trailing dash if exists
        return cleanTitle.endsWith('-') ? cleanTitle.slice(0, -1).trim() : cleanTitle;
      }
    }

    return event.title;
  };

  const renderTimeAxis = () => {
    // Start at 8 AM and go through the day (8 AM to 11 PM = 16 hours)
    const startHour = 8;
    const hours = Array.from({ length: 16 }, (_, i) => startHour + i);
    return (
      <View style={styles.timeAxis}>
        {hours.map((hour) => (
          <View key={hour} style={styles.timeSlot}>
            <Text style={styles.timeLabel}>
              {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  // Move the animated style hook outside of the render function to avoid conditional hook calls
  const currentTimeLineAnimatedStyle = useAnimatedStyle(() => {
    // Adjust for 8 AM start
    const startHour = 8;
    const adjustedPosition = Math.max(0, currentTimeLineTop.value - startHour * HOUR_HEIGHT);
    return {
      transform: [{ translateY: adjustedPosition }],
    };
  });

  const renderCurrentTimeLine = () => {
    if (!isCurrentDateToday) return null;

    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    const startHour = 8;

    // Only show line if current time is after 8 AM
    if (currentHour < startHour) return null;

    return (
      <Animated.View style={[styles.currentTimeLine, currentTimeLineAnimatedStyle]}>
        <View style={styles.currentTimeCircle} />
        <View style={styles.currentTimeLineBar} />
      </Animated.View>
    );
  };

  const renderEventsOnTimeline = () => {
    const eventPositions: any[] = [];
    const startHour = 8; // Timeline starts at 8 AM

    // Separate holiday events from regular events
    const holidayEvents = dayEvents.filter(event => event.type === 'holiday' && event.all_day);
    const timelineEvents = dayEvents.filter(event => event.type !== 'holiday' || !event.all_day);
    const hasHoliday = holidayEvents.length > 0;
    const stripeCount = Math.ceil((TIMELINE_HEIGHT + screenHeight) / HOLIDAY_STRIPE_SPACING) + 4;

    // Group events by overlapping time ranges
    const eventGroups: any[][] = [];

    timelineEvents.forEach((event) => {
      if (!event.start_date) return;

      const startDate = new Date(event.start_date);
      const endDate = event.end_date ? new Date(event.end_date) : new Date(startDate.getTime() + 60 * 60 * 1000);

      // Find a group where this event overlaps with existing events
      let addedToGroup = false;
      for (const group of eventGroups) {
        const overlaps = group.some(groupEvent => {
          const groupStart = new Date(groupEvent.start_date);
          const groupEnd = groupEvent.end_date ? new Date(groupEvent.end_date) : new Date(groupStart.getTime() + 60 * 60 * 1000);

          // Check if times overlap
          return (startDate < groupEnd && endDate > groupStart);
        });

        if (overlaps) {
          group.push(event);
          addedToGroup = true;
          break;
        }
      }

      // If no overlapping group found, create a new group
      if (!addedToGroup) {
        eventGroups.push([event]);
      }
    });

    // Calculate positions for each event
    eventGroups.forEach((group) => {
      const numEvents = group.length;
      const availableWidth = CALENDAR_WIDTH - TIME_AXIS_WIDTH - Theme.spacing.lg * 2;
      const eventWidth = availableWidth / numEvents;

      group.forEach((event, index) => {
        if (!event.start_date) return;

        const startDate = new Date(event.start_date);
        const endDate = event.end_date ? new Date(event.end_date) : new Date(startDate.getTime() + 60 * 60 * 1000);

        const startHourTime = startDate.getHours() + startDate.getMinutes() / 60;
        const endHourTime = endDate.getHours() + endDate.getMinutes() / 60;

        // Only show events that occur after 8 AM
        if (startHourTime < startHour) return;

        // Adjust position relative to 8 AM start
        const top = (startHourTime - startHour) * HOUR_HEIGHT;
        const height = Math.max((endHourTime - startHourTime) * HOUR_HEIGHT, HOUR_HEIGHT * 0.5);
        const left = TIME_AXIS_WIDTH + Theme.spacing.sm + (index * eventWidth);
        const width = eventWidth - Theme.spacing.xs;

        eventPositions.push({
          event,
          top,
          height,
          left,
          width,
        });
      });
    });

    return (
      <>
        {holidayEvents.length > 0 && (
          <View style={styles.holidayOverlay} pointerEvents="none">
            <View style={styles.holidayBanner}>
              <Ionicons name="airplane" size={18} color={palette.statusWarning} />
              <Text style={styles.holidayText}>
                {holidayEvents[0].coach?.name || 'User'} is unavailable - {holidayEvents[0].title || 'Holiday'}
                {holidayEvents[0].metadata?.total_days > 1 &&
                  ` (Day ${holidayEvents[0].metadata.day_of_period} of ${holidayEvents[0].metadata.total_days})`
                }
              </Text>
            </View>
            <View style={styles.holidayStripesContainer}>
              {Array.from({ length: stripeCount }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.holidayStripe,
                    {
                      top: i * HOLIDAY_STRIPE_SPACING - screenHeight,
                      backgroundColor: palette.textTertiary,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {eventPositions.map(({ event, top, height, left, width }) => (
          <TouchableOpacity
            key={event.id}
            style={[
              styles.timelineEvent,
              {
                top,
                height,
                left,
                width,
                backgroundColor: hasHoliday ? palette.backgroundSecondary : `${getEventColor(event.type)}20`,
                borderLeftColor: hasHoliday ? palette.borderDefault : getEventColor(event.type),
                opacity: hasHoliday ? 0.5 : 1,
              },
            ]}
            onPress={() => onEventSelect?.(event)}
            activeOpacity={0.8}
          >
            <Text style={[styles.timelineEventTitle, hasHoliday && styles.unavailableText]} numberOfLines={1}>
              {getCleanEventTitle(event)}
            </Text>
            <Text style={[styles.timelineEventTime, hasHoliday && styles.unavailableText]}>
              {event.start_date ? format(new Date(event.start_date), 'h:mm a') : ''}
            </Text>
            {event.club && (
              <Text style={[styles.timelineEventLocation, hasHoliday && styles.unavailableText]} numberOfLines={1}>
                {event.club.name}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </>
    );
  };

  const renderDayView = () => (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.dayView, animatedCalendarStyle]}>
        {isLoadingMonth && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color={palette.tint} />
            <Text style={styles.loadingBannerText}>Loading calendar data...</Text>
          </View>
        )}
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          style={styles.dayScrollView}
          contentContainerStyle={styles.dayContentContainer}
          refreshControl={refreshControl}
        >
          <View style={styles.timelineContainer}>
            {renderTimeAxis()}
            <View style={styles.eventsContainer}>
              {Array.from({ length: 16 }, (_, i) => (
                <View key={i} style={[styles.hourLine, { top: i * HOUR_HEIGHT }]} />
              ))}
              {renderEventsOnTimeline()}
              {renderCurrentTimeLine()}
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );

  return (
    <View style={styles.container}>
      <View style={styles.stickyHeader}>
        <TouchableOpacity onPress={handlePreviousDay} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color={palette.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.dayTitle}>{getDayLabel()}</Text>
          {!isCurrentDateToday && (
            <TouchableOpacity onPress={handleToday} style={styles.todayButton}>
              <Ionicons name="calendar" size={14} color={palette.tint} style={styles.todayButtonIcon} />
              <Text style={styles.todayButtonText}>Go to Today</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={handleNextDay} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color={palette.textPrimary} />
        </TouchableOpacity>
      </View>

      {renderDayView()}
    </View>
  );
};


const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    stickyHeader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Theme.spacing.lg,
      paddingVertical: Theme.spacing.md,
      backgroundColor: palette.background,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderLight,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.05,
      shadowRadius: 3.84,
      elevation: 5,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Theme.spacing.lg,
      paddingVertical: Theme.spacing.md,
      backgroundColor: palette.background,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderLight,
    },
    navButton: {
      padding: Theme.spacing.sm,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    dayTitle: {
      fontSize: Theme.typography.sizes.lg,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
    },
    todayButton: {
      marginTop: Theme.spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.xs,
      paddingHorizontal: Theme.spacing.sm,
      paddingVertical: Theme.spacing.xs,
      borderRadius: Theme.borderRadius.sm,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: palette.borderLight,
    },
    todayButtonText: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.tint,
    },
    todayButtonIcon: {
      marginTop: -1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: Theme.spacing.md,
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
    },
    loadingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${palette.tint}10`,
      paddingVertical: Theme.spacing.sm,
      paddingHorizontal: Theme.spacing.md,
      gap: Theme.spacing.sm,
    },
    loadingBannerText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.tint,
    },
    dayView: {
      flex: 1,
      backgroundColor: palette.background,
      marginTop: 80, // Add space for sticky header
    },
    dayScrollView: {
      flex: 1,
    },
    dayContentContainer: {
      paddingHorizontal: Theme.spacing.lg,
      paddingVertical: Theme.spacing.md,
      paddingBottom: Theme.spacing.xxl * 3,
    },
    dayEventsList: {
      gap: Theme.spacing.md,
    },
    emptyDay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: Theme.spacing.xxl * 2,
    },
    emptyDayTitle: {
      fontSize: Theme.typography.sizes.xl,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textSecondary,
      marginTop: Theme.spacing.md,
    },
    emptyDaySubtitle: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textTertiary,
      marginTop: Theme.spacing.xs,
    },
    eventCard: {
      backgroundColor: palette.backgroundSecondary,
      borderRadius: Theme.borderRadius.lg,
      padding: Theme.spacing.md,
      marginBottom: Theme.spacing.sm,
      borderLeftWidth: 4,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.05,
      shadowRadius: 3.84,
      elevation: 2,
    },
    firstEventCard: {
      marginTop: 0,
    },
    eventHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Theme.spacing.sm,
    },
    eventBadges: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    eventTimeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.xs,
    },
    eventTime: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textSecondary,
    },
    eventTimeSeparator: {
      color: palette.textTertiary,
    },
    eventTypeBadge: {
      paddingHorizontal: Theme.spacing.sm,
      paddingVertical: Theme.spacing.xs / 2,
      borderRadius: Theme.borderRadius.sm,
    },
    eventTypeText: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.semibold,
      textTransform: 'capitalize',
    },
    eventTitle: {
      fontSize: Theme.typography.sizes.lg,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
      marginBottom: Theme.spacing.xs,
    },
    eventLocationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.xs / 2,
      marginBottom: Theme.spacing.xs,
    },
    eventLocation: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textTertiary,
    },
    eventDescription: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
      lineHeight: Theme.typography.sizes.sm * 1.4,
      marginTop: Theme.spacing.xs,
    },
    timelineContainer: {
      flexDirection: 'row',
      minHeight: TIMELINE_HEIGHT,
    },
    timeAxis: {
      width: TIME_AXIS_WIDTH,
      paddingTop: Theme.spacing.xs,
    },
    timeSlot: {
      height: HOUR_HEIGHT,
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingRight: Theme.spacing.sm,
    },
    timeLabel: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textTertiary,
      marginTop: -6, // Align with hour line
    },
    eventsContainer: {
      flex: 1,
      position: 'relative',
    },
    hourLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: palette.borderLight,
    },
    timelineEvent: {
      position: 'absolute',
      borderLeftWidth: 3,
      borderRadius: Theme.borderRadius.sm,
      padding: Theme.spacing.sm,
      overflow: 'hidden',
    },
    timelineEventTitle: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
      marginBottom: 2,
    },
    timelineEventTime: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
    },
    timelineEventLocation: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textTertiary,
      marginTop: 2,
    },
    currentTimeLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 2,
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 100,
    },
    currentTimeCircle: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#FF4444',
      marginLeft: -6,
    },
    currentTimeLineBar: {
      flex: 1,
      height: 2,
      backgroundColor: '#FF4444',
    },
    holidayOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: `${palette.textTertiary}05`,
      zIndex: 1,
    },
    holidayBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.sm,
      backgroundColor: `${palette.statusWarning}15`,
      borderLeftWidth: 4,
      borderLeftColor: palette.statusWarning,
      paddingHorizontal: Theme.spacing.md,
      paddingVertical: Theme.spacing.sm,
      marginTop: Theme.spacing.md,
      marginHorizontal: Theme.spacing.sm,
      borderRadius: Theme.borderRadius.md,
      zIndex: 2,
    },
    holidayText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
      flex: 1,
    },
    holidayStripesContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
    },
    holidayStripe: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: HOLIDAY_STRIPE_HEIGHT,
      opacity: 0.08,
    },
    unavailableText: {
      color: palette.textSecondary,
      opacity: 0.7,
    },
  });
