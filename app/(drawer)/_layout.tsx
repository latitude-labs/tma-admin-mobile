import React from 'react';
import { View } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Redirect } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Theme } from '@/constants/Theme';
import Colors from '@/constants/Colors';
import { useAuthStore } from '@/store/authStore';
import { CustomDrawer } from '@/components/navigation/CustomDrawer';
import { getNavigationItems } from '@/config/navigation';
import { Logo } from '@/components/Logo';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { NetworkStatusBanner } from '@/components/NetworkStatusBanner';

export default function DrawerLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, user } = useAuthStore();
  const currentTheme = Colors[colorScheme ?? 'light'] || Colors.light;

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const navigationItems = getNavigationItems(user?.is_admin ?? false);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <NetworkStatusBanner />
        <Drawer
          drawerContent={CustomDrawer}
          screenOptions={{
          drawerType: 'slide',
          overlayColor: 'rgba(0, 0, 0, 0.4)',
          drawerStyle: {
            width: 280,
            backgroundColor: currentTheme.background,
          },
          headerStyle: {
            backgroundColor: currentTheme.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: Theme.colors.border.light,
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
          sceneContainerStyle: {
            backgroundColor: currentTheme.background,
          },
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