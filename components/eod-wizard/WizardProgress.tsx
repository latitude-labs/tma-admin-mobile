import React from 'react';
import { View, StyleSheet } from 'react-native';
import { EoDWizardStep } from '@/types/endOfDay';
import { Theme } from '@/constants/Theme';

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
  EoDWizardStep.AdditionalInfo,
  EoDWizardStep.Review,
];

export const WizardProgress: React.FC<WizardProgressProps> = ({ currentStep }) => {
  const currentIndex = STEPS.indexOf(currentStep);
  const progress = ((currentIndex + 1) / STEPS.length) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progress}%`,
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
    backgroundColor: Theme.colors.secondary.light,
    borderRadius: Theme.borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.full,
  },
});