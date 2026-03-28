import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { useBookingStore } from '@/store/bookingStore';
import { ClubPager } from '@/components/features/trials/ClubPager';
import { router } from 'expo-router';

export default function TrialsScreen() {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const fetchBookings = useBookingStore(s => s.fetchBookings);

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleSubmitReport = useCallback((clubId: number) => {
    // Navigate to the EOD wizard with the club pre-selected
    router.push({ pathname: '/eod-wizard', params: { clubId: String(clubId) } });
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[palette.backgroundGradientStart, palette.backgroundGradientEnd]}
        style={StyleSheet.absoluteFillObject}
      />
      <ClubPager onSubmitReport={handleSubmitReport} />
    </View>
  );
}

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
  });
