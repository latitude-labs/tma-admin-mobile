import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, View, ViewToken } from 'react-native';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { useBookingStore } from '@/store/bookingStore';
import { coachesService } from '@/services/api/coaches.service';
import { Club, Booking } from '@/types/api';
import { Coach } from '@/types/coaches';
import { ClubTrialsList } from './ClubTrialsList';
import { Theme } from '@/constants/Theme';

// ── Types ──────────────────────────────────────────────────────────

interface ClubPagerProps {
  onSubmitReport: (clubId: number) => void;
}

interface ClubPage {
  club: Club;
  bookings: Booking[];
}

// ── Constants ──────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;

// ── Component ──────────────────────────────────────────────────────

export function ClubPager({ onSubmitReport }: ClubPagerProps) {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const getBookingsByClub = useBookingStore((s) => s.getBookingsByClub);

  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  // Build club pages from today's bookings
  const clubPages: ClubPage[] = useMemo(() => {
    const clubMap = getBookingsByClub();
    const pages: ClubPage[] = [];
    clubMap.forEach(({ club, bookings }) => {
      pages.push({ club, bookings });
    });
    // Sort by club name for consistent order
    pages.sort((a, b) => a.club.name.localeCompare(b.club.name));
    return pages;
  }, [getBookingsByClub]);

  // Load coaches on mount
  useEffect(() => {
    let cancelled = false;
    coachesService
      .getAllCoaches()
      .then((data) => {
        if (!cancelled) setCoaches(data);
      })
      .catch((err) => {
        console.error('Failed to load coaches for ClubPager:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const renderPage = useCallback(
    ({ item }: { item: ClubPage }) => (
      <View style={styles.page}>
        <ClubTrialsList
          club={item.club}
          bookings={item.bookings}
          coaches={coaches}
          onSubmitReport={onSubmitReport}
        />
      </View>
    ),
    [coaches, onSubmitReport, styles.page],
  );

  const keyExtractor = useCallback(
    (item: ClubPage) => String(item.club.id),
    [],
  );

  // ── Empty state ────────────────────────────────────────────────

  if (clubPages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No trial bookings today</Text>
      </View>
    );
  }

  // ── Pager ──────────────────────────────────────────────────────

  const currentClub = clubPages[currentIndex]?.club;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.clubName} numberOfLines={1}>
          {currentClub?.name || ''}
        </Text>
        {clubPages.length > 1 ? (
          <View style={styles.dots}>
            {clubPages.map((page, index) => (
              <View
                key={page.club.id}
                style={[
                  styles.dot,
                  index === currentIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        ) : null}
      </View>

      {/* Horizontal pager */}
      <FlatList
        data={clubPages}
        renderItem={renderPage}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_data, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      alignItems: 'center',
      paddingVertical: Theme.spacing.sm,
      paddingHorizontal: Theme.spacing.lg,
    },
    clubName: {
      fontSize: 17,
      fontWeight: Theme.typography.fontWeights.bold,
      color: palette.textPrimary,
      textAlign: 'center',
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: Theme.spacing.xs,
      gap: 6,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    dotActive: {
      backgroundColor: Theme.colors.primary,
    },
    dotInactive: {
      backgroundColor: palette.borderDefault,
    },
    page: {
      width: SCREEN_WIDTH,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: Theme.typography.sizes.md,
      color: palette.textTertiary,
    },
  });
