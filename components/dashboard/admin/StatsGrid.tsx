import { Theme } from '@/constants/Theme';
import { ThemeColors } from '@/hooks/useThemeColors';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { StatCard } from './StatCard';

interface StatsGridProps {
  colors: ThemeColors;
  stats: {
    monthlyBookings: number;
    todaysBookings: number;
    todaysTrials: number;
    upcomingBookings: number;
    totalClubs: number;
  };
  trends: {
    todaysBookings: { direction: 'up' | 'down' | 'neutral'; percentage: number };
    todaysTrials: { direction: 'up' | 'down' | 'neutral'; percentage: number };
    upcomingBookings: { direction: 'up' | 'down' | 'neutral'; percentage: number };
    monthlyBookings: { direction: 'up' | 'down' | 'neutral'; percentage: number };
  };
  loading: boolean;
}

export function StatsGrid({ colors, stats, trends, loading }: StatsGridProps) {
  const styles = StyleSheet.create({
    overviewContainer: {
      paddingHorizontal: Theme.spacing.lg,
      marginBottom: Theme.spacing.md,
    },
    sectionHeader: {
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
    celebrateEmoji: {
      fontSize: 24,
    },
    statsGrid: {
      gap: Theme.spacing.xs,
    },
  });

  // Animation refs for each card
  const cardAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const cardScales = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  useEffect(() => {
    // Staggered card entrance animations
    const cardAnimations = cardAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: 600 + (index * 100), // Start after main fade, stagger by 100ms
        useNativeDriver: true,
      })
    );

    Animated.parallel(cardAnimations).start();
  }, []);

  const handleCardPressIn = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(cardScales[index], {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handleCardPressOut = (index: number) => {
    Animated.spring(cardScales[index], {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const cards = [
    {
      title: "Bookings Today",
      description: "New bookings made today",
      value: stats.todaysBookings,
      icon: "calendar-outline" as const,
      color: colors.statusSuccess,
      trend: trends.todaysBookings
    },
    {
      title: "Trials Today",
      description: "Scheduled trial sessions",
      value: stats.todaysTrials,
      icon: "people-outline" as const,
      color: colors.statusInfo,
      trend: trends.todaysTrials
    },
    {
      title: "Upcoming Week",
      description: "Next 7 days bookings",
      value: stats.upcomingBookings,
      icon: "time-outline" as const,
      color: colors.statusWarning,
      trend: trends.upcomingBookings
    },
    {
      title: "This Month",
      description: "Total bookings this month",
      value: stats.monthlyBookings,
      icon: "trending-up" as const,
      color: colors.tint,
      trend: trends.monthlyBookings
    }
  ];

  return (
    <View style={styles.overviewContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        {(stats.todaysBookings > 0 || stats.todaysTrials > 0) && <Text style={styles.celebrateEmoji}>🎉</Text>}
      </View>

      <View style={styles.statsGrid}>
        {cards.map((card, index) => (
          <StatCard
            key={index}
            colors={colors}
            title={card.title}
            description={card.description}
            value={card.value}
            loading={loading}
            icon={card.icon}
            color={card.color}
            trend={card.trend}
            animValues={{
              opacity: cardAnims[index],
              scale: cardScales[index],
              translateY: cardAnims[index].interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            }}
            onPressIn={() => handleCardPressIn(index)}
            onPressOut={() => handleCardPressOut(index)}
          />
        ))}
      </View>
    </View>
  );
}
