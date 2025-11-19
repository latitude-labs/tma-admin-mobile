import { Badge, Card } from '@/components/ui';
import { Theme } from '@/constants/Theme';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/store/authStore';
import { useClubStore } from '@/store/clubStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';

const AnimatedCard = Animated.createAnimatedComponent(Card);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Separate component to handle animated styles properly
const ClubItem = React.memo(({
  club,
  index,
  isExpanded,
  onToggle,
  onPress,
  isAdmin,
  palette,
  styles
}: {
  club: any;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onPress: () => void;
  isAdmin: boolean;
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
    <AnimatedPressable onPress={isAdmin ? onPress : onToggle}>
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
            {isAdmin ? (
              <Ionicons
                name="chevron-forward"
                size={20}
                color={palette.textSecondary}
              />
            ) : (
              <Ionicons
                name="chevron-down"
                size={20}
                color={palette.textSecondary}
              />
            )}
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

        {!isAdmin && isExpanded && club.class_times && club.class_times.length > 0 && (
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
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.is_admin || false;
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
  const fabScale = useSharedValue(1);
  const fabRotation = useSharedValue(0);

  useEffect(() => {
    if (isAdmin) {
      // Admin users see all clubs from admin endpoint
      useClubStore.getState().fetchAdminClubs();
    } else {
      // Regular users see their assigned clubs
      fetchClubs();
    }
  }, [isAdmin]);

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

  const handleClubPress = (clubId: number) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/club-detail?id=${clubId}`);
  };

  const handleCreateClub = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    fabScale.value = withSequence(
      withSpring(0.9, { duration: 100 }),
      withSpring(1, { duration: 100 })
    );
    fabRotation.value = withSequence(
      withSpring(45, { duration: 200 }),
      withSpring(0, { duration: 200 })
    );
    router.push('/club-form');
  };

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: fabScale.value },
      { rotate: `${fabRotation.value}deg` },
    ],
  }));

  return (
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
      <ScrollView
        style={styles.scrollContainer}
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
        <View style={styles.header}>
          <LinearGradient
            colors={[palette.background, palette.background + 'F0']}
            style={styles.headerGradient}
          >
            <Animated.View
              entering={FadeInDown.duration(400).springify()}
            >
              <View style={styles.titleContainer}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>Clubs</Text>
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
          </LinearGradient>
        </View>

        <View style={styles.clubsGrid}>
          {clubs.map((club, index) => (
            <ClubItem
              key={club.id}
              club={club}
              index={index}
              isExpanded={expandedCards.has(String(club.id))}
              onToggle={() => toggleCardExpansion(String(club.id))}
              onPress={() => handleClubPress(club.id)}
              isAdmin={isAdmin}
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

      {/* Floating Action Button for Admins */}
      {isAdmin && (
        <Animated.View
          style={[
            styles.fab,
            fabAnimatedStyle,
          ]}
          entering={FadeIn.delay(500).duration(300).springify()}
        >
          <Pressable
            style={styles.fabButton}
            onPress={handleCreateClub}
            onPressIn={() => {
              fabScale.value = withSpring(0.9);
            }}
            onPressOut={() => {
              fabScale.value = withSpring(1);
            }}
          >
            <Ionicons name="add" size={28} color={palette.textInverse} />
          </Pressable>
        </Animated.View>
      )}
      </ScrollView>
    </View>
  );
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
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
    paddingHorizontal: Theme.spacing.xs,
  },
  header: {
    marginBottom: Theme.spacing.lg,
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
  titleContainer: {
    marginBottom: Theme.spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  title: {
    fontSize: Theme.typography.sizes.xl,
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
  },
  clubsGrid: {
    gap: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.md,
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
  fab: {
    position: 'absolute',
    bottom: Theme.spacing.xl,
    right: Theme.spacing.xl,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.tint,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadows.lg,
    elevation: 8,
  },
});
