import { Theme } from '@/constants/Theme';
import { ThemeColors } from '@/hooks/useThemeColors';
import { ClassWithBookings } from '@/hooks/useCoachDashboard';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ClassCardProps {
  classWithBookings: ClassWithBookings;
  dayDate: string;
  colors: ThemeColors;
}

export function ClassCard({ classWithBookings, dayDate, colors }: ClassCardProps) {
  const navigateToClass = () => {
    router.push({
      pathname: '/class-bookings',
      params: {
        classTimeId: classWithBookings.classTime.id,
        className: classWithBookings.classTime.name || 'Class',
        clubName: classWithBookings.classTime.club?.name || '',
        startTime: classWithBookings.classTime.start_time,
        endTime: classWithBookings.classTime.end_time || '',
        date: dayDate
      }
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getClassStatusColor = () => {
    const total = classWithBookings.bookings.length;
    if (total === 0) return colors.textTertiary;
    if (classWithBookings.pendingBookings.length === 0) return colors.statusSuccess;
    if (classWithBookings.processedBookings.length === 0) return colors.statusWarning;
    return colors.statusInfo;
  };

  const statusColor = getClassStatusColor();
  const processedPercentage = classWithBookings.bookings.length > 0
    ? Math.round((classWithBookings.processedBookings.length / classWithBookings.bookings.length) * 100)
    : 0;

  const styles = StyleSheet.create({
    classCardWrapper: {
      marginBottom: Theme.spacing.sm,
    },
    classCard: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: Theme.spacing.md,
      borderLeftWidth: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 3,
      elevation: 1,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderLeftColor: statusColor,
    },
    classHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Theme.spacing.sm,
    },
    timeBadge: {
      backgroundColor: colors.tint + '10',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    timeBadgeText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.semibold,
      color: colors.tint,
    },
    classStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.semibold,
      color: colors.textPrimary,
    },
    className: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.semibold,
      color: colors.textPrimary,
      marginBottom: Theme.spacing.sm,
    },
    classFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    locationText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: colors.textTertiary,
    },
    progressContainer: {
      flex: 1,
      marginLeft: Theme.spacing.md,
    },
    progressBar: {
      height: 3,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 1.5,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 1.5,
    },
  });

  return (
    <TouchableOpacity
      onPress={navigateToClass}
      activeOpacity={0.7}
      style={styles.classCardWrapper}
    >
      <View style={styles.classCard}>
        <View style={styles.classHeader}>
          <View style={styles.timeBadge}>
            <Text style={styles.timeBadgeText}>
              {formatTime(classWithBookings.classTime.start_time)}
            </Text>
          </View>
          <View style={styles.classStats}>
            <View style={[styles.statDot, { backgroundColor: colors.statusWarning }]} />
            <Text style={styles.statText}>{classWithBookings.pendingBookings.length}</Text>
            <View style={[styles.statDot, { backgroundColor: colors.statusSuccess }]} />
            <Text style={styles.statText}>{classWithBookings.processedBookings.length}</Text>
          </View>
        </View>

        <Text style={styles.className}>
          {classWithBookings.classTime.name || 'Class'}
        </Text>

        <View style={styles.classFooter}>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color={colors.textTertiary} />
            <Text style={styles.locationText}>
              {classWithBookings.classTime.club?.name || 'Club'}
            </Text>
          </View>

          {classWithBookings.bookings.length > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${processedPercentage}%`,
                      backgroundColor: statusColor
                    }
                  ]}>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
