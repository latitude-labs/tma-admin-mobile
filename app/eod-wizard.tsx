import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useEndOfDayStore } from '@/store/endOfDayStore';
import { EoDWizardStep } from '@/types/endOfDay';
import { Theme } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Import wizard step components
import { SelectClubStep } from '@/components/eod-wizard/SelectClubStep';
import { AttendanceStep } from '@/components/eod-wizard/AttendanceStep';
import { TrialsStep } from '@/components/eod-wizard/TrialsStep';
import { NewSignupsStep } from '@/components/eod-wizard/NewSignupsStep';
import { ReturningSignupsStep } from '@/components/eod-wizard/ReturningSignupsStep';
import { FinancialStep } from '@/components/eod-wizard/FinancialStep';
import { AdditionalInfoStep } from '@/components/eod-wizard/AdditionalInfoStep';
import { ReviewStep } from '@/components/eod-wizard/ReviewStep';
import { WizardProgress } from '@/components/eod-wizard/WizardProgress';

export default function EoDWizardScreen() {
  const colorScheme = useColorScheme();
  const currentTheme = Colors[colorScheme ?? 'light'];
  const { wizardState, resetWizard } = useEndOfDayStore();

  const handleBack = () => {
    Alert.alert(
      'Exit Report Creation',
      'Are you sure you want to exit? Your progress will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => {
            resetWizard();
            router.back();
          },
        },
      ]
    );
  };

  const renderStepContent = () => {
    switch (wizardState.currentStep) {
      case EoDWizardStep.SelectClub:
        return <SelectClubStep />;
      case EoDWizardStep.Attendance:
        return <AttendanceStep />;
      case EoDWizardStep.Trials:
        return <TrialsStep />;
      case EoDWizardStep.NewSignups:
        return <NewSignupsStep />;
      case EoDWizardStep.ReturningSignups:
        return <ReturningSignupsStep />;
      case EoDWizardStep.Financial:
        return <FinancialStep />;
      case EoDWizardStep.AdditionalInfo:
        return <AdditionalInfoStep />;
      case EoDWizardStep.Review:
        return <ReviewStep />;
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (wizardState.currentStep) {
      case EoDWizardStep.SelectClub:
        return 'Select Club';
      case EoDWizardStep.Attendance:
        return 'Class Attendance';
      case EoDWizardStep.Trials:
        return 'Trial Sessions';
      case EoDWizardStep.NewSignups:
        return 'New Sign-ups';
      case EoDWizardStep.ReturningSignups:
        return 'Returning Sign-ups';
      case EoDWizardStep.Financial:
        return 'Financial Summary';
      case EoDWizardStep.AdditionalInfo:
        return 'Additional Information';
      case EoDWizardStep.Review:
        return 'Review & Submit';
      default:
        return '';
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'End of Day Report',
          headerStyle: {
            backgroundColor: currentTheme.background,
          },
          headerTintColor: currentTheme.text,
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
              <Ionicons name="close" size={24} color={currentTheme.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView
        style={[styles.container, { backgroundColor: currentTheme.background }]}
      >
        <WizardProgress currentStep={wizardState.currentStep} />

        <View style={styles.header}>
          <Text style={[styles.stepTitle, { color: currentTheme.text }]}>
            {getStepTitle()}
          </Text>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    padding: Theme.spacing.sm,
  },
  header: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
  },
  stepTitle: {
    fontSize: Theme.typography.sizes.xxl,
    fontFamily: Theme.typography.fonts.bold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl,
  },
});