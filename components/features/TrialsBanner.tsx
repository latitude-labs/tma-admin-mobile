import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { useBookingStore } from '@/store/bookingStore';
import { Theme } from '@/constants/Theme';

export function TrialsBanner() {
  const palette = useThemeColors();
  const outstandingCount = useBookingStore(s => s.getOutstandingCount());
  const hasOutstanding = outstandingCount > 0;
  const styles = useMemo(() => createStyles(palette, hasOutstanding), [palette, hasOutstanding]);

  return (
    <TouchableOpacity
      style={styles.banner}
      activeOpacity={0.7}
      onPress={() => router.push('/(tabs)/trials')}
    >
      <View style={styles.left}>
        <Ionicons
          name="person-add"
          size={20}
          color={hasOutstanding ? Theme.colors.primary : palette.textTertiary}
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Trial Bookings</Text>
          <Text style={styles.subtitle}>
            {hasOutstanding
              ? `${outstandingCount} outstanding to review`
              : 'All up to date'}
          </Text>
        </View>
      </View>
      <View style={styles.action}>
        <Text style={styles.actionText}>View</Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={hasOutstanding ? '#FFFFFF' : palette.textTertiary}
        />
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (palette: ThemeColors, hasOutstanding: boolean) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderRadius: 12,
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: hasOutstanding ? '#FFF3E8' : palette.backgroundSecondary,
      borderWidth: hasOutstanding ? 2 : 1,
      borderColor: hasOutstanding ? Theme.colors.primary : palette.borderDefault,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    textContainer: {
      flex: 1,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: hasOutstanding ? palette.textPrimary : palette.textTertiary,
    },
    subtitle: {
      fontSize: 12,
      color: hasOutstanding ? palette.textSecondary : palette.textTertiary,
      marginTop: 2,
    },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: hasOutstanding ? Theme.colors.primary : palette.borderDefault,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    actionText: {
      fontSize: 12,
      fontWeight: '600',
      color: hasOutstanding ? '#FFFFFF' : palette.textTertiary,
    },
  });
