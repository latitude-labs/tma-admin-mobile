import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Keyboard,
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
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Refs for input navigation
  const signupNamesRef = useRef<TextInput>(null);
  const helperNamesRef = useRef<TextInput>(null);
  const incidentsRef = useRef<TextInput>(null);
  const generalNotesRef = useRef<TextInput>(null);

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
    maxLength: number = 500,
    inputRef?: React.RefObject<TextInput>,
    nextInputRef?: React.RefObject<TextInput>,
    fieldName?: string
  ) => {
    const isFocused = focusedField === fieldName;

    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => inputRef?.current?.focus()}
        style={styles.inputTouchable}
      >
        <Card style={[
          styles.inputCard,
          isFocused && styles.inputCardFocused
        ]}>
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
            ref={inputRef}
            style={[styles.textInput, { color: currentTheme.text }]}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={Theme.colors.text.secondary}
            multiline
            numberOfLines={3}
            maxLength={maxLength}
            textAlignVertical="top"
            returnKeyType={nextInputRef ? 'next' : 'done'}
            blurOnSubmit={!nextInputRef}
            onFocus={() => setFocusedField(fieldName || null)}
            onBlur={() => setFocusedField(null)}
            onSubmitEditing={() => {
              if (nextInputRef?.current) {
                nextInputRef.current.focus();
              } else {
                Keyboard.dismiss();
              }
            }}
          />
          {isFocused && (
            <View style={styles.keyboardToolbar}>
              {nextInputRef && (
                <TouchableOpacity
                  onPress={() => nextInputRef.current?.focus()}
                  style={styles.toolbarButton}
                >
                  <Text style={[styles.toolbarButtonText, { color: Theme.colors.primary }]}>
                    Next Field
                  </Text>
                  <Ionicons name="arrow-down" size={16} color={Theme.colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => Keyboard.dismiss()}
                style={styles.toolbarButton}
              >
                <Text style={[styles.toolbarButtonText, { color: Theme.colors.primary }]}>
                  Done
                </Text>
                <Ionicons name="checkmark" size={16} color={Theme.colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => Keyboard.dismiss()}
        style={styles.dismissArea}
      >
        <Text style={[styles.description, { color: Theme.colors.text.secondary }]}>
          Add any additional information about today's sessions (optional)
        </Text>
      </TouchableOpacity>

      {renderTextArea(
        'New Sign-ups',
        signupNames,
        setSignupNames,
        'Names of people who signed up today...',
        'person-add',
        Theme.colors.success,
        500,
        signupNamesRef,
        helperNamesRef,
        'signup'
      )}

      {renderTextArea(
        'Helpers/Assistants',
        helperNames,
        setHelperNames,
        'Names of people who helped with the class...',
        'people',
        Theme.colors.info,
        500,
        helperNamesRef,
        incidentsRef,
        'helpers'
      )}

      {renderTextArea(
        'Incidents',
        incidents,
        setIncidents,
        'Any injuries, issues, or incidents to report...',
        'warning',
        Theme.colors.error,
        1000,
        incidentsRef,
        generalNotesRef,
        'incidents'
      )}

      {renderTextArea(
        'General Notes',
        generalNotes,
        setGeneralNotes,
        'Any other notes about today\'s sessions...',
        'document-text',
        Theme.colors.primary,
        1000,
        generalNotesRef,
        undefined,
        'notes'
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Theme.spacing.xl,
  },
  dismissArea: {
    marginBottom: Theme.spacing.sm,
  },
  description: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    marginBottom: Theme.spacing.lg,
    lineHeight: Theme.typography.sizes.md * 1.5,
  },
  inputTouchable: {
    marginBottom: Theme.spacing.lg,
  },
  inputCard: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputCardFocused: {
    borderColor: Theme.colors.primary,
    borderWidth: 1,
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
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.xs,
  },
  keyboardToolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border.light,
    marginTop: Theme.spacing.sm,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.md,
    marginLeft: Theme.spacing.md,
  },
  toolbarButtonText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    marginRight: Theme.spacing.xs,
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