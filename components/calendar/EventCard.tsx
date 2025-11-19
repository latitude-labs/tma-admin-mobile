import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/Theme';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { CalendarEvent } from '@/types/calendar';
import { format } from 'date-fns';
import Animated, {
  FadeInDown,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Badge } from '@/components/ui';

interface EventCardProps {
  event: CalendarEvent;
  onPress?: () => void;
  onLongPress?: () => void;
  onEditPress?: () => void;
  onDeletePress?: () => void;
  showActions?: boolean;
  index?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onPress,
  onLongPress,
  onEditPress,
  onDeletePress,
  showActions = false,
  index = 0,
}) => {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, {
      damping: 15,
      stiffness: 400,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 400,
    });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress?.();
  };

  const getEventIcon = () => {
    switch (event.type) {
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

  const getEventColor = () => {
    switch (event.type) {
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

  const getStatusBadge = () => {
    if (event.status === 'pending') {
      return (
        <Badge variant="warning" size="sm">
          Pending
        </Badge>
      );
    }
    if (event.status === 'cancelled') {
      return (
        <Badge variant="error" size="sm">
          Cancelled
        </Badge>
      );
    }
    if (event.is_coverage) {
      return (
        <Badge variant="info" size="sm">
          Coverage
        </Badge>
      );
    }
    return null;
  };

  const eventColor = getEventColor();

  return (
    <AnimatedPressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      entering={FadeInDown.delay(index * 50).springify()}
      layout={Layout.springify()}
    >
      <Animated.View style={[styles.container, animatedStyle]}>
        <View style={[styles.colorStrip, { backgroundColor: eventColor }]} />

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconContainer, { backgroundColor: eventColor + '20' }]}>
                <Ionicons
                  name={getEventIcon() as any}
                  size={20}
                  color={eventColor}
                />
              </View>
              <View style={styles.titleContainer}>
                <Text style={styles.title} numberOfLines={1}>
                  {event.title}
                </Text>
                {(event.club || event.class_time) && (
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {event.club?.name || event.class_time?.name}
                  </Text>
                )}
              </View>
            </View>
            {getStatusBadge()}
          </View>

          {/* Time and Details */}
          <View style={styles.details}>
            <View style={styles.timeRow}>
              <Ionicons
                name="time-outline"
                size={14}
                color={palette.textSecondary}
              />
              <Text style={styles.timeText}>
                {format(new Date(event.start_date), 'HH:mm')} -
                {format(new Date(event.end_date), 'HH:mm')}
              </Text>
              {event.all_day && (
                <Badge variant="secondary" size="xs" style={styles.allDayBadge}>
                  All Day
                </Badge>
              )}
            </View>

            {event.coach && (
              <View style={styles.detailRow}>
                <Ionicons
                  name="person-outline"
                  size={14}
                  color={palette.textSecondary}
                />
                <Text style={styles.detailText}>
                  {event.coach.name}
                  {event.is_cover && event.original_user && (
                    <Text style={styles.coverageText}>
                      {' (covering for '}{event.original_user}{')'}
                    </Text>
                  )}
                </Text>
              </View>
            )}

            {event.description && (
              <Text style={styles.description} numberOfLines={2}>
                {event.description}
              </Text>
            )}
          </View>

          {/* Actions */}
          {showActions && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onEditPress?.();
                }}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={palette.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onDeletePress?.();
                }}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={palette.statusError}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Coverage Needed Indicator */}
          {event.metadata?.needs_coverage && (
            <View style={styles.coverageNeeded}>
              <Ionicons
                name="alert-circle"
                size={16}
                color={palette.statusError}
              />
              <Text style={styles.coverageNeededText}>Coverage Needed</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </AnimatedPressable>
  );
};

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: palette.background,
      borderRadius: Theme.borderRadius.lg,
      marginBottom: Theme.spacing.md,
      ...Theme.shadows.sm,
      overflow: 'hidden',
    },
    colorStrip: {
      height: 4,
    },
    content: {
      padding: Theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: Theme.spacing.sm,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: Theme.borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Theme.spacing.sm,
    },
    titleContainer: {
      flex: 1,
    },
    title: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
    },
    subtitle: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
      marginTop: 2,
    },
    details: {
      marginLeft: 44, // Align with title (icon width + margin)
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.xs,
      marginBottom: Theme.spacing.xs,
    },
    timeText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textSecondary,
    },
    allDayBadge: {
      marginLeft: Theme.spacing.xs,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.xs,
      marginBottom: Theme.spacing.xs,
    },
    detailText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
      flex: 1,
    },
    coverageText: {
      fontStyle: 'italic',
      color: palette.statusInfo,
    },
    description: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
      marginTop: Theme.spacing.xs,
      lineHeight: 18,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: Theme.spacing.sm,
      marginTop: Theme.spacing.md,
      paddingTop: Theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: palette.borderLight,
    },
    actionButton: {
      padding: Theme.spacing.sm,
      borderRadius: Theme.borderRadius.md,
      backgroundColor: palette.backgroundSecondary,
    },
    coverageNeeded: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.xs,
      marginTop: Theme.spacing.sm,
      padding: Theme.spacing.sm,
      backgroundColor: `${palette.statusError}10`,
      borderRadius: Theme.borderRadius.sm,
    },
    coverageNeededText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.statusError,
    },
  });