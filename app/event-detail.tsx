import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isSameDay } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Theme } from '@/constants/Theme';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { CalendarEvent, EventType, EventStatus } from '@/types/calendar';
import { Badge, Card } from '@/components/ui';
import { useCalendarStore } from '@/store/calendarStore';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/services/api/client';

interface InfoRowProps {
  icon: string;
  label: string;
  value: string | React.ReactNode;
  color?: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value, color }) => {
  const palette = useThemeColors();
  const styles = useMemo(() => createInfoRowStyles(palette), [palette]);

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Ionicons
          name={icon as any}
          size={18}
          color={color || palette.textSecondary}
        />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={[styles.value, color && { color }]}>{value}</Text>
    </View>
  );
};

export default function EventDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette, insets), [palette, insets]);

  const { user } = useAuthStore();
  const { getEventById, refreshEvents, getCombinedEventsForDate } = useCalendarStore();

  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const eventId = params.id as string;
  const isAdmin = user?.is_admin;

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setLoading(true);

      // Check if this is a generated event (starts with 'generated-')
      if (typeof eventId === 'string' && eventId.startsWith('generated-')) {
        // For generated events, extract the date and find it in combined events
        const parts = eventId.split('-');
        if (parts.length >= 5) {
          // Format: generated-class-{id}-{yyyy-MM-dd}
          const dateStr = `${parts[parts.length - 3]}-${parts[parts.length - 2].padStart(2, '0')}-${parts[parts.length - 1].padStart(2, '0')}`;
          const date = new Date(dateStr);

          if (!isNaN(date.getTime())) {
            const dayEvents = getCombinedEventsForDate(date);
            const generatedEvent = dayEvents.find(e => e.id === eventId);

            if (generatedEvent) {
              setEvent(generatedEvent);
              setLoading(false);
              return;
            }
          }
        }
        Alert.alert('Error', 'Event not found');
        router.back();
        return;
      }

      // First try to get from store for regular events
      const storeEvent = getEventById(eventId);

      if (storeEvent) {
        setEvent(storeEvent);
      } else {
        // Fetch from API if not in store
        const response = await apiClient.get(`/v1/rota/${eventId}`);
        setEvent(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load event:', error);
      Alert.alert('Error', 'Failed to load event details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshEvents();
    await loadEvent();
    setRefreshing(false);
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Generated events cannot be edited
    if (typeof eventId === 'string' && eventId.startsWith('generated-')) {
      Alert.alert('Cannot Edit', 'This is a recurring class event and cannot be edited individually.');
      return;
    }

    // Navigate to edit screen (to be implemented)
    Alert.alert('Edit Event', 'Edit functionality coming soon');
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Generated events cannot be deleted
    if (typeof eventId === 'string' && eventId.startsWith('generated-')) {
      Alert.alert('Cannot Delete', 'This is a recurring class event and cannot be deleted individually.');
      return;
    }

    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/v1/rota/${eventId}`);
              await refreshEvents();
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete event');
            }
          },
        },
      ]
    );
  };

  const getEventIcon = (type: EventType) => {
    switch (type) {
      case 'class':
        return 'school-outline';
      case 'holiday':
        return 'airplane-outline';
      case 'overtime':
        return 'time-outline';
      case 'custom':
        return 'calendar-outline';
      default:
        return 'calendar-outline';
    }
  };

  const getEventColor = (type: EventType) => {
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

  const getStatusColor = (status: EventStatus) => {
    switch (status) {
      case 'scheduled':
        return palette.statusInfo;
      case 'confirmed':
        return palette.statusSuccess;
      case 'cancelled':
        return palette.statusError;
      case 'completed':
        return palette.textSecondary;
      default:
        return palette.textSecondary;
    }
  };

  const formatEventTime = () => {
    if (!event) return '';

    const start = parseISO(event.start_date);
    const end = parseISO(event.end_date);

    if (event.all_day) {
      if (isSameDay(start, end)) {
        return format(start, 'EEEE, d MMMM yyyy');
      } else {
        return `${format(start, 'd MMM')} - ${format(end, 'd MMM yyyy')}`;
      }
    }

    if (isSameDay(start, end)) {
      return `${format(start, 'EEEE, d MMMM yyyy')}\n${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
    }

    return `${format(start, 'd MMM, HH:mm')} - ${format(end, 'd MMM, HH:mm')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.tint} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={64}
          color={palette.textTertiary}
        />
        <Text style={styles.errorText}>Event not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const eventColor = getEventColor(event.type);
  const statusColor = getStatusColor(event.status);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Event Details',
          headerRight: () =>
            isAdmin || event.coach?.id === user?.id ? (
              <View style={styles.headerButtons}>
                <TouchableOpacity onPress={handleEdit} style={styles.headerButton}>
                  <Ionicons name="create-outline" size={22} color={palette.tint} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
                  <Ionicons name="trash-outline" size={22} color={palette.statusError} />
                </TouchableOpacity>
              </View>
            ) : null,
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.springify()}
          style={animatedStyle}
        >
          {/* Header Card */}
          <Card variant="elevated" style={styles.headerCard}>
            <View style={[styles.eventTypeBar, { backgroundColor: eventColor }]} />

            <View style={styles.headerContent}>
              <View style={[styles.iconContainer, { backgroundColor: eventColor + '20' }]}>
                <Ionicons
                  name={getEventIcon(event.type) as any}
                  size={32}
                  color={eventColor}
                />
              </View>

              <Text style={styles.eventTitle}>{event.title}</Text>

              <View style={styles.badgeRow}>
                <Badge variant="secondary" size="sm">
                  {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                </Badge>

                <Badge
                  variant={
                    event.status === 'confirmed' ? 'success' :
                    event.status === 'cancelled' ? 'error' :
                    event.status === 'completed' ? 'secondary' :
                    'info'
                  }
                  size="sm"
                >
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </Badge>

                {event.is_cover && (
                  <Badge variant="warning" size="sm">
                    Coverage
                  </Badge>
                )}

                {event.all_day && (
                  <Badge variant="secondary" size="sm">
                    All Day
                  </Badge>
                )}
              </View>
            </View>
          </Card>

          {/* Time & Date Card */}
          <Card variant="filled" style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar-outline" size={20} color={palette.tint} />
              <Text style={styles.sectionTitle}>Schedule</Text>
            </View>

            <InfoRow
              icon="time-outline"
              label="Date & Time"
              value={formatEventTime()}
            />

            {event.class_time && (
              <>
                <InfoRow
                  icon="school-outline"
                  label="Class"
                  value={event.class_time.name}
                />
                <InfoRow
                  icon="today-outline"
                  label="Regular Schedule"
                  value={`${event.class_time.day}, ${event.class_time.start_time} - ${event.class_time.end_time}`}
                />
              </>
            )}
          </Card>

          {/* Location Card */}
          {event.club && (
            <Card variant="filled" style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="location-outline" size={20} color={palette.tint} />
                <Text style={styles.sectionTitle}>Location</Text>
              </View>

              <InfoRow
                icon="business-outline"
                label="Club"
                value={event.club.name}
              />

              {event.club.address && (
                <InfoRow
                  icon="map-outline"
                  label="Address"
                  value={event.club.address}
                />
              )}
            </Card>
          )}

          {/* People Card */}
          <Card variant="filled" style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people-outline" size={20} color={palette.tint} />
              <Text style={styles.sectionTitle}>People</Text>
            </View>

            {event.coach && (
              <InfoRow
                icon="person-outline"
                label="Coach"
                value={event.coach.name}
              />
            )}

            {event.is_cover && event.original_user && (
              <InfoRow
                icon="swap-horizontal-outline"
                label="Covering For"
                value={event.original_user}
                color={palette.statusWarning}
              />
            )}

            {event.coach?.email && (
              <InfoRow
                icon="mail-outline"
                label="Email"
                value={event.coach.email}
              />
            )}
          </Card>

          {/* Details Card */}
          {(event.description || event.notes) && (
            <Card variant="filled" style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text-outline" size={20} color={palette.tint} />
                <Text style={styles.sectionTitle}>Details</Text>
              </View>

              {event.description && (
                <View style={styles.descriptionContainer}>
                  <Text style={styles.descriptionLabel}>Description</Text>
                  <Text style={styles.descriptionText}>{event.description}</Text>
                </View>
              )}

              {event.notes && (
                <View style={styles.descriptionContainer}>
                  <Text style={styles.descriptionLabel}>Notes</Text>
                  <Text style={styles.descriptionText}>{event.notes}</Text>
                </View>
              )}
            </Card>
          )}

          {/* Metadata Card (if any additional info) */}
          {event.metadata && Object.keys(event.metadata).length > 0 && (
            <Card variant="filled" style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="information-circle-outline" size={20} color={palette.tint} />
                <Text style={styles.sectionTitle}>Additional Information</Text>
              </View>

              {Object.entries(event.metadata).map(([key, value]) => (
                <InfoRow
                  key={key}
                  icon="ellipsis-horizontal-outline"
                  label={key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                  value={String(value)}
                />
              ))}
            </Card>
          )}
        </Animated.View>
      </ScrollView>
    </>
  );
}

const createStyles = (palette: ThemeColors, insets: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.backgroundSecondary,
    },
    contentContainer: {
      paddingHorizontal: Theme.spacing.lg,
      paddingTop: Theme.spacing.lg,
      paddingBottom: insets.bottom + Theme.spacing.xl,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: palette.backgroundSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: palette.backgroundSecondary,
      padding: Theme.spacing.xl,
    },
    errorText: {
      fontSize: Theme.typography.sizes.lg,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textSecondary,
      marginTop: Theme.spacing.md,
      marginBottom: Theme.spacing.xl,
    },
    backButton: {
      paddingHorizontal: Theme.spacing.xl,
      paddingVertical: Theme.spacing.md,
      backgroundColor: palette.tint,
      borderRadius: Theme.borderRadius.full,
    },
    backButtonText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textInverse,
    },
    headerButtons: {
      flexDirection: 'row',
      gap: Theme.spacing.md,
    },
    headerButton: {
      padding: Theme.spacing.xs,
    },
    headerCard: {
      marginBottom: Theme.spacing.lg,
      overflow: 'hidden',
    },
    eventTypeBar: {
      height: 6,
      marginHorizontal: -Theme.spacing.md,
      marginTop: -Theme.spacing.md,
      marginBottom: Theme.spacing.lg,
    },
    headerContent: {
      alignItems: 'center',
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: Theme.borderRadius.xl,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Theme.spacing.md,
    },
    eventTitle: {
      fontSize: Theme.typography.sizes['2xl'],
      fontFamily: Theme.typography.fonts.bold,
      color: palette.textPrimary,
      textAlign: 'center',
      marginBottom: Theme.spacing.md,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: Theme.spacing.sm,
    },
    sectionCard: {
      marginBottom: Theme.spacing.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.sm,
      marginBottom: Theme.spacing.md,
      paddingBottom: Theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderLight,
    },
    sectionTitle: {
      fontSize: Theme.typography.sizes.lg,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
    },
    descriptionContainer: {
      marginBottom: Theme.spacing.md,
    },
    descriptionLabel: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textSecondary,
      marginBottom: Theme.spacing.xs,
    },
    descriptionText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textPrimary,
      lineHeight: 22,
    },
  });

const createInfoRowStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      paddingVertical: Theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderLight,
    },
    labelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.xs,
      marginBottom: Theme.spacing.xs,
    },
    label: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textSecondary,
    },
    value: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textPrimary,
      marginLeft: 26,
      lineHeight: 20,
    },
  });