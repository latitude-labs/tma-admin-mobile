import { Badge, Card } from '@/components/ui';
import { Theme } from '@/constants/Theme';
import { useClubStore } from '@/store/clubStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ClubsScreen() {
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

  useEffect(() => {
    fetchClubs();
  }, []);

  if (isLoading && clubs.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Loading clubs...</Text>
      </View>
    );
  }

  if (error && clubs.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle" size={48} color={Theme.colors.status.error} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refreshClubs}
          colors={[Theme.colors.primary]}
        />
      }>
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>My Clubs</Text>
          {isOffline && (
            <View style={styles.offlineBadge}>
              <Ionicons name="cloud-offline" size={16} color="#FFF" />
              <Text style={styles.offlineText}>Offline</Text>
            </View>
          )}
        </View>
        {lastSync && (
          <Text style={styles.syncText}>
            Last synced: {new Date(lastSync).toLocaleString('en-GB', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        )}

        {clubs.map((club) => (
          <Card key={club.id} variant="elevated" style={styles.card}>
            <View style={styles.clubHeader}>
              <Ionicons name="business" size={24} color={Theme.colors.primary} />
              <Text style={styles.clubName}>{club.name}</Text>
            </View>

            <View style={styles.clubInfo}>
              {club.address && (
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color={Theme.colors.text.secondary} />
                  <Text style={styles.infoText}>{club.address}</Text>
                </View>
              )}
              {club.postcode && (
                <View style={styles.infoRow}>
                  <Ionicons name="map-outline" size={16} color={Theme.colors.text.secondary} />
                  <Text style={styles.infoText}>{club.postcode}</Text>
                </View>
              )}
            </View>

            <View style={styles.clubStats}>
              <View style={styles.statRow}>
                <Ionicons name="calendar-outline" size={18} color={Theme.colors.primary} />
                <Text style={styles.statLabel}>Classes:</Text>
                <Text style={styles.statValue}>
                  {club.class_times ? club.class_times.length : 0}
                </Text>
              </View>
            </View>

            {club.class_times && club.class_times.length > 0 && (
              <View style={styles.clubClasses}>
                <Text style={styles.classesTitle}>Weekly Schedule</Text>
                {club.class_times
                  .sort((a, b) => {
                    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                    const dayA = dayOrder.indexOf(a.day.toLowerCase());
                    const dayB = dayOrder.indexOf(b.day.toLowerCase());
                    if (dayA !== dayB) return dayA - dayB;
                    // If same day, sort by time
                    return (a.start_time || '').localeCompare(b.start_time || '');
                  })
                  .map((cls) => (
                    <View key={cls.id} style={styles.classRow}>
                      <Text style={styles.classDay}>{cls.day.charAt(0).toUpperCase() + cls.day.slice(1).toLowerCase()}</Text>
                      <Badge
                        variant={cls.name?.toLowerCase().includes('kid') ? 'warning' : 'info'}
                        size="sm"
                      >
                        {cls.name || 'Class'}
                      </Badge>
                      <Text style={styles.classTime}>
                        {cls.start_time?.substring(0, 5)}
                      </Text>
                    </View>
                  ))}
              </View>
            )}
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  loadingText: {
    marginTop: Theme.spacing.md,
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.text.secondary,
  },
  errorText: {
    marginTop: Theme.spacing.md,
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.status.error,
    textAlign: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.status.warning,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.sm,
    gap: 4,
  },
  offlineText: {
    color: '#FFF',
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.medium,
  },
  syncText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.text.secondary,
    marginBottom: Theme.spacing.md,
  },
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background.secondary,
  },
  content: {
    padding: Theme.spacing.lg,
  },
  title: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.sm,
  },
  card: {
    marginBottom: Theme.spacing.lg,
  },
  clubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  clubName: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  clubInfo: {
    marginBottom: Theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  infoText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  clubStats: {
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.md,
    borderTopWidth: 1,
    borderColor: Theme.colors.border.light,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  statLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.secondary,
  },
  statValue: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
  },
  clubClasses: {
    marginTop: Theme.spacing.sm,
  },
  classesTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.md,
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
    gap: Theme.spacing.sm,
  },
  classDay: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.primary,
    width: 80,
  },
  classTime: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
    marginLeft: 'auto',
  },
});