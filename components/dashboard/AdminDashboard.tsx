import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useOffline } from '@/hooks/useOffline';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { DashboardHeader } from './admin/DashboardHeader';
import { StatsGrid } from './admin/StatsGrid';
import { DashboardLoading } from './admin/DashboardLoading';

export default function AdminDashboardScreen() {
  const { isOffline } = useOffline();
  const colors = useThemeColors();
  const { 
    isLoading, 
    isRefreshing, 
    stats, 
    trends, 
    handleRefresh, 
    user 
  } = useAdminDashboard();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLoading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading]);

  if (isLoading) {
    return <DashboardLoading colors={colors} />;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          colors.backgroundSecondary,
          colors.background,
          colors.backgroundSecondary,
        ]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <DashboardHeader 
            user={user}
            colors={colors}
            isOffline={isOffline}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
          />

          <StatsGrid 
            colors={colors}
            stats={stats}
            trends={trends}
            loading={isLoading}
          />
          
          <View style={{ height: 150 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
});
