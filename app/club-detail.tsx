import { Badge, Card, ScreenHeader, toast } from '@/components/ui';
import { MapView } from '@/components/ui/MapView';
import { Theme } from '@/constants/Theme';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { classTimesService } from '@/services/api/classTimes.service';
import { useAuthStore } from '@/store/authStore';
import { useClubStore } from '@/store/clubStore';
import { ClassTime } from '@/types/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

const AnimatedCard = Animated.createAnimatedComponent(Card);

// Info section component
const InfoRow = React.memo(({
  icon,
  label,
  value,
  palette,
  styles,
}: {
  icon: string;
  label: string;
  value: string | undefined | null;
  palette: ThemeColors;
  styles: any;
}) => {
  if (!value) return null;

  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconContainer}>
        <Ionicons name={icon as any} size={18} color={palette.tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
});

export default function ClubDetailScreen() {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.is_admin || false;

  const {
    selectedClub,
    isLoading,
    isDeleting,
    error,
    fetchAdminClub,
    deleteClub,
    clearError,
  } = useClubStore();

  const [deletingClassTimeId, setDeletingClassTimeId] = useState<number | null>(null);
  const scaleValue = useSharedValue(1);

  useEffect(() => {
    if (id) {
      fetchAdminClub(parseInt(id));
    }
    return () => {
      clearError();
    };
  }, [id]);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const handleEdit = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/club-form?id=${id}`);
  };

  const handleEditClassTime = (classTime: ClassTime) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/class-time-form?clubId=${id}&classTimeId=${classTime.id}`);
  };

  const handleDeleteClassTime = (classTime: ClassTime) => {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    Alert.alert(
      'Delete Class Time',
      `Are you sure you want to delete ${classTime.name} on ${classTime.day}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingClassTimeId(classTime.id);
            try {
              await classTimesService.deleteClassTime(classTime.id);
              if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              // Refresh the club data to get updated class times
              await fetchAdminClub(parseInt(id));
              toast.success('Class time deleted successfully');
            } catch (error) {
              if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              }
              toast.error('Failed to delete class time. It may have active bookings.');
            } finally {
              setDeletingClassTimeId(null);
            }
          },
        },
      ],
    );
  };

  const handleAddClassTime = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/class-time-form?clubId=${id}`);
  };

  const handleDelete = () => {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    Alert.alert(
      'Delete Club',
      `Are you sure you want to delete ${selectedClub?.name}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteClub(parseInt(id));
              if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              router.back();
            } catch (error) {
              if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              }
              Alert.alert('Error', 'Failed to delete club. It may have associated class times.');
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <ScreenHeader title="Loading..." />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.tint} />
            <Text style={styles.loadingText}>Loading club details...</Text>
          </View>
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <ScreenHeader title="Error" />
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={56} color={palette.statusError} />
            <Text style={styles.errorTitle}>Failed to load club</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => fetchAdminClub(parseInt(id))}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  if (!selectedClub) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <ScreenHeader
          title={selectedClub.name}
          rightAction={
            isAdmin ? (
              <View style={styles.headerActions}>
                <Pressable
                  onPress={handleEdit}
                  style={styles.headerButton}
                >
                  <Ionicons name="create" size={24} color={palette.tint} />
                </Pressable>
                <Pressable
                  onPress={handleDelete}
                  style={styles.headerButton}
                >
                  <Ionicons name="trash" size={24} color={palette.statusError} />
                </Pressable>
              </View>
            ) : undefined
          }
        />

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        {/* Map Section */}
        {(selectedClub.latitude && selectedClub.longitude) ? (
          <Animated.View entering={FadeInDown.duration(400).springify()}>
            <MapView
              latitude={selectedClub.latitude}
              longitude={selectedClub.longitude}
              markerTitle={selectedClub.name}
              height={300}
              zoomLevel={16}
              style={styles.map}
            />
          </Animated.View>
        ) : (
          <AnimatedCard
            variant="filled"
            style={styles.noMapCard}
            entering={FadeInDown.duration(400).springify()}
          >
            <View style={styles.noMapContent}>
              <Ionicons name="map-outline" size={48} color={palette.textTertiary} />
              <Text style={styles.noMapText}>No location set</Text>
              {isAdmin && (
                <Text style={styles.noMapSubtext}>
                  Edit this club to add a location
                </Text>
              )}
            </View>
          </AnimatedCard>
        )}

        {/* Club Information */}
        <AnimatedCard
          variant="elevated"
          style={styles.infoCard}
          entering={FadeInDown.delay(100).duration(400).springify()}
        >
          <View style={styles.infoHeader}>
            <Text style={styles.infoHeaderText}>Club Information</Text>
          </View>

          <View style={styles.infoContent}>
            <InfoRow
              icon="location"
              label="Address"
              value={selectedClub.address}
              palette={palette}
              styles={styles}
            />
            <InfoRow
              icon="navigate"
              label="Directions"
              value={selectedClub.directions}
              palette={palette}
              styles={styles}
            />
          </View>
        </AnimatedCard>

        {/* Class Schedule */}
        <AnimatedCard
          variant="elevated"
          style={styles.scheduleCard}
          entering={FadeInDown.delay(200).duration(400).springify()}
        >
          <View style={styles.scheduleHeader}>
            <View style={styles.scheduleHeaderIcon}>
              <Ionicons name="calendar" size={24} color={palette.tint} />
            </View>
            <Text style={styles.scheduleHeaderText}>Class Schedule</Text>
            {selectedClub.class_times && selectedClub.class_times.length > 0 && (
              <View style={styles.classBadge}>
                <Text style={styles.classBadgeText}>
                  {selectedClub.class_times.length} classes
                </Text>
              </View>
            )}
            {isAdmin && (
              <Pressable
                onPress={handleAddClassTime}
                style={styles.addClassButton}
              >
                <Ionicons name="add-circle" size={24} color={palette.tint} />
              </Pressable>
            )}
          </View>

          {selectedClub.class_times && selectedClub.class_times.length > 0 ? (
            <View style={styles.scheduleList}>
              {selectedClub.class_times
                .sort((a, b) => {
                  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                  const dayA = dayOrder.indexOf(a.day.toLowerCase());
                  const dayB = dayOrder.indexOf(b.day.toLowerCase());
                  if (dayA !== dayB) return dayA - dayB;
                  return (a.start_time || '').localeCompare(b.start_time || '');
                })
                .map((classTime, index) => {
                  const isDeleting = deletingClassTimeId === classTime.id;
                  return (
                    <Animated.View
                      key={classTime.id}
                      entering={FadeInDown.delay(250 + index * 50).duration(300)}
                      exiting={FadeOut.duration(200)}
                      style={[styles.classItem, isDeleting && styles.classItemDeleting]}
                    >
                      <View style={styles.classDay}>
                        <Text style={styles.classDayText}>
                          {classTime.day.substring(0, 3).toUpperCase()}
                        </Text>
                        <Text style={styles.classTime}>
                          {classTime.start_time?.substring(0, 5)}
                        </Text>
                      </View>
                      <View style={styles.classInfo}>
                        <Text style={styles.className}>{classTime.name || 'Class'}</Text>
                        {classTime.coaches && (
                          <Text style={styles.classCoaches}>Coach: {classTime.coaches}</Text>
                        )}
                      </View>
                      {isAdmin ? (
                        <View style={styles.classActions}>
                          {isDeleting ? (
                            <ActivityIndicator size="small" color={palette.textTertiary} />
                          ) : (
                            <>
                              <Pressable
                                onPress={() => handleEditClassTime(classTime)}
                                style={styles.classActionButton}
                                disabled={isDeleting}
                              >
                                <Ionicons name="pencil" size={18} color={palette.tint} />
                              </Pressable>
                              <Pressable
                                onPress={() => handleDeleteClassTime(classTime)}
                                style={styles.classActionButton}
                                disabled={isDeleting}
                              >
                                <Ionicons name="trash" size={18} color={palette.statusError} />
                              </Pressable>
                            </>
                          )}
                        </View>
                      ) : (
                        <Badge
                          variant={classTime.name?.toLowerCase().includes('kid') ? 'warning' : 'info'}
                          size="sm"
                        >
                          {classTime.todays_booking_count
                            ? `${classTime.todays_booking_count} bookings`
                            : 'No bookings'}
                        </Badge>
                      )}
                    </Animated.View>
                  );
                })}
            </View>
          ) : (
            <View style={styles.emptySchedule}>
              <Ionicons name="calendar-outline" size={48} color={palette.textTertiary} />
              <Text style={styles.emptyScheduleText}>No classes scheduled</Text>
              {isAdmin && (
                <>
                  <Text style={styles.emptyScheduleSubtext}>
                    Add your first class to get started
                  </Text>
                  <Pressable
                    style={styles.emptyScheduleButton}
                    onPress={handleAddClassTime}
                  >
                    <Ionicons name="add-circle" size={20} color={palette.textInverse} />
                    <Text style={styles.emptyScheduleButtonText}>Add Class</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        </AnimatedCard>

        {/* Admin Action Buttons */}
        {isAdmin && (
          <View style={styles.actionButtons}>
            <Animated.View style={[styles.actionButton, animatedButtonStyle]}>
              <Pressable
                style={styles.editButton}
                onPress={handleEdit}
                onPressIn={() => {
                  scaleValue.value = withSpring(0.95);
                }}
                onPressOut={() => {
                  scaleValue.value = withSpring(1);
                }}
              >
                <Ionicons name="create" size={20} color={palette.textInverse} />
                <Text style={styles.editButtonText}>Edit Club</Text>
              </Pressable>
            </Animated.View>

            <Pressable
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={palette.textInverse} />
              ) : (
                <>
                  <Ionicons name="trash" size={20} color={palette.textInverse} />
                  <Text style={styles.deleteButtonText}>Delete Club</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
        </ScrollView>
      </View>
    </>
  );
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.backgroundSecondary,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Theme.spacing['3xl'],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.backgroundSecondary,
  },
  loadingText: {
    marginTop: Theme.spacing.lg,
    fontSize: Theme.typography.sizes.md,
    color: palette.textSecondary,
    fontFamily: Theme.typography.fonts.medium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
    backgroundColor: palette.backgroundSecondary,
  },
  errorTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
    marginTop: Theme.spacing.lg,
  },
  errorMessage: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    marginTop: Theme.spacing.sm,
    textAlign: 'center',
    maxWidth: 280,
  },
  retryButton: {
    marginTop: Theme.spacing.xl,
    backgroundColor: palette.tint,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.full,
  },
  retryButtonText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  headerButton: {
    padding: Theme.spacing.xs,
  },
  map: {
    marginHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.lg,
  },
  noMapCard: {
    margin: Theme.spacing.lg,
    marginBottom: 0,
  },
  noMapContent: {
    alignItems: 'center',
    paddingVertical: Theme.spacing['2xl'],
  },
  noMapText: {
    marginTop: Theme.spacing.md,
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
  },
  noMapSubtext: {
    marginTop: Theme.spacing.xs,
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
  },
  infoCard: {
    margin: Theme.spacing.lg,
    marginBottom: 0,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  infoHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: `${palette.tint}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  infoHeaderText: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
  },
  infoContent: {
    gap: Theme.spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: palette.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  infoLabel: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textTertiary,
  },
  infoValue: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textPrimary,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  scheduleCard: {
    margin: Theme.spacing.lg,
    marginBottom: 0,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  scheduleHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: `${palette.tint}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  scheduleHeaderText: {
    flex: 1,
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
  },
  classBadge: {
    backgroundColor: palette.tint,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
  },
  classBadgeText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.semibold,
  },
  addClassButton: {
    padding: Theme.spacing.xs,
  },
  scheduleList: {
    gap: Theme.spacing.md,
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.backgroundSecondary,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
  },
  classDay: {
    minWidth: 60,
    marginRight: Theme.spacing.md,
  },
  classDayText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
  },
  classTime: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
  },
  classInfo: {
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  className: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
  },
  classCoaches: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    marginTop: 2,
  },
  classItemDeleting: {
    opacity: 0.5,
  },
  classActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  classActionButton: {
    padding: Theme.spacing.xs,
  },
  emptySchedule: {
    alignItems: 'center',
    paddingVertical: Theme.spacing['2xl'],
  },
  emptyScheduleText: {
    marginTop: Theme.spacing.md,
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
  },
  emptyScheduleSubtext: {
    marginTop: Theme.spacing.xs,
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
  },
  emptyScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.xl,
    backgroundColor: palette.tint,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.full,
    ...Theme.shadows.sm,
  },
  emptyScheduleButtonText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
  },
  settingsCard: {
    margin: Theme.spacing.lg,
    marginBottom: 0,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  settingsHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: `${palette.tint}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  settingsHeaderText: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
  },
  settingsList: {
    gap: Theme.spacing.lg,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textPrimary,
  },
  settingValue: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xl,
  },
  actionButton: {
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.tint,
    paddingVertical: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.xl,
    gap: Theme.spacing.sm,
    ...Theme.shadows.md,
  },
  editButtonText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.bold,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.statusError,
    paddingVertical: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.xl,
    gap: Theme.spacing.sm,
    ...Theme.shadows.md,
  },
  deleteButtonText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.bold,
  },
});