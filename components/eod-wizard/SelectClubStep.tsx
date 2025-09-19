import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useClubStore } from '@/store/clubStore';
import { useEndOfDayStore } from '@/store/endOfDayStore';
import { Theme } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dropdown, DropdownOption } from '@/components/ui';
import { Ionicons } from '@expo/vector-icons';
import { classTimesService } from '@/services/api/classTimes.service';
import { ClassTime, Club } from '@/types/api';
import { format } from 'date-fns';

export const SelectClubStep: React.FC = () => {
  const colorScheme = useColorScheme();
  const currentTheme = Colors[colorScheme ?? 'light'];
  const { clubs, fetchClubs, isLoading: clubsLoading } = useClubStore();
  const {
    wizardState,
    updateWizardData,
    setClassAvailability,
    goToNextStep,
  } = useEndOfDayStore();

  const [clubsWithClassesToday, setClubsWithClassesToday] = useState<Club[]>([]);
  const [todaysClasses, setTodaysClasses] = useState<ClassTime[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const selectedClubId = wizardState.data.club_id;

  // Fetch clubs and today's class times when component mounts
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // Ensure clubs are loaded
      if (clubs.length === 0 && !clubsLoading) {
        await fetchClubs();
      }

      // Fetch today's class times
      await fetchTodaysClassTimes();
    };
    loadData();
  }, []);

  // Filter clubs when we have both clubs and classes data
  useEffect(() => {
    if (clubs.length > 0 && todaysClasses.length > 0) {
      // Get club IDs from today's classes - handle both club_id and club.id
      const clubIds = [...new Set(todaysClasses.map(ct => {
        if (ct.club_id) return ct.club_id;
        if (ct.club?.id) return ct.club.id;
        return null;
      }).filter(id => id !== null))];

      const filteredClubs = clubs.filter(club => clubIds.includes(club.id));
      setClubsWithClassesToday(filteredClubs);
    }
  }, [clubs, todaysClasses]);

  const fetchTodaysClassTimes = async () => {
    try {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDay = dayNames[today.getDay()];

      // Fetch class times for today
      const allClassTimes = await classTimesService.getClassTimes({
        date_from: todayString,
        date_to: todayString
      });

      // Filter to only show today's classes
      const todaysClassesFiltered = allClassTimes.filter(classTime => {
        const classDay = classTime.day;
        return classDay && classDay.toLowerCase() === currentDay.toLowerCase();
      });

      setTodaysClasses(todaysClassesFiltered);
    } catch (error) {
      console.error('Failed to fetch class times:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClubSelect = (clubId: string) => {
    const club = clubsWithClassesToday.find(c => c.id.toString() === clubId);
    if (!club) return;

    updateWizardData({ club_id: club.id });

    // Get the classes for this club today - check both club_id and club.id
    const clubClasses = todaysClasses.filter(ct => {
      if (ct.club_id === club.id) return true;
      if (ct.club?.id === club.id) return true;
      return false;
    });

    // Determine class availability based on today's classes for this club
    const classNames = clubClasses.map(ct => ct.name?.toLowerCase() || '');

    // Check for different class types - be more flexible with naming
    const hasKids1 = classNames.some(name =>
      name.includes('kids 1') ||
      name.includes('kids class 1') ||
      (name === 'kids' && !classNames.some(n => n.includes('kids 2'))) // If just "Kids", treat as Kids 1
    );
    const hasKids2 = classNames.some(name =>
      name.includes('kids 2') ||
      name.includes('kids class 2')
    );
    const hasAdults = classNames.some(name =>
      name.includes('adult') ||
      name === 'adults'
    );

    setClassAvailability(hasKids1, hasKids2, hasAdults);
  };

  const handleNext = () => {
    if (selectedClubId) {
      goToNextStep();
    }
  };

  // Convert clubs to dropdown options
  const clubOptions: DropdownOption[] = clubsWithClassesToday.map(club => {
    const classCount = todaysClasses.filter(ct => {
      if (ct.club_id === club.id) return true;
      if (ct.club?.id === club.id) return true;
      return false;
    }).length;
    const classLabel = classCount === 1 ? 'class' : 'classes';

    return {
      label: `${club.name} (${classCount} ${classLabel} today)`,
      value: club.id.toString(),
    };
  });

  const selectedClub = clubsWithClassesToday.find(c => c.id === selectedClubId);
  const selectedClubClasses = selectedClub
    ? todaysClasses.filter(ct => {
        if (ct.club_id === selectedClub.id) return true;
        if (ct.club?.id === selectedClub.id) return true;
        return false;
      })
    : [];

  // Helper function to format time
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

    // Only show minutes if they're not zero
    if (minutes === 0) {
      return `${displayHours}${period}`;
    }
    return `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={[styles.description, { color: Theme.colors.text.secondary }]}>
        Choose the club for today's end of day report
      </Text>

      <Card style={styles.dateCard}>
        <View style={styles.dateHeader}>
          <Ionicons name="calendar" size={24} color={Theme.colors.primary} />
          <Text style={[styles.dateText, { color: currentTheme.text }]}>
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </Text>
        </View>
      </Card>

      {isLoading && (
        <Card style={styles.selectionCard}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Theme.colors.primary} />
            <Text style={[styles.loadingText, { color: Theme.colors.text.secondary }]}>
              Loading clubs with classes today...
            </Text>
          </View>
        </Card>
      )}

      {!isLoading && clubsWithClassesToday.length === 0 && (
        <Card style={styles.selectionCard}>
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={Theme.colors.text.tertiary} />
            <Text style={[styles.emptyText, { color: Theme.colors.text.secondary }]}>
              No clubs have classes scheduled for today
            </Text>
            <Text style={[styles.emptySubtext, { color: Theme.colors.text.tertiary }]}>
              There are no classes to report on today
            </Text>
          </View>
        </Card>
      )}

      {!isLoading && clubsWithClassesToday.length > 0 && (
        <>
          <Card style={styles.selectionCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="business" size={24} color={Theme.colors.primary} />
              <Text style={[styles.cardTitle, { color: currentTheme.text }]}>
                Select Club
              </Text>
            </View>

            <Dropdown
              value={selectedClubId?.toString() || ''}
              options={clubOptions}
              onValueChange={handleClubSelect}
              placeholder="Select a club"
              label="Club with classes today"
            />

            {selectedClub && (
              <View style={styles.selectedInfo}>
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color={Theme.colors.text.secondary} />
                  <Text style={[styles.infoText, { color: Theme.colors.text.secondary }]}>
                    {selectedClub.address || 'No address available'}
                  </Text>
                </View>
                {selectedClub.postcode && (
                  <View style={styles.infoRow}>
                    <Ionicons name="map-outline" size={16} color={Theme.colors.text.secondary} />
                    <Text style={[styles.infoText, { color: Theme.colors.text.secondary }]}>
                      {selectedClub.postcode}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </Card>

          {selectedClub && selectedClubClasses.length > 0 && (
            <Card style={styles.classesCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="time" size={24} color={Theme.colors.info} />
                <Text style={[styles.cardTitle, { color: currentTheme.text }]}>
                  Today's Classes at {selectedClub.name}
                </Text>
              </View>
              <View style={styles.classesList}>
                {selectedClubClasses
                  .sort((a, b) => {
                    const timeA = a.start_time.split(':').map(Number);
                    const timeB = b.start_time.split(':').map(Number);
                    return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
                  })
                  .map(classTime => (
                    <View key={classTime.id} style={styles.classItem}>
                      <Ionicons name="checkmark-circle" size={20} color={Theme.colors.success} />
                      <Text style={[styles.classText, { color: currentTheme.text }]}>
                        {formatTime(classTime.start_time)} - {classTime.name || 'Class'}
                      </Text>
                    </View>
                  ))}
              </View>
              <View style={styles.classNote}>
                <Ionicons name="information-circle-outline" size={16} color={Theme.colors.text.secondary} />
                <Text style={[styles.classNoteText, { color: Theme.colors.text.secondary }]}>
                  The report will include data for all classes at this club today
                </Text>
              </View>
            </Card>
          )}

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
        </>
      )}
    </ScrollView>
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
  dateCard: {
    marginBottom: Theme.spacing.md,
    backgroundColor: Theme.colors.primary + '10',
    borderColor: Theme.colors.primary,
    borderWidth: 1,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    marginLeft: Theme.spacing.sm,
  },
  selectionCard: {
    marginBottom: Theme.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  cardTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  selectedInfo: {
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border.light,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  infoText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  classesCard: {
    marginBottom: Theme.spacing.lg,
  },
  classesList: {
    marginTop: Theme.spacing.sm,
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  classText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    marginLeft: Theme.spacing.sm,
  },
  classNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border.light,
  },
  classNoteText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    marginLeft: Theme.spacing.xs,
    flex: 1,
  },
  footer: {
    paddingVertical: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xxl * 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.md,
  },
  loadingText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    marginLeft: Theme.spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  emptyText: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    marginTop: Theme.spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    marginTop: Theme.spacing.xs,
    textAlign: 'center',
  },
});