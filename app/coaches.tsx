import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Theme } from '@/constants/Theme';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { ScreenHeader } from '@/components/ui';
import { CoachCard } from '@/components/coaches/CoachCard';
import { Coach } from '@/types/coaches';
import { coachesService } from '@/services/api/coaches.service';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import * as Haptics from 'expo-haptics';

export default function CoachesScreen() {
  const router = useRouter();
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { user } = useAuthStore();

  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load coaches
  const loadCoaches = useCallback(async (isRefresh = false) => {
    if (!user?.is_admin) {
      setError('This feature is only available to administrators.');
      setIsLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const data = await coachesService.getAllCoaches();
      setCoaches(data);
    } catch (err) {
      console.error('Error loading coaches:', err);
      setError('Failed to load coaches. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadCoaches();
  }, [loadCoaches]);

  const handleCoachPress = (coach: Coach) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/coach-detail',
      params: {
        coachId: coach.id,
        coachName: coach.name,
      },
    });
  };

  const handleAddCoach = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/coach-form');
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color={palette.textTertiary} />
      <Text style={styles.emptyTitle}>No Coaches Found</Text>
      <Text style={styles.emptyText}>
        There are no coaches in the system yet.
      </Text>
      <TouchableOpacity
        style={[styles.emptyButton, { backgroundColor: Theme.colors.primary }]}
        onPress={handleAddCoach}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.emptyButtonText}>Add First Coach</Text>
      </TouchableOpacity>
    </View>
  );

  // Render error state
  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={64} color={Theme.colors.status.error} />
      <Text style={styles.errorTitle}>Error Loading Data</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: Theme.colors.primary }]}
        onPress={() => loadCoaches()}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // Loading state
  if (isLoading && coaches.length === 0) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="Coaches" onBackPress={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>Loading coaches...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error && coaches.length === 0) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="Coaches" onBackPress={() => router.back()} />
        {renderErrorState()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Coaches" onBackPress={() => router.back()} />

      <FlatList
        data={coaches}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <CoachCard
            coach={item}
            onPress={() => handleCoachPress(item)}
            index={index}
          />
        )}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadCoaches(true)}
            colors={[Theme.colors.primary]}
          />
        }
        contentContainerStyle={
          coaches.length === 0 ? styles.emptyListContainer : styles.listContent
        }
        showsVerticalScrollIndicator={false}
      />

      {coaches.length > 0 ? (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: Theme.colors.primary }]}
          onPress={handleAddCoach}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.backgroundSecondary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
    },
    listContent: {
      paddingTop: 16,
      paddingBottom: 100,
    },
    emptyListContainer: {
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: Theme.typography.sizes.xl,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    emptyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: Theme.borderRadius.md,
      gap: 8,
    },
    emptyButtonText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.semibold,
      color: '#FFFFFF',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    errorTitle: {
      fontSize: Theme.typography.sizes.xl,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
      marginTop: 16,
      marginBottom: 8,
    },
    errorText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    retryButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: Theme.borderRadius.md,
    },
    retryButtonText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.semibold,
      color: '#FFFFFF',
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
  });
