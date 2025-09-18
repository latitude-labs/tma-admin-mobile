import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View, RefreshControl, ActivityIndicator } from 'react-native';
import { Card, Badge, Chip } from '@/components/ui';
import { Theme } from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import { classTimesService } from '@/services/api/classTimes.service';
import { ClassTime } from '@/types/api';
import { format } from 'date-fns';

export default function ClassesScreen() {
  const [classTimes, setClassTimes] = useState<ClassTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const today = new Date();
  const currentDay = format(today, 'EEEE');
  const formattedDate = format(today, 'EEEE, MMM d');

  const fetchClassTimes = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      const data = await classTimesService.getTodaysClassTimes();
      setClassTimes(data);
    } catch (error) {
      console.error('Error fetching class times:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClassTimes();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClassTimes(true);
  };

  // Filter and sort classes for current day
  const todaysClasses = classTimes.filter(cls => cls.day === currentDay);
  const sortedClasses = [...todaysClasses].sort((a, b) => {
    const timeA = parseInt(a.start_time.replace(/:/g, ''));
    const timeB = parseInt(b.start_time.replace(/:/g, ''));
    return timeA - timeB;
  });

  // Calculate stats
  const kidsClasses = todaysClasses.filter(c => c.name?.toLowerCase().includes('kids'));
  const adultsClasses = todaysClasses.filter(c => c.name?.toLowerCase().includes('adult'));
  const totalBookings = todaysClasses.reduce((sum, c) => sum + (c.todays_booking_count || 0), 0);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{formattedDate}</Text>
          <Badge variant="success">{todaysClasses.length} Classes</Badge>
        </View>

        <View style={styles.stats}>
          <Card variant="filled" style={styles.statCard}>
            <Text style={styles.statNumber}>{kidsClasses.length}</Text>
            <Text style={styles.statLabel}>Kids Classes</Text>
          </Card>
          <Card variant="filled" style={styles.statCard}>
            <Text style={styles.statNumber}>{adultsClasses.length}</Text>
            <Text style={styles.statLabel}>Adult Classes</Text>
          </Card>
          <Card variant="filled" style={styles.statCard}>
            <Text style={styles.statNumber}>{totalBookings}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </Card>
        </View>

        {sortedClasses.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Schedule</Text>
            {sortedClasses.map((cls) => {
              const isKidsClass = cls.name?.toLowerCase().includes('kids');
              const isAdultsClass = cls.name?.toLowerCase().includes('adult');

              return (
                <Card key={cls.id} variant="elevated" style={styles.classCard}>
                  <View style={styles.classHeader}>
                    <View style={styles.timeBlock}>
                      <Text style={styles.timeText}>{cls.start_time.slice(0, 5)}</Text>
                      {cls.end_time && (
                        <Text style={styles.timeEndText}>to {cls.end_time.slice(0, 5)}</Text>
                      )}
                    </View>
                    <View style={styles.classInfo}>
                      <Text style={styles.className}>{cls.name || 'Class'}</Text>
                      {cls.club && (
                        <View style={styles.classDetails}>
                          <Ionicons name="business-outline" size={14} color={Theme.colors.text.secondary} />
                          <Text style={styles.clubName}>{cls.club.name}</Text>
                        </View>
                      )}
                      {cls.coaches && (
                        <View style={styles.classDetails}>
                          <Ionicons name="people-outline" size={14} color={Theme.colors.text.secondary} />
                          <Text style={styles.instructor} numberOfLines={1}>{cls.coaches}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.classStats}>
                      {(isKidsClass || isAdultsClass) && (
                        <Badge
                          variant={isKidsClass ? 'warning' : 'info'}
                          size="sm"
                        >
                          {isKidsClass ? 'Kids' : 'Adults'}
                        </Badge>
                      )}
                      <View style={styles.bookingInfo}>
                        <Text style={styles.bookingCount}>
                          {cls.todays_booking_count || 0}
                        </Text>
                        <Text style={styles.bookingLabel}>Bookings</Text>
                      </View>
                    </View>
                  </View>
                </Card>
              );
            })}
          </>
        )}

        {sortedClasses.length === 0 && (
          <Card variant="filled" style={styles.emptyCard}>
            <Text style={styles.emptyText}>No classes scheduled for today</Text>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background.secondary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: Theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  title: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: Theme.colors.text.primary,
  },
  stats: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
  },
  statNumber: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: Theme.colors.primary,
  },
  statLabel: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
    marginTop: Theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.md,
  },
  classCard: {
    marginBottom: Theme.spacing.md,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeBlock: {
    width: 70,
    alignItems: 'center',
    paddingRight: Theme.spacing.md,
    borderRightWidth: 2,
    borderRightColor: Theme.colors.primary,
  },
  timeText: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
    color: Theme.colors.primary,
  },
  timeEndText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
  },
  classInfo: {
    flex: 1,
    paddingHorizontal: Theme.spacing.md,
  },
  className: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  classDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    marginBottom: Theme.spacing.xs,
  },
  clubName: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
    flex: 1,
  },
  instructor: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
    flex: 1,
  },
  classStats: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  bookingInfo: {
    marginTop: Theme.spacing.sm,
    alignItems: 'center',
  },
  bookingCount: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
    color: Theme.colors.text.primary,
  },
  bookingLabel: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl * 2,
  },
  emptyText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
  },
});