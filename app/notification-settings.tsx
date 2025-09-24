import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Theme } from '@/constants/Theme';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { useNotificationStore } from '@/store/notificationStore';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

export default function NotificationSettingsScreen() {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const {
    hasPermission,
    pushToken,
    notifications,
    unreadCount,
    refreshPermissions,
    testLocalNotification,
    testBackendNotification,
    clearNotifications,
    markAllAsRead,
  } = useNotificationStore();

  const [notificationPreferences, setNotificationPreferences] = useState({
    newSignups: true,
    endOfDay: true,
    reminders: true,
    systemAlerts: true,
  });

  const handlePermissionRequest = async () => {
    await refreshPermissions();
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Please enable notifications in your device settings to receive push notifications.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
    }
  };

  const handleTestLocalNotification = () => {
    testLocalNotification();
    Alert.alert('Test Sent', 'A local test notification will appear in 2 seconds.');
  };

  const handleTestBackendNotification = async () => {
    try {
      await testBackendNotification();
      Alert.alert('Test Sent', 'A push notification has been sent from the server.');
    } catch (error: any) {
      Alert.alert('Test Failed', error.message || 'Failed to send test notification');
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: clearNotifications,
        },
      ]
    );
  };

  const togglePreference = (key: keyof typeof notificationPreferences) => {
    setNotificationPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    // TODO: Save preference to backend
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ScreenHeader title="Notification Settings" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Permission Status Card */}
        <Card variant="elevated" style={styles.card}>
          <View style={styles.statusContainer}>
            <Ionicons
              name={hasPermission ? 'checkmark-circle' : 'close-circle'}
              size={32}
              color={hasPermission ? Theme.colors.status.success : Theme.colors.status.error}
            />
            <View style={styles.statusText}>
              <Text style={styles.statusTitle}>
                Notifications {hasPermission ? 'Enabled' : 'Disabled'}
              </Text>
              <Text style={styles.statusDescription}>
                {hasPermission
                  ? 'You will receive push notifications'
                  : 'Enable notifications to stay updated'}
              </Text>
            </View>
          </View>

          {!hasPermission && (
            <Button
              onPress={handlePermissionRequest}
              style={styles.enableButton}
            >
              Enable Notifications
            </Button>
          )}
        </Card>

        {/* Notification Statistics */}
        <Card variant="filled" style={styles.card}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{notifications.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Theme.colors.primary }]}>
                {unreadCount}
              </Text>
              <Text style={styles.statLabel}>Unread</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {notifications.length - unreadCount}
              </Text>
              <Text style={styles.statLabel}>Read</Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <Button
              variant="outline"
              onPress={markAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark All Read
            </Button>
            <Button
              variant="text"
              onPress={handleClearAll}
              disabled={notifications.length === 0}
            >
              Clear All
            </Button>
          </View>
        </Card>

        {/* Debug Information */}
        {__DEV__ && (
          <Card variant="filled" style={[styles.card, styles.debugCard]}>
            <Text style={styles.sectionTitle}>Debug Info</Text>
            <Text style={styles.debugText}>
              Push Token: {pushToken ? `${pushToken.substring(0, 20)}...` : 'Not registered'}
            </Text>
            <Text style={styles.debugText}>
              Platform: {Platform.OS}
            </Text>

            <View style={styles.testButtons}>
              <Button
                onPress={handleTestLocalNotification}
                variant="secondary"
                style={styles.testButton}
              >
                Local Test
              </Button>
              <Button
                onPress={handleTestBackendNotification}
                variant="primary"
                style={styles.testButton}
              >
                Server Test
              </Button>
            </View>
          </Card>
        )}
      </ScrollView>
      </View>
    </>
  );
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.backgroundSecondary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    marginLeft: 12,
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontFamily: 'Manrope_600SemiBold',
    color: palette.textPrimary,
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    color: palette.textSecondary,
  },
  enableButton: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: palette.textPrimary,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Manrope_700Bold',
    color: palette.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    color: palette.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.borderLight,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  preferenceInfo: {
    flex: 1,
    marginRight: 12,
  },
  preferenceTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: palette.textPrimary,
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    color: palette.textSecondary,
  },
  debugCard: {
    backgroundColor: palette.backgroundTertiary,
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    color: palette.textSecondary,
    marginBottom: 8,
  },
  testButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    gap: 12,
  },
  testButton: {
    flex: 1,
  },
});