import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useEndOfDayStore } from '@/store/endOfDayStore';
import { Theme } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export const AdditionalInfoStep: React.FC = () => {
  const colorScheme = useColorScheme();
  const currentTheme = Colors[colorScheme ?? 'light'];
  const {
    wizardState,
    updateWizardData,
    goToNextStep,
    goToPreviousStep,
  } = useEndOfDayStore();

  const [signupNames, setSignupNames] = useState(wizardState.data.signup_names || '');
  const [helperNames, setHelperNames] = useState(wizardState.data.helper_names || '');
  const [incidents, setIncidents] = useState(wizardState.data.incidents || '');
  const [generalNotes, setGeneralNotes] = useState(wizardState.data.general_notes || '');

  const handleNext = () => {
    updateWizardData({
      signup_names: signupNames.trim() || null,
      helper_names: helperNames.trim() || null,
      incidents: incidents.trim() || null,
      general_notes: generalNotes.trim() || null,
    });
    goToNextStep();
  };

  const renderTextArea = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    placeholder: string,
    icon: string,
    iconColor: string,
    maxLength: number = 500
  ) => (
    <Card style={styles.inputCard}>
      <View style={styles.inputHeader}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
        <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
          {label}
        </Text>
        <Text style={[styles.charCount, { color: Theme.colors.text.tertiary }]}>
          {value.length}/{maxLength}
        </Text>
      </View>
      <TextInput
        style={[styles.textInput, { color: currentTheme.text }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Theme.colors.text.secondary}
        multiline
        numberOfLines={3}
        maxLength={maxLength}
        textAlignVertical="top"
      />
    </Card>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={[styles.description, { color: Theme.colors.text.secondary }]}>
        Add any additional information about today's sessions (optional)
      </Text>

      {renderTextArea(
        'New Sign-ups',
        signupNames,
        setSignupNames,
        'Names of people who signed up today...',
        'person-add',
        Theme.colors.success,
        500
      )}

      {renderTextArea(
        'Helpers/Assistants',
        helperNames,
        setHelperNames,
        'Names of people who helped with the class...',
        'people',
        Theme.colors.info,
        500
      )}

      {renderTextArea(
        'Incidents',
        incidents,
        setIncidents,
        'Any injuries, issues, or incidents to report...',
        'warning',
        Theme.colors.error,
        1000
      )}

      {renderTextArea(
        'General Notes',
        generalNotes,
        setGeneralNotes,
        'Any other notes about today\'s sessions...',
        'document-text',
        Theme.colors.primary,
        1000
      )}

      <View style={styles.info}>
        <Ionicons name="information-circle" size={20} color={Theme.colors.info} />
        <Text style={[styles.infoText, { color: Theme.colors.info }]}>
          All fields are optional. Skip this step if you have nothing to add.
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          variant="outline"
          onPress={goToPreviousStep}
          style={styles.footerButton}
        >
          Back
        </Button>
        <Button
          variant="primary"
          onPress={handleNext}
          style={styles.footerButton}
        >
          Continue
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  description: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    marginBottom: Theme.spacing.lg,
    lineHeight: Theme.typography.sizes.md * 1.5,
  },
  inputCard: {
    marginBottom: Theme.spacing.md,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  inputLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  charCount: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
  },
  textInput: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    minHeight: 80,
    lineHeight: Theme.typography.sizes.md * 1.5,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.info + '10',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.lg,
  },
  infoText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Theme.spacing.lg,
  },
  footerButton: {
    flex: 1,
    marginHorizontal: Theme.spacing.sm,
  },
});