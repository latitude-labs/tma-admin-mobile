import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { BookingStatus } from '@/types/api';
import { Theme } from '@/constants/Theme';

interface StatusOption {
  value: BookingStatus;
  label: string;
  hint?: string;
  isDestructive?: boolean;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'fully_paid', label: 'Fully Paid', hint: 'Kit + Licence \u2192' },
  { value: 'paid_awaiting_dd', label: 'Paid (awaiting DD)', hint: 'Kit + Licence \u2192' },
  { value: 'deposit_and_dd', label: 'Deposit and DD' },
  { value: 'deposit_only', label: 'Deposit only' },
  { value: 'unpaid_dd', label: 'Unpaid (DD Scheduled)' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'not_joining', label: 'Not Joining', isDestructive: true },
];

interface StatusStepProps {
  totalSteps: number;
  onSelect: (status: BookingStatus) => void;
  bookingName: string;
  enrollerName: string;
}

export function StatusStep({ totalSteps, onSelect, bookingName, enrollerName }: StatusStepProps) {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.container}>
      <Text style={styles.stepLabel}>Step 2 of {totalSteps}</Text>
      <Text style={styles.title}>Booking Status</Text>
      <Text style={styles.detail}>{bookingName} · Enroller: {enrollerName}</Text>

      <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
        {STATUS_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              option.isDestructive ? styles.optionDestructive : null,
            ]}
            activeOpacity={0.7}
            onPress={() => onSelect(option.value)}
          >
            <Text style={[
              styles.optionLabel,
              option.isDestructive ? styles.optionLabelDestructive : null,
            ]}>
              {option.label}
            </Text>
            {option.hint ? (
              <Text style={styles.optionHint}>{option.hint}</Text>
            ) : null}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    stepLabel: {
      fontSize: 11,
      color: palette.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: palette.textPrimary,
      marginBottom: 4,
    },
    detail: {
      fontSize: 12,
      color: palette.textSecondary,
      marginBottom: 14,
    },
    optionsList: {
      flex: 1,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: palette.borderDefault,
      borderRadius: 10,
      padding: 12,
      marginBottom: 6,
    },
    optionDestructive: {
      borderColor: Theme.colors.status.error,
      backgroundColor: palette.backgroundSecondary,
    },
    optionLabel: {
      fontSize: 14,
      color: palette.textPrimary,
    },
    optionLabelDestructive: {
      color: Theme.colors.status.error,
    },
    optionHint: {
      fontSize: 10,
      color: palette.textTertiary,
    },
  });
