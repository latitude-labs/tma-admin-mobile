import { Badge, Card } from '@/components/ui';
import { Theme } from '@/constants/Theme';
import { useClubStore } from '@/store/clubStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  FadeIn,
  FadeInDown,
  Layout,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';

const AnimatedCard = Animated.createAnimatedComponent(Card);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Separate component to handle animated styles properly
const ClubItem = React.memo(({
  club,
  index,
  isExpanded,
  onToggle,
  palette,
  styles
}: {
  club: any;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  palette: ThemeColors;
  styles: any;
}) => {
  const rotateValue = useSharedValue(isExpanded ? 180 : 0);

  React.useEffect(() => {
    rotateValue.value = withSpring(isExpanded ? 180 : 0, {
      damping: 15,
      stiffness: 200,
    });
  }, [isExpanded]);

  const expandIconStyle = useAnimatedStyle(() => ({
    transform: [{
      rotate: `${rotateValue.value}deg`
    }],
  }));

  return (
    <AnimatedPressable onPress={onToggle}>
      <AnimatedCard
        variant="elevated"
        style={styles.clubCard}
        entering={FadeInDown.delay(index * 100).duration(400).springify()}
        layout={Layout.springify()}
      >
        <View style={styles.clubHeader}>
          <View style={styles.clubIconContainer}>
            <Ionicons name="business" size={28} color={palette.tint} />
          </View>
          <View style={styles.clubTitleSection}>
            <Text style={styles.clubName}>{club.name}</Text>
            <View style={styles.clubMetrics}>
              <View style={styles.metricPill}>
                <Ionicons name="calendar" size={14} color={palette.tint} />
                <Text style={styles.metricText}>
                  {club.class_times ? club.class_times.length : 0} classes
                </Text>
              </View>
            </View>
          </View>
          <Animated.View
            style={[
              styles.expandIcon,
              expandIconStyle
            ]}
          >
            <Ionicons
              name="chevron-down"
              size={20}
              color={palette.textSecondary}
            />
          </Animated.View>
        </View>

        {(club.address || club.postcode) && (
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={16} color={palette.textTertiary} />
            <Text style={styles.locationText}>
              {[club.address, club.postcode].filter(Boolean).join(', ')}
            </Text>
          </View>
        )}

        {isExpanded && club.class_times && club.class_times.length > 0 && (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.expandedContent}
          >
            <View style={styles.scheduleHeader}>
              <View style={styles.scheduleIconContainer}>
                <Ionicons name="time" size={18} color={palette.tint} />
              </View>
              <Text style={styles.scheduleTitle}>Weekly Schedule</Text>
            </View>

            <View style={styles.scheduleGrid}>
              {club.class_times
                .sort((a, b) => {
                  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                  const dayA = dayOrder.indexOf(a.day.toLowerCase());
                  const dayB = dayOrder.indexOf(b.day.toLowerCase());
                  if (dayA !== dayB) return dayA - dayB;
                  return (a.start_time || '').localeCompare(b.start_time || '');
                })
                .map((cls, classIndex) => (
                  <Animated.View
                    key={cls.id}
                    style={styles.scheduleItem}
                    entering={FadeInDown.delay(classIndex * 50).duration(300)}
                  >
                    <View style={styles.dayContainer}>
                      <Text style={styles.dayAbbr}>
                        {cls.day.substring(0, 3).toUpperCase()}
                      </Text>
                      <Text style={styles.timeText}>
                        {cls.start_time?.substring(0, 5)}
                      </Text>
                    </View>
                    <Badge
                      variant={cls.name?.toLowerCase().includes('kid') ? 'warning' : 'info'}
                      size="sm"
                      style={styles.classBadge}
                    >
                      {cls.name || 'Class'}
                    </Badge>
                  </Animated.View>
                ))}
            </View>
          </Animated.View>
        )}
      </AnimatedCard>
    </AnimatedPressable>
  );
});

export default function ClubsScreen() {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const {
    clubs,
    isLoading,
    error,
    isOffline,
    lastSync,
    fetchClubs,
    refreshClubs,
    getClassCountForClub,
    getStudentCountForClub,
  } = useClubStore();

  const expandedCards = useRef<Set<string>>(new Set()).current;
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  const pulseOpacity = useSharedValue(0.3);

  useEffect(() => {
    fetchClubs();
  }, []);

  useEffect(() => {
    if (isLoading && clubs.length === 0) {
      pulseOpacity.value = withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) })
      );
    }
  }, [isLoading, clubs.length]);

  const loadingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // Loading state with friendly animation
  if (isLoading && clubs.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Animated.View style={loadingAnimatedStyle}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.tint} />
            <Text style={styles.loadingText}>Loading your clubs...</Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  // Error state with friendly messaging
  if (error && clubs.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Animated.View
          entering={FadeIn.duration(400)}
          style={styles.errorContainer}
        >
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={56} color={palette.statusError} />
          </View>
          <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              fetchClubs();
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  const toggleCardExpansion = (clubId: string) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (expandedCards.has(clubId)) {
      expandedCards.delete(clubId);
    } else {
      expandedCards.add(clubId);
    }
    forceUpdate();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refreshClubs}
          colors={[palette.tint]}
          tintColor={palette.tint}
        />
      }>
      <View style={styles.content}>
        <Animated.View
          entering={FadeInDown.duration(400).springify()}
          style={styles.headerSection}
        >
          <View style={styles.titleContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>My Clubs</Text>
              {clubs.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{clubs.length}</Text>
                </View>
              )}
            </View>
            {isOffline && (
              <Animated.View
                entering={FadeIn.duration(300)}
                style={styles.offlineBadge}
              >
                <Ionicons name="cloud-offline" size={16} color={palette.textInverse} />
                <Text style={styles.offlineText}>Offline Mode</Text>
              </Animated.View>
            )}
          </View>

          {lastSync && (
            <Animated.Text
              entering={FadeIn.delay(200).duration(300)}
              style={styles.syncText}
            >
              Last updated {new Date(lastSync).toLocaleString('en-GB', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Animated.Text>
          )}
        </Animated.View>

        <View style={styles.clubsGrid}>
          {clubs.map((club, index) => (
            <ClubItem
              key={club.id}
              club={club}
              index={index}
              isExpanded={expandedCards.has(String(club.id))}
              onToggle={() => toggleCardExpansion(String(club.id))}
              palette={palette}
              styles={styles}
            />
          ))}
        </View>

        {clubs.length === 0 && !isLoading && (
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.emptyState}
          >
            <View style={styles.emptyIconContainer}>
              <Ionicons name="business-outline" size={64} color={palette.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No clubs yet</Text>
            <Text style={styles.emptyMessage}>Your clubs will appear here once they're added</Text>
          </Animated.View>
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.backgroundSecondary,
  },
  scrollContent: {
    flexGrow: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: Theme.spacing['2xl'],
    backgroundColor: palette.background,
    borderRadius: Theme.borderRadius.xl,
    ...Theme.shadows.md,
  },
  loadingText: {
    marginTop: Theme.spacing.lg,
    fontSize: Theme.typography.sizes.md,
    color: palette.textSecondary,
    fontFamily: Theme.typography.fonts.medium,
  },
  errorContainer: {
    alignItems: 'center',
    padding: Theme.spacing['2xl'],
    backgroundColor: palette.background,
    borderRadius: Theme.borderRadius.xl,
    ...Theme.shadows.md,
    maxWidth: 320,
  },
  errorIconContainer: {
    padding: Theme.spacing.lg,
    backgroundColor: `${palette.statusError}15`,
    borderRadius: Theme.borderRadius.full,
    marginBottom: Theme.spacing.lg,
  },
  errorTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  errorMessage: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: palette.tint,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.full,
    ...Theme.shadows.sm,
  },
  retryButtonText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
  },
  content: {
    padding: Theme.spacing.lg,
  },
  headerSection: {
    marginBottom: Theme.spacing.xl,
  },
  titleContainer: {
    marginBottom: Theme.spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  title: {
    fontSize: Theme.typography.sizes['2xl'],
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
  },
  countBadge: {
    backgroundColor: palette.tint,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
  },
  countText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.bold,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.statusWarning,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    gap: Theme.spacing.xs,
    marginTop: Theme.spacing.sm,
    alignSelf: 'flex-start',
    ...Theme.shadows.sm,
  },
  offlineText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.semibold,
  },
  syncText: {
    fontSize: Theme.typography.sizes.xs,
    color: palette.textTertiary,
    fontFamily: Theme.typography.fonts.regular,
    marginTop: Theme.spacing.xs,
  },
  clubsGrid: {
    gap: Theme.spacing.lg,
  },
  clubCard: {
    marginBottom: 0,
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
  },
  clubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  clubIconContainer: {
    width: 48,
    height: 48,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: `${palette.tint}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  clubTitleSection: {
    flex: 1,
  },
  clubName: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  clubMetrics: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    backgroundColor: `${palette.tint}10`,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
  },
  metricText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.tint,
  },
  expandIcon: {
    padding: Theme.spacing.xs,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.xs,
    marginBottom: Theme.spacing.sm,
  },
  locationText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    flex: 1,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: palette.borderLight,
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.lg,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  scheduleIconContainer: {
    width: 32,
    height: 32,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: `${palette.tint}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.sm,
  },
  scheduleTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
  },
  scheduleGrid: {
    gap: Theme.spacing.md,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.backgroundSecondary,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
  },
  dayContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  dayAbbr: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
    minWidth: 40,
  },
  timeText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
  },
  classBadge: {
    marginLeft: Theme.spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Theme.spacing['3xl'],
  },
  emptyIconContainer: {
    padding: Theme.spacing.xl,
    backgroundColor: `${palette.textTertiary}10`,
    borderRadius: Theme.borderRadius.full,
    marginBottom: Theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  emptyMessage: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
});
