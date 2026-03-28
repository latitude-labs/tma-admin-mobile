import React, { useMemo, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { Theme } from '@/constants/Theme';
import { PackageName } from '@/types/api';

// ── Package definitions ──────────────────────────────────────────────

interface PackageDefinition {
  name: PackageName;
  label: string;
  items: string[];
}

const PACKAGES: PackageDefinition[] = [
  { name: 'licence', label: 'Licence', items: ['T-shirt', 'Trousers'] },
  { name: 'basic', label: 'Basic', items: ['T-shirt', 'Trousers', 'Gloves'] },
  { name: 'silver', label: 'Silver', items: ['T-shirt', 'Trousers', 'Gloves', 'Shinpads'] },
  { name: 'gold', label: 'Gold', items: ['T-shirt', 'Trousers', 'Gloves', 'Shinpads', 'Kit bag'] },
];

// ── Size options per item type ───────────────────────────────────────

const CLOTHING_SIZES = [
  'Small Youth', 'Medium Youth', 'Large Youth', 'XL Youth',
  'Small', 'Medium', 'Large', 'XL', '2XL', '3XL',
];

const GLOVE_SIZES = ['8oz', '10oz', '12oz', '14oz', '16oz'];

const SHINPAD_SIZES = ['Small', 'Medium', 'Large', 'XL'];

const KIT_BAG_SIZES = ['One Size'];

const getSizesForItem = (itemType: string): string[] => {
  switch (itemType) {
    case 'T-shirt':
    case 'Trousers':
      return CLOTHING_SIZES;
    case 'Gloves':
      return GLOVE_SIZES;
    case 'Shinpads':
      return SHINPAD_SIZES;
    case 'Kit bag':
      return KIT_BAG_SIZES;
    default:
      return [];
  }
};

// ── Props ────────────────────────────────────────────────────────────

interface KitPackageStepProps {
  onConfirm: (packageName: PackageName, kitItems: Array<{ type: string; size: string }>) => void;
  bookingName: string;
  statusLabel: string;
}

// ── Size chip (extracted to avoid hooks in loops) ────────────────────

interface SizeChipProps {
  size: string;
  selected: boolean;
  onPress: () => void;
  palette: ReturnType<typeof useThemeColors>;
}

function SizeChip({ size, selected, onPress, palette }: SizeChipProps) {
  const styles = useMemo(() => createSizeChipStyles(palette, selected), [palette, selected]);

  return (
    <TouchableOpacity style={styles.chip} activeOpacity={0.7} onPress={onPress}>
      <Text style={styles.chipText}>{size}</Text>
    </TouchableOpacity>
  );
}

const createSizeChipStyles = (palette: ThemeColors, selected: boolean) =>
  StyleSheet.create({
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: selected ? Theme.colors.primary : palette.borderDefault,
      backgroundColor: selected ? Theme.colors.primary : palette.backgroundSecondary,
      marginRight: 8,
    },
    chipText: {
      fontSize: 13,
      fontWeight: selected ? '600' : '400',
      color: selected ? Theme.colors.text.inverse : palette.textPrimary,
    },
  });

// ── Main component ───────────────────────────────────────────────────

export function KitPackageStep({ onConfirm, bookingName, statusLabel }: KitPackageStepProps) {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [selectedPackage, setSelectedPackage] = useState<PackageName | null>(null);
  const [phase, setPhase] = useState<'package' | 'size'>('package');
  const [sizes, setSizes] = useState<Record<string, string>>({});

  const currentPackage = PACKAGES.find((p) => p.name === selectedPackage);

  const allSizesSelected = currentPackage
    ? currentPackage.items.every((item) => !!sizes[item])
    : false;

  const handlePackageSelect = useCallback((pkg: PackageName) => {
    setSelectedPackage(pkg);
    setSizes({});
  }, []);

  const handleContinueToSize = useCallback(() => {
    if (selectedPackage) {
      setPhase('size');
    }
  }, [selectedPackage]);

  const handleBackToPackage = useCallback(() => {
    setPhase('package');
  }, []);

  const handleSizeSelect = useCallback((itemType: string, size: string) => {
    setSizes((prev) => ({ ...prev, [itemType]: size }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (!selectedPackage || !currentPackage || !allSizesSelected) return;
    const kitItems = currentPackage.items.map((item) => ({
      type: item,
      size: sizes[item],
    }));
    onConfirm(selectedPackage, kitItems);
  }, [selectedPackage, currentPackage, allSizesSelected, sizes, onConfirm]);

  // ── Package selection phase ──────────────────────────────────────

  if (phase === 'package') {
    return (
      <View style={styles.container}>
        <Text style={styles.stepLabel}>Step 4 of 4</Text>
        <Text style={styles.title}>Kit Package</Text>
        <Text style={styles.detail}>{bookingName} · {statusLabel}</Text>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {PACKAGES.map((pkg) => {
            const isSelected = selectedPackage === pkg.name;
            return (
              <TouchableOpacity
                key={pkg.name}
                style={[styles.packageCard, isSelected ? styles.packageCardSelected : null]}
                activeOpacity={0.7}
                onPress={() => handlePackageSelect(pkg.name)}
              >
                <View style={styles.packageHeader}>
                  <Text style={styles.packageLabel}>{pkg.label}</Text>
                  {isSelected ? (
                    <Text style={styles.checkmark}>{'\u2713'}</Text>
                  ) : null}
                </View>
                <Text style={styles.packageItems}>{pkg.items.join(', ')}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          style={[styles.confirmButton, !selectedPackage ? styles.confirmButtonDisabled : null]}
          activeOpacity={0.7}
          disabled={!selectedPackage}
          onPress={handleContinueToSize}
        >
          <Text style={styles.confirmButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Size selection phase ─────────────────────────────────────────

  return (
    <View style={styles.container}>
      <Text style={styles.stepLabel}>Step 4 of 4</Text>
      <Text style={styles.title}>Select Sizes</Text>
      <Text style={styles.detail}>
        {bookingName} · {currentPackage?.label || ''} Package
      </Text>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {currentPackage?.items.map((item) => (
          <View key={item} style={styles.sizeGroup}>
            <Text style={styles.sizeGroupLabel}>{item}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {getSizesForItem(item).map((size) => (
                <SizeChip
                  key={size}
                  size={size}
                  selected={sizes[item] === size}
                  onPress={() => handleSizeSelect(item, size)}
                  palette={palette}
                />
              ))}
            </ScrollView>
          </View>
        )) || null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={handleBackToPackage}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmButton, styles.confirmButtonFlex, !allSizesSelected ? styles.confirmButtonDisabled : null]}
          activeOpacity={0.7}
          disabled={!allSizesSelected}
          onPress={handleConfirm}
        >
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

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
    list: {
      flex: 1,
    },
    // Package cards
    packageCard: {
      borderWidth: 1,
      borderColor: palette.borderDefault,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
    },
    packageCardSelected: {
      borderColor: Theme.colors.primary,
      borderWidth: 2,
    },
    packageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    packageLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: palette.textPrimary,
    },
    checkmark: {
      fontSize: 16,
      fontWeight: '700',
      color: Theme.colors.primary,
    },
    packageItems: {
      fontSize: 12,
      color: palette.textSecondary,
      marginTop: 4,
    },
    // Size groups
    sizeGroup: {
      marginBottom: 16,
    },
    sizeGroupLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.textSecondary,
      marginBottom: 8,
    },
    // Footer
    footer: {
      flexDirection: 'row',
      gap: 10,
      paddingTop: 8,
    },
    backButton: {
      borderWidth: 1,
      borderColor: palette.borderDefault,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    backButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: palette.textPrimary,
    },
    confirmButton: {
      backgroundColor: Theme.colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      width: '100%',
    },
    confirmButtonFlex: {
      flex: 1,
      width: undefined,
    },
    confirmButtonDisabled: {
      opacity: 0.4,
    },
    confirmButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: Theme.colors.text.inverse,
    },
  });
