import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useEndOfDayStore } from '@/store/endOfDayStore';
import { Theme } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export const FinancialStep: React.FC = () => {
  const colorScheme = useColorScheme();
  const currentTheme = Colors[colorScheme ?? 'light'];
  const {
    wizardState,
    updateWizardData,
    goToNextStep,
    goToPreviousStep,
  } = useEndOfDayStore();

  const [cashAmount, setCashAmount] = useState(
    wizardState.data.total_cash_taken?.toString() || '0'
  );

  const handleCashChange = (text: string) => {
    // Allow only numbers and decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');

    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) return;

    // Limit decimal places to 2
    if (parts[1] && parts[1].length > 2) return;

    setCashAmount(cleaned);
    const amount = parseFloat(cleaned) || 0;
    updateWizardData({ total_cash_taken: amount });
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount) || 0;
    return num.toFixed(2);
  };

  const quickAmounts = [10, 20, 30, 40, 50, 100];

  const handleQuickAmount = (amount: number) => {
    const newAmount = (parseFloat(cashAmount) || 0) + amount;
    setCashAmount(newAmount.toString());
    updateWizardData({ total_cash_taken: newAmount });
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scrollContent}>
      <Text style={[styles.title, { color: currentTheme.text }]}>
        Cash Collection
      </Text>
      <Text style={[styles.description, { color: Theme.colors.text.secondary }]}>
        How much cash was collected today?
      </Text>

      <Card style={styles.inputCard}>
        <View style={styles.currencyInputContainer}>
          <Text style={[styles.currencySymbol, { color: Theme.colors.primary }]}>
            £
          </Text>
          <TextInput
            style={[styles.currencyInput, { color: currentTheme.text }]}
            value={cashAmount}
            onChangeText={handleCashChange}
            placeholder="0.00"
            placeholderTextColor={Theme.colors.text.secondary}
            keyboardType="decimal-pad"
            maxLength={10}
            returnKeyType="done"
            blurOnSubmit={true}
          />
        </View>
      </Card>

      <View style={styles.quickAmounts}>
        <Text style={[styles.quickAmountsLabel, { color: Theme.colors.text.secondary }]}>
          Quick add:
        </Text>
        <View style={styles.quickAmountsGrid}>
          {quickAmounts.map(amount => (
            <TouchableOpacity
              key={amount}
              onPress={() => handleQuickAmount(amount)}
              style={styles.quickAmountButton}
            >
              <Text style={styles.quickAmountText}>+£{amount}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: Theme.colors.text.secondary }]}>
              Kit Sales Expected
            </Text>
            <Text style={[styles.summaryHint, { color: Theme.colors.text.tertiary }]}>
              (Approx. £40 per kit)
            </Text>
          </View>
          <Text style={[styles.summaryValue, { color: currentTheme.text }]}>
            £{((wizardState.data.new_kids_paid_kit_and_signed_dd_count || 0) * 40 +
              (wizardState.data.new_adults_paid_kit_and_signed_dd_count || 0) * 40 +
              (wizardState.data.returning_kids_paid_kit_and_signed_dd_count || 0) * 40 +
              (wizardState.data.returning_adults_paid_kit_and_signed_dd_count || 0) * 40).toFixed(2)}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: Theme.colors.border.light }]} />

        <View style={styles.summaryRow}>
          <Text style={[styles.totalLabel, { color: currentTheme.text }]}>
            Total Cash Collected
          </Text>
          <Text style={[styles.totalValue, { color: Theme.colors.success }]}>
            £{formatCurrency(cashAmount)}
          </Text>
        </View>
      </Card>

      <View style={styles.info}>
        <Ionicons name="information-circle" size={20} color={Theme.colors.info} />
        <Text style={[styles.infoText, { color: Theme.colors.info }]}>
          Include all cash collected: kit sales, trial fees, and any other payments
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
          onPress={goToNextStep}
          style={styles.footerButton}
        >
          Continue
        </Button>
      </View>
    </ScrollView>
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
  title: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
    marginBottom: Theme.spacing.xs,
  },
  description: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    marginBottom: Theme.spacing.lg,
    lineHeight: Theme.typography.sizes.md * 1.5,
  },
  inputCard: {
    marginBottom: Theme.spacing.lg,
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: Theme.typography.sizes.xxxl,
    fontFamily: Theme.typography.fonts.bold,
    marginRight: Theme.spacing.sm,
  },
  currencyInput: {
    flex: 1,
    fontSize: Theme.typography.sizes.xxxl,
    fontFamily: Theme.typography.fonts.bold,
  },
  quickAmounts: {
    marginBottom: Theme.spacing.lg,
  },
  quickAmountsLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    marginBottom: Theme.spacing.sm,
  },
  quickAmountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Theme.spacing.xs,
  },
  quickAmountButton: {
    backgroundColor: Theme.colors.secondary.light,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    margin: Theme.spacing.xs,
  },
  quickAmountText: {
    color: Theme.colors.text.primary,
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
  },
  summaryCard: {
    backgroundColor: Theme.colors.background.secondary,
    marginBottom: Theme.spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
  },
  summaryHint: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    marginTop: 2,
  },
  summaryValue: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
  },
  divider: {
    height: 1,
    marginVertical: Theme.spacing.sm,
  },
  totalLabel: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
  },
  totalValue: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
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