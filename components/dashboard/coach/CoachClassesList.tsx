import { SkeletonLoader } from '@/components/SkeletonLoader';
import { Theme } from '@/constants/Theme';
import { ThemeColors } from '@/hooks/useThemeColors';
import { DayData } from '@/hooks/useCoachDashboard';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ClassCard } from './ClassCard';

interface CoachClassesListProps {
  daysData: DayData[];
  showAllDays: boolean;
  colors: ThemeColors;
  onToggleShowAllDays: (show: boolean) => void;
}

export function CoachClassesList({ 
  daysData, 
  showAllDays, 
  colors,
  onToggleShowAllDays 
}: CoachClassesListProps) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([0])); // Today expanded by default

  const toggleDayExpansion = (index: number) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const styles = StyleSheet.create({
    classesSection: {
      paddingHorizontal: Theme.spacing.lg,
      paddingTop: Theme.spacing.lg,
      marginBottom: Theme.spacing.xl,
    },
    sectionHeaderWithAction: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Theme.spacing.md,
    },
    sectionTitle: {
      fontSize: Theme.typography.sizes.lg,
      fontFamily: Theme.typography.fonts.semibold,
      color: colors.textPrimary,
    },
    viewMoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Theme.spacing.sm,
      paddingVertical: 4,
      backgroundColor: colors.tint + '10',
      borderRadius: Theme.borderRadius.full,
    },
    viewMoreText: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.medium,
      color: colors.tint,
    },
    daySection: {
      marginBottom: Theme.spacing.md,
    },
    dayHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Theme.spacing.sm,
      paddingBottom: Theme.spacing.md,
    },
    dayHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    dayBadge: {
      backgroundColor: colors.backgroundSecondary,
      paddingHorizontal: Theme.spacing.md,
      paddingVertical: 6,
      borderRadius: 12,
      marginRight: Theme.spacing.md,
      minWidth: 56,
      alignItems: 'center',
    },
    todayBadge: {
      backgroundColor: colors.tint + '15',
      borderWidth: 1,
      borderColor: colors.tint + '30',
    },
    dayBadgeText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.semibold,
      color: colors.textSecondary,
    },
    todayBadgeText: {
      color: colors.tint,
      fontFamily: Theme.typography.fonts.bold,
    },
    dayDate: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.semibold,
      color: colors.textPrimary,
    },
    daySummary: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: colors.textSecondary,
      marginTop: 2,
    },
    pendingText: {
      color: colors.statusWarning,
      fontFamily: Theme.typography.fonts.medium,
    },
    dayContent: {
      paddingLeft: Theme.spacing.lg,
    },
    emptyDay: {
      alignItems: 'center',
      paddingVertical: Theme.spacing.lg,
      backgroundColor: colors.backgroundSecondary + '50',
      borderRadius: 12,
      marginBottom: Theme.spacing.sm,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderStyle: 'dashed',
    },
    emptyDayText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: colors.textTertiary,
      marginTop: Theme.spacing.sm,
    },
    skeleton: {
      marginBottom: Theme.spacing.md,
      borderRadius: Theme.borderRadius.lg,
    },
    collapseButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: Theme.spacing.md,
      marginTop: Theme.spacing.sm,
    },
    collapseText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: colors.tint,
    },
  });

  return (
    <View style={styles.classesSection}>
      <View style={styles.sectionHeaderWithAction}>
        <Text style={styles.sectionTitle}>Your Classes</Text>
        {!showAllDays && (
          <TouchableOpacity
            onPress={() => onToggleShowAllDays(true)}
            style={styles.viewMoreButton}
            activeOpacity={0.7}
          >
            <Text style={styles.viewMoreText}>View week</Text>
            <Ionicons name="chevron-down" size={16} color={colors.tint} />
          </TouchableOpacity>
        )}
      </View>

      {daysData.slice(0, showAllDays ? 7 : 3).map((day, dayIndex) => {
        const isExpanded = expandedDays.has(dayIndex);
        const hasClasses = day.classes.length > 0;
        const totalBookings = day.classes.reduce((sum, c) => sum + c.bookings.length, 0);
        const totalPending = day.classes.reduce((sum, c) => sum + c.pendingBookings.length, 0);

        return (
          <View key={dayIndex} style={styles.daySection}>
            <TouchableOpacity
              onPress={() => toggleDayExpansion(dayIndex)}
              style={styles.dayHeader}
              activeOpacity={0.7}
            >
              <View style={styles.dayHeaderLeft}>
                <View style={[
                  styles.dayBadge,
                  dayIndex === 0 && styles.todayBadge
                ]}>
                  <Text style={[
                    styles.dayBadgeText,
                    dayIndex === 0 && styles.todayBadgeText
                  ]}>
                    {dayIndex === 0 ? 'Today' : day.dayName.slice(0, 3)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.dayDate}>
                    {day.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </Text>
                  {hasClasses && (
                    <Text style={styles.daySummary}>
                      {day.classes.length} classes • {totalBookings} bookings
                      {totalPending > 0 && <Text style={styles.pendingText}> • {totalPending} pending</Text>}
                    </Text>
                  )}
                </View>
              </View>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {isExpanded && (
              <Animated.View style={styles.dayContent}>
                {day.isLoading ? (
                  <SkeletonLoader height={80} style={styles.skeleton} />
                ) : !hasClasses ? (
                  <View style={styles.emptyDay}>
                    <Ionicons name="calendar-outline" size={32} color={colors.textTertiary} />
                    <Text style={styles.emptyDayText}>No classes scheduled</Text>
                  </View>
                ) : (
                  day.classes.map((classWithBookings) => (
                    <ClassCard 
                      key={classWithBookings.classTime.id}
                      classWithBookings={classWithBookings}
                      dayDate={day.dateString}
                      colors={colors}
                    />
                  ))
                )}
              </Animated.View>
            )}
          </View>
        );
      })}

      {showAllDays && daysData.length > 3 && (
        <TouchableOpacity
          onPress={() => {
            onToggleShowAllDays(false);
            setExpandedDays(new Set([0])); // Reset to just today
          }}
          style={styles.collapseButton}
          activeOpacity={0.7}
        >
          <Text style={styles.collapseText}>Show less</Text>
          <Ionicons name="chevron-up" size={16} color={colors.tint} />
        </TouchableOpacity>
      )}
    </View>
  );
}
