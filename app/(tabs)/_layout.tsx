import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import Colors from '@/constants/Colors';
import { Theme } from '@/constants/Theme';
import { Logo } from '@/components/Logo';
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { useNotificationStore } from '@/store/notificationStore';
import { BlurView } from 'expo-blur';

// Custom Tab Bar Component with center highlight
function CustomTabBar({ state, descriptors, navigation }: any) {
  const colorScheme = useColorScheme();
  const currentTheme = Colors[colorScheme ?? 'light'];
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  const tabAnimations = state.routes.map(() => ({
    scale: useSharedValue(1),
    rotation: useSharedValue(0),
  }));

  const handleTabPress = (route: any, isFocused: boolean, index: number) => {
    if (!isFocused) {
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Animate the tab
      tabAnimations[index].scale.value = withSpring(0.9, {
        damping: 15,
        stiffness: 200,
      }, () => {
        tabAnimations[index].scale.value = withSpring(1, {
          damping: 10,
          stiffness: 150,
        });
      });

      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    }
  };

  const renderTabIcon = (route: any, isFocused: boolean, index: number) => {
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { scale: tabAnimations[index].scale.value },
        { rotate: `${tabAnimations[index].rotation.value}deg` },
      ],
    }));

    let iconName: keyof typeof Ionicons.glyphMap;
    let showBadge = false;

    switch (route.name) {
      case 'clubs':
        iconName = isFocused ? 'business' : 'business-outline';
        break;
      case 'trials':
        iconName = isFocused ? 'person-add' : 'person-add-outline';
        break;
      case 'dashboard':
        iconName = isFocused ? 'home' : 'home-outline';
        break;
      case 'calendar':
        iconName = isFocused ? 'calendar' : 'calendar-outline';
        break;
      case 'more':
        iconName = isFocused ? 'grid' : 'grid-outline';
        showBadge = unreadCount > 0;
        break;
      default:
        iconName = 'help-outline';
    }

    const isCenter = route.name === 'dashboard';

    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
        testID={descriptors[route.key].options.tabBarTestID}
        onPress={() => handleTabPress(route, isFocused, index)}
        style={[
          styles.tabButton,
          isCenter && styles.centerTabButton,
          isCenter && {
            backgroundColor: isFocused ? Theme.colors.primary : currentTheme.card,
            shadowColor: Theme.colors.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isFocused ? 0.2 : 0.1,
            shadowRadius: 8,
            elevation: isFocused ? 8 : 4,
          },
        ]}
      >
        <View style={styles.iconWrapper}>
          <Animated.View style={animatedStyle}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={iconName}
                size={isCenter ? 28 : 24}
                color={
                  isCenter && isFocused
                    ? '#FFFFFF'
                    : isFocused
                    ? Theme.colors.primary
                    : currentTheme.tabIconDefault
                }
              />
              {showBadge && (
                <View style={styles.badgeContainer}>
                  <NotificationBadge count={unreadCount} size="small" />
                </View>
              )}
            </View>
          </Animated.View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={95} tint={colorScheme ?? 'light'} style={styles.blurContainer}>
          <View style={styles.tabBar}>
            {state.routes.map((route: any, index: number) =>
              renderTabIcon(route, state.index === index, index)
            )}
          </View>
        </BlurView>
      ) : (
        <View style={[styles.androidContainer, { backgroundColor: currentTheme.card }]}>
          <View style={styles.tabBar}>
            {state.routes.map((route: any, index: number) =>
              renderTabIcon(route, state.index === index, index)
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// Notification button component - moved outside to avoid hooks issues
function NotificationButton() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const currentTheme = Colors[colorScheme ?? 'light'];
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  return (
    <TouchableOpacity
      onPress={() => router.push('/notifications')}
      style={styles.headerButton}
    >
      <Ionicons
        name="notifications-outline"
        size={24}
        color={currentTheme.text}
      />
      <NotificationBadge count={unreadCount} size="small" />
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const currentTheme = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated]);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: currentTheme.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: currentTheme.border,
        },
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontFamily: Theme.typography.fonts.semibold,
          fontSize: Theme.typography.sizes.lg,
        },
        headerTitle: () => <Logo width={80} height={72} variant="auto" />,
        headerRight: () => <NotificationButton />,
      }}
    >
      <Tabs.Screen
        name="clubs"
        options={{
          title: 'Clubs',
          tabBarLabel: 'Clubs',
        }}
      />
      <Tabs.Screen
        name="trials"
        options={{
          title: 'Trials',
          tabBarLabel: 'Trials',
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarLabel: 'Calendar',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarLabel: 'More',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  blurContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  androidContainer: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabBar: {
    flexDirection: 'row',
    height: 56,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
  },
  centerTabButton: {
    marginHorizontal: 8,
    borderRadius: 16,
    paddingVertical: 8,
  },
  iconWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: -8,
    right: -12,
  },
  headerButton: {
    marginRight: 16,
    position: 'relative',
    padding: 8,
  },
});