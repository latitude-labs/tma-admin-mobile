import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { Theme } from '@/constants/Theme';
import { LicenceDetails } from '@/types/api';
import { format } from 'date-fns';

interface LicenceDetailsStepProps {
  initialName: string;
  value: Partial<LicenceDetails>;
  onChange: (details: Partial<LicenceDetails>) => void;
  onNext: () => void;
  bookingName: string;
  statusLabel: string;
}

export function LicenceDetailsStep({
  initialName,
  value,
  onChange,
  onNext,
  bookingName,
  statusLabel,
}: LicenceDetailsStepProps) {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [showDatePicker, setShowDatePicker] = useState(false);

  const name = value.name ?? initialName;
  const dateOfBirth = value.date_of_birth || '';
  const address = value.address || '';

  const isComplete = name.trim().length > 0 && dateOfBirth.length > 0 && address.trim().length > 0;

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      onChange({ ...value, date_of_birth: format(selectedDate, 'yyyy-MM-dd') });
    }
  };

  const parsedDate = dateOfBirth ? new Date(dateOfBirth) : new Date(2000, 0, 1);

  return (
    <View style={styles.container}>
      <Text style={styles.stepLabel}>Step 3 of 4</Text>
      <Text style={styles.title}>Licence Details</Text>
      <Text style={styles.detail}>{bookingName} · {statusLabel}</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={(text) => onChange({ ...value, name: text })}
          placeholder="Full name"
          placeholderTextColor={palette.textTertiary}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Date of Birth</Text>
        <TouchableOpacity
          style={styles.dateButton}
          activeOpacity={0.7}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={dateOfBirth ? styles.dateText : styles.datePlaceholder}>
            {dateOfBirth ? format(parsedDate, 'dd/MM/yyyy') : 'Select date of birth'}
          </Text>
        </TouchableOpacity>
        {showDatePicker ? (
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={parsedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
            {Platform.OS === 'ios' ? (
              <TouchableOpacity
                style={styles.pickerDone}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.pickerDoneText}>Done</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Address</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={address}
          onChangeText={(text) => onChange({ ...value, address: text })}
          placeholder="Full address"
          placeholderTextColor={palette.textTertiary}
          multiline
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity
        style={[styles.nextButton, !isComplete ? styles.nextButtonDisabled : null]}
        activeOpacity={0.7}
        disabled={!isComplete}
        onPress={onNext}
      >
        <Text style={styles.nextButtonText}>Next</Text>
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
      marginBottom: 14,
    },
    fieldGroup: {
      marginBottom: 14,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.textSecondary,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.borderDefault,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: palette.textPrimary,
      backgroundColor: palette.backgroundSecondary,
    },
    multilineInput: {
      minHeight: 80,
    },
    dateButton: {
      borderWidth: 1,
      borderColor: palette.borderDefault,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: palette.backgroundSecondary,
    },
    dateText: {
      fontSize: 15,
      color: palette.textPrimary,
    },
    datePlaceholder: {
      fontSize: 15,
      color: palette.textTertiary,
    },
    pickerContainer: {
      marginTop: 8,
    },
    pickerDone: {
      alignSelf: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    pickerDoneText: {
      fontSize: 15,
      fontWeight: '600',
      color: Theme.colors.primary,
    },
    nextButton: {
      backgroundColor: Theme.colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    nextButtonDisabled: {
      opacity: 0.4,
    },
    nextButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: Theme.colors.text.inverse,
    },
  });
