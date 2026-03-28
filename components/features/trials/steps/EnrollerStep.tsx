import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/store/authStore';
import { Coach } from '@/types/coaches';
import { Theme } from '@/constants/Theme';

interface EnrollerStepProps {
  coaches: Coach[];
  selectedCoachId: number | null;
  onSelect: (coachId: number) => void;
  onNext: () => void;
  bookingName: string;
  bookingDetail: string;
}

export function EnrollerStep({ coaches, selectedCoachId, onSelect, onNext, bookingName, bookingDetail }: EnrollerStepProps) {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const currentUser = useAuthStore(s => s.user);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Auto-fill to current user on mount
  useEffect(() => {
    if (!selectedCoachId && currentUser) {
      onSelect(currentUser.id);
    }
  }, [currentUser]);

  const selectedCoach = coaches.find(c => c.id === selectedCoachId) || currentUser;

  return (
    <View style={styles.container}>
      <Text style={styles.stepLabel}>Step 1</Text>
      <Text style={styles.title}>Enroller</Text>
      <Text style={styles.detail}>{bookingName} · {bookingDetail}</Text>

      <Text style={styles.fieldLabel}>Enrolling Coach</Text>
      <TouchableOpacity
        style={styles.dropdown}
        activeOpacity={0.7}
        onPress={() => setDropdownOpen(!dropdownOpen)}
      >
        <Text style={styles.dropdownText}>
          {selectedCoach?.name || selectedCoach?.email || 'Select coach...'}
        </Text>
        <Ionicons name={dropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color={palette.textTertiary} />
      </TouchableOpacity>

      {dropdownOpen ? (
        <ScrollView style={styles.dropdownList} nestedScrollEnabled>
          {coaches.map(coach => (
            <TouchableOpacity
              key={coach.id}
              style={[
                styles.dropdownItem,
                coach.id === selectedCoachId ? styles.dropdownItemSelected : null,
              ]}
              onPress={() => {
                onSelect(coach.id);
                setDropdownOpen(false);
              }}
            >
              <Text style={[
                styles.dropdownItemText,
                coach.id === selectedCoachId ? styles.dropdownItemTextSelected : null,
              ]}>
                {coach.name || coach.email || ''}
              </Text>
              {coach.id === selectedCoachId ? (
                <Ionicons name="checkmark" size={18} color={Theme.colors.primary} />
              ) : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      <Text style={styles.helperText}>Auto-filled to you. Change if covering for another coach.</Text>

      <TouchableOpacity
        style={[styles.nextButton, !selectedCoachId ? styles.nextButtonDisabled : null]}
        activeOpacity={0.7}
        onPress={onNext}
        disabled={!selectedCoachId}
      >
        <Text style={[styles.nextButtonText, !selectedCoachId ? styles.nextButtonTextDisabled : null]}>
          Next
        </Text>
      </TouchableOpacity>
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
      marginBottom: 16,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.textSecondary,
      marginBottom: 6,
    },
    dropdown: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: palette.borderDefault,
      borderRadius: 10,
      padding: 12,
    },
    dropdownText: {
      fontSize: 14,
      color: palette.textPrimary,
    },
    dropdownList: {
      maxHeight: 160,
      borderWidth: 1,
      borderColor: palette.borderDefault,
      borderRadius: 10,
      marginTop: 4,
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderLight,
    },
    dropdownItemSelected: {
      backgroundColor: palette.backgroundSecondary,
    },
    dropdownItemText: {
      fontSize: 14,
      color: palette.textPrimary,
    },
    dropdownItemTextSelected: {
      color: Theme.colors.primary,
      fontWeight: '600',
    },
    helperText: {
      fontSize: 11,
      color: palette.textTertiary,
      marginTop: 8,
      marginBottom: 20,
    },
    nextButton: {
      backgroundColor: Theme.colors.primary,
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 'auto',
    },
    nextButtonDisabled: {
      backgroundColor: palette.borderDefault,
    },
    nextButtonText: {
      color: Theme.colors.text.inverse,
      fontSize: 14,
      fontWeight: '600',
    },
    nextButtonTextDisabled: {
      color: palette.textTertiary,
    },
  });
