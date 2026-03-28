import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEndOfDayStore } from '@/store/endOfDayStore';
import { EoDWizardStep } from '@/types/endOfDay';
import { Theme } from '@/constants/Theme';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Import wizard step components
import { SelectClubStep } from '@/components/eod-wizard/SelectClubStep';
import { AttendanceStep } from '@/components/eod-wizard/AttendanceStep';
import { TrialsStep } from '@/components/eod-wizard/TrialsStep';
import { NewSignupsStep } from '@/components/eod-wizard/NewSignupsStep';
import { ReturningSignupsStep } from '@/components/eod-wizard/ReturningSignupsStep';
import { FinancialStep } from '@/components/eod-wizard/FinancialStep';
import { HelperCheckupsStep } from '@/components/eod-wizard/HelperCheckupsStep';
import { AdditionalInfoStep } from '@/components/eod-wizard/AdditionalInfoStep';
import { ReviewStep } from '@/components/eod-wizard/ReviewStep';
import { WizardProgress } from '@/components/eod-wizard/WizardProgress';

export default function EoDWizardScreen() {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
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
      case EoDWizardStep.HelperCheckups:
        return <HelperCheckupsStep />;
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
      case EoDWizardStep.HelperCheckups:
        return 'Helper Checkups';
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
            backgroundColor: palette.backgroundGradientStart,
          },
          headerTintColor: palette.text,
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
              <Ionicons name="close" size={24} color={palette.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={[palette.backgroundGradientStart, palette.backgroundGradientEnd]}
          style={styles.gradient}
        >
          <WizardProgress currentStep={wizardState.currentStep} />

          <View style={styles.header}>
            <Text style={[styles.stepTitle, { color: palette.text }]}>
              {getStepTitle()}
            </Text>
          </View>

          <View style={styles.content}>
            {renderStepContent()}
          </View>
        </LinearGradient>
      </SafeAreaView>
    </>
  );
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.backgroundGradientStart,
  },
  gradient: {
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
    fontWeight: Theme.typography.fontWeights.bold,
  },
  content: {
    flex: 1,
    paddingHorizontal: Theme.spacing.lg,
  },
});
