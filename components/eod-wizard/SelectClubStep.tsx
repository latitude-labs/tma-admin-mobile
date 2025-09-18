import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useClubStore } from '@/store/clubStore';
import { useEndOfDayStore } from '@/store/endOfDayStore';
import { Theme } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { Club } from '@/types/api';

export const SelectClubStep: React.FC = () => {
  const colorScheme = useColorScheme();
  const currentTheme = Colors[colorScheme ?? 'light'];
  const { clubs } = useClubStore();
  const {
    wizardState,
    updateWizardData,
    setClassAvailability,
    goToNextStep,
  } = useEndOfDayStore();

  const selectedClubId = wizardState.data.club_id;

  const handleClubSelect = (club: Club) => {
    updateWizardData({ club_id: club.id });

    // Determine class availability based on club's class times
    if (club.class_times && club.class_times.length > 0) {
      const hasKids1 = club.class_times.some(ct => ct.name?.toLowerCase().includes('kids 1'));
      const hasKids2 = club.class_times.some(ct => ct.name?.toLowerCase().includes('kids 2'));
      const hasAdults = club.class_times.some(ct => ct.name?.toLowerCase().includes('adult'));

      setClassAvailability(hasKids1, hasKids2, hasAdults);
    } else {
      // Default to kids 1 and adults if no class time info
      setClassAvailability(true, false, true);
    }
  };

  const handleNext = () => {
    if (selectedClubId) {
      goToNextStep();
    }
  };

  const renderClubItem = ({ item }: { item: Club }) => {
    const isSelected = selectedClubId === item.id;

    return (
      <TouchableOpacity
        onPress={() => handleClubSelect(item)}
        activeOpacity={0.7}
      >
        <Card
          variant={isSelected ? 'elevated' : 'outlined'}
          style={[
            styles.clubCard,
            isSelected && styles.selectedCard,
          ]}
        >
          <View style={styles.clubContent}>
            <View style={styles.clubInfo}>
              <Text style={[styles.clubName, { color: currentTheme.text }]}>
                {item.name}
              </Text>
              {item.address && (
                <Text style={[styles.clubAddress, { color: Theme.colors.text.secondary }]}>
                  {item.address}
                </Text>
              )}
              {item.postcode && (
                <Text style={[styles.clubAddress, { color: Theme.colors.text.secondary }]}>
                  {item.postcode}
                </Text>
              )}
            </View>
            {isSelected && (
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={Theme.colors.primary}
              />
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.description, { color: Theme.colors.text.secondary }]}>
        Choose the club for today's end of day report
      </Text>

      <FlatList
        data={clubs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderClubItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footer}>
        <Button
          variant="primary"
          fullWidth
          onPress={handleNext}
          disabled={!selectedClubId}
        >
          Continue
        </Button>
      </View>
    </View>
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
  listContent: {
    paddingBottom: Theme.spacing.xl,
  },
  clubCard: {
    marginBottom: Theme.spacing.md,
  },
  selectedCard: {
    borderColor: Theme.colors.primary,
    borderWidth: 2,
  },
  clubContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clubInfo: {
    flex: 1,
  },
  clubName: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    marginBottom: Theme.spacing.xs,
  },
  clubAddress: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
  },
  footer: {
    paddingTop: Theme.spacing.lg,
  },
});