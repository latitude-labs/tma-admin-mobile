import { Theme } from '@/constants/Theme';
import { ThemeColors } from '@/hooks/useThemeColors';
import { Club } from '@/types/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, TouchableOpacity, Platform, ActionSheetIOS, Modal, ScrollView } from 'react-native';
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
  clubs?: Club[];
  selectedClubId?: number | null;
  onClubChange?: (id: number | null) => void;
}

export function StatsGrid({ colors, stats, trends, loading, clubs, selectedClubId, onClubChange }: StatsGridProps) {
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
      fontWeight: Theme.typography.fontWeights.semibold,
      color: colors.textPrimary,
    },
    statsGrid: {
      gap: 8,
    },
    // Club Selector Styles
    clubSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      paddingHorizontal: Theme.spacing.sm,
      paddingVertical: Theme.spacing.xs,
      borderRadius: Theme.borderRadius.full,
      borderWidth: 1,
      borderColor: colors.borderLight,
      gap: Theme.spacing.xs,
    },
    clubSelectorText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      fontWeight: Theme.typography.fontWeights.medium,
      color: colors.textPrimary,
      maxWidth: 150,
    },
    // Modal Styles (Android)
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.overlay,
    },
    modalContent: {
      backgroundColor: colors.background,
      borderRadius: Theme.borderRadius.lg,
      width: '80%',
      maxHeight: '60%',
      padding: Theme.spacing.sm,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: colors.isDark ? 0.4 : 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
    modalScroll: {
      maxHeight: 300,
    },
    option: {
      paddingVertical: Theme.spacing.md,
      paddingHorizontal: Theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    optionText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.regular,
      fontWeight: Theme.typography.fontWeights.regular,
      color: colors.textPrimary,
    },
    selectedOptionText: {
      fontFamily: Theme.typography.fonts.semibold,
      fontWeight: Theme.typography.fontWeights.semibold,
      color: colors.tint,
    },
    celebrateEmoji: {
      fontSize: 24,
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
    // Gentler staggered card entrance animations
    // opacity 0→1, translateY 8→0, 300ms duration, 60ms stagger
    const cardAnimations = cardAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: 600 + (index * 60),
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

  const [showModal, setShowModal] = useState(false);

  const handleClubSelect = () => {
    if (!clubs || !onClubChange) return;

    const sortedClubs = [...clubs].sort((a, b) => a.name.localeCompare(b.name));
    const options = [
      { label: 'All Clubs', value: null },
      ...sortedClubs.map(c => ({ label: c.name, value: c.id }))
    ];

    if (Platform.OS === 'ios') {
      const iosOptions = [...options.map(opt => opt.label), 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: iosOptions,
          cancelButtonIndex: iosOptions.length - 1,
        },
        (buttonIndex) => {
          if (buttonIndex !== iosOptions.length - 1) {
            onClubChange(options[buttonIndex].value);
          }
        }
      );
    } else {
      setShowModal(true);
    }
  };

  const selectedClubName = clubs?.find(c => c.id === selectedClubId)?.name || 'All Clubs';

  return (
    <View style={styles.overviewContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Overview</Text>

        {/* Club Selector */}
        {clubs && onClubChange ? (
            <TouchableOpacity
                style={styles.clubSelector}
                onPress={handleClubSelect}
                activeOpacity={0.7}
            >
                <Text style={styles.clubSelectorText} numberOfLines={1}>
                    {selectedClubName}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
        ) : (
            (stats.todaysBookings > 0 || stats.todaysTrials > 0) ? <Text style={styles.celebrateEmoji}>🎉</Text> : null
        )}
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
                outputRange: [8, 0],
              }),
            }}
            onPressIn={() => handleCardPressIn(index)}
            onPressOut={() => handleCardPressOut(index)}
          />
        ))}
      </View>

      {/* Android Modal */}
      {Platform.OS === 'android' && clubs && onClubChange ? (
        <Modal
          visible={showModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowModal(false)}
          >
            <View style={styles.modalContent}>
              <ScrollView style={styles.modalScroll}>
                <TouchableOpacity
                    style={[styles.option, selectedClubId === null ? { backgroundColor: colors.tint + '10' } : null]}
                    onPress={() => {
                        onClubChange(null);
                        setShowModal(false);
                    }}
                >
                    <Text style={[styles.optionText, selectedClubId === null ? styles.selectedOptionText : null]}>All Clubs</Text>
                </TouchableOpacity>
                {clubs.map((club) => (
                  <TouchableOpacity
                    key={club.id}
                    style={[styles.option, selectedClubId === club.id ? { backgroundColor: colors.tint + '10' } : null]}
                    onPress={() => {
                      onClubChange(club.id);
                      setShowModal(false);
                    }}
                  >
                    <Text style={[styles.optionText, selectedClubId === club.id ? styles.selectedOptionText : null]}>
                      {club.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      ) : null}
    </View>
  );
}
