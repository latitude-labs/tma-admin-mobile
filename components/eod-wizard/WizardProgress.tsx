import React from 'react';
import { View, StyleSheet } from 'react-native';
import { EoDWizardStep } from '@/types/endOfDay';
import { Theme } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

interface WizardProgressProps {
  currentStep: EoDWizardStep;
}

const STEPS = [
  EoDWizardStep.SelectClub,
  EoDWizardStep.Attendance,
  EoDWizardStep.Trials,
  EoDWizardStep.NewSignups,
  EoDWizardStep.ReturningSignups,
  EoDWizardStep.Financial,
  EoDWizardStep.HelperCheckups,
  EoDWizardStep.AdditionalInfo,
  EoDWizardStep.Review,
];

export const WizardProgress: React.FC<WizardProgressProps> = ({ currentStep }) => {
  const colorScheme = useColorScheme();
  const currentTheme = Colors[colorScheme ?? 'light'];
  const currentIndex = STEPS.indexOf(currentStep);
  const progress = ((currentIndex + 1) / STEPS.length) * 100;

  return (
    <View style={styles.container}>
      <View style={[styles.progressBar, { backgroundColor: currentTheme.card }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progress}%`,
              backgroundColor: currentTheme.tint,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
  },
  progressBar: {
    height: 4,
    borderRadius: Theme.borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Theme.borderRadius.full,
  },
});