import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useCoachDashboard } from '@/hooks/useCoachDashboard';
import { CoachHeader } from './coach/CoachHeader';
import { CoachClassesList } from './coach/CoachClassesList';
import { DashboardLoading } from './coach/DashboardLoading';
import { RemindersSection } from '@/components/dashboard/RemindersSection';

export default function CoachDashboardScreen() {
  const colors = useThemeColors();
  const {
    user,
    loading,
    daysData,
    reminders,
    remindersLoading,
    isRefreshing,
    isOffline,
    lastSyncTime,
    isSyncing,
    handleRefresh,
    handleCompleteReminder,
    handleSnoozeReminder
  } = useCoachDashboard();

  const [showAllDays, setShowAllDays] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  if (loading) {
    return <DashboardLoading colors={colors} />;
  }

  const todayData = daysData[0];
  const classCount = todayData?.classes?.length || 0;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <CoachHeader 
          user={user}
          colors={colors}
          isOffline={isOffline}
          isSyncing={isSyncing}
          isRefreshing={isRefreshing}
          lastSyncTime={lastSyncTime}
          classCount={classCount}
          onRefresh={handleRefresh}
        />

        <RemindersSection
          reminders={reminders}
          loading={remindersLoading}
          onCompleteReminder={handleCompleteReminder}
          onSnoozeReminder={handleSnoozeReminder}
          onAddReminder={() => router.push('/reminders')}
          onViewAll={() => router.push('/reminders')}
        />

        <CoachClassesList 
          daysData={daysData}
          showAllDays={showAllDays}
          colors={colors}
          onToggleShowAllDays={setShowAllDays}
        />
        
        <View style={{ height: 150 }} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor is handled by children or theme, but safe to set if needed
  },
  scrollContainer: {
    flex: 1,
  },
});