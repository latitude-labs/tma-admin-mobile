import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Theme } from '@/constants/Theme';
import { useEndOfDayStore } from '@/store/endOfDayStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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
            <Text style={[styles.charCount, { color: currentTheme.text }]}>
              {value.length}/{maxLength}
            </Text>
          </View>
          <TextInput
            ref={inputRef}
            style={[styles.textInput, { color: currentTheme.text }]}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={currentTheme.text + '80'}
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
                  <Text style={[styles.toolbarButtonText, { color: currentTheme.tint }]}>
                    Next Field
                  </Text>
                  <Ionicons name="arrow-down" size={16} color={currentTheme.tint} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => Keyboard.dismiss()}
                style={styles.toolbarButton}
              >
                <Text style={[styles.toolbarButtonText, { color: currentTheme.tint }]}>
                  Done
                </Text>
                <Ionicons name="checkmark" size={16} color={currentTheme.tint} />
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
        <Text style={[styles.description, { color: currentTheme.text }]}>
          Add any additional information about today's sessions (optional)
        </Text>
      </TouchableOpacity>

      {renderTextArea(
        'New Sign-ups',
        signupNames,
        setSignupNames,
        'Names of people who signed up today...',
        'person-add',
        '#4CAF50',
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
        '#2196F3',
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
        '#F44336',
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
        currentTheme.tint,
        1000,
        generalNotesRef,
        undefined,
        'notes'
      )}

      <View style={styles.info}>
        <Ionicons name="information-circle" size={20} color={'#2196F3'} />
        <Text style={[styles.infoText, { color: '#2196F3' }]}>
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
    borderTopColor: Colors.border.light,
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
    backgroundColor: '#2196F3' + '10',
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