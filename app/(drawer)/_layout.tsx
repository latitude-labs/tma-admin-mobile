import { Logo } from '@/components/Logo';
import { CustomDrawer } from '@/components/navigation/CustomDrawer';
import { useColorScheme } from '@/components/useColorScheme';
import { getNavigationItems } from '@/config/navigation';
import Colors from '@/constants/Colors';
import { Theme } from '@/constants/Theme';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { Redirect } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

export default function DrawerLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, user } = useAuthStore();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const currentTheme = Colors[colorScheme ?? 'light'] || Colors.light;
  const router = useRouter();

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const navigationItems = getNavigationItems(user?.is_admin ?? false);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Drawer
          drawerContent={CustomDrawer}
          screenOptions={{
          drawerType: 'slide',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          drawerStyle: {
            width: 300,
            backgroundColor: currentTheme.background,
            borderTopRightRadius: 24,
            borderBottomRightRadius: 24,
            shadowColor: '#000',
            shadowOffset: { width: 4, height: 0 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5,
          },
          swipeEdgeWidth: 100,
          swipeMinDistance: 50,
          headerStyle: {
            backgroundColor: currentTheme.background,
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            borderBottomWidth: 0,
          },
          headerTintColor: currentTheme.text,
          headerTitleStyle: {
            fontFamily: Theme.typography.fonts.semibold,
            fontSize: Theme.typography.sizes.lg,
          },
          headerTitleAlign: 'center',
          headerTitle: () => (
            <Logo width={80} height={72} variant="auto" />
          ),
          headerLeft: () => (
            <DrawerToggleButton tintColor={currentTheme.text} />
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/notifications')}
              style={styles.notificationButton}
              activeOpacity={0.7}
            >
              <Animated.View style={useAnimatedStyle(() => ({
                transform: [{ scale: withSpring(1, { damping: 20, stiffness: 300 }) }]
              }))}>
                <Ionicons
                  name="notifications-outline"
                  size={24}
                  color={currentTheme.text}
                />
                <NotificationBadge count={unreadCount} size="small" />
              </Animated.View>
            </TouchableOpacity>
          ),
          drawerActiveTintColor: Theme.colors.primary,
          drawerInactiveTintColor: Theme.colors.text.secondary,
        }}
      >
        <Drawer.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            drawerLabel: 'Dashboard',
            drawerItemStyle: user?.is_admin === false ? { display: 'none' } : {},
          }}
        />
        <Drawer.Screen
          name="coach-dashboard"
          options={{
            title: 'Dashboard',
            drawerLabel: 'Dashboard',
            drawerItemStyle: user?.is_admin ? { display: 'none' } : {},
          }}
        />
        <Drawer.Screen
          name="clubs"
          options={{
            title: 'Clubs',
            drawerLabel: 'Clubs',
          }}
        />
        <Drawer.Screen
          name="classes"
          options={{
            title: 'Classes',
            drawerLabel: 'Classes',
          }}
        />
        <Drawer.Screen
          name="trials"
          options={{
            title: 'Trials',
            drawerLabel: 'Trials',
          }}
        />
        <Drawer.Screen
          name="notifications"
          options={{
            title: 'Notifications',
            drawerLabel: 'Notifications',
          }}
        />
        <Drawer.Screen
          name="eod-reports"
          options={{
            title: 'End of Day',
            drawerLabel: 'End of Day',
          }}
        />
        <Drawer.Screen
          name="facebook"
          options={{
            title: 'Facebook Ads',
            drawerLabel: 'Facebook Ads',
          }}
        />
        {user?.is_admin && (
          <>
            <Drawer.Screen
              name="reports"
              options={{
                title: 'Reports',
                drawerLabel: 'Reports',
              }}
            />
          </>
        )}
        </Drawer>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  notificationButton: {
    marginRight: 16,
    position: 'relative',
    padding: 8,
    borderRadius: Theme.borderRadius.md,
  },
});