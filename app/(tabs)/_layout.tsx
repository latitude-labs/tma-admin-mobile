import { Logo } from '@/components/Logo';
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Theme } from '@/constants/Theme';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

// Tab Icon Component - separated to avoid hooks in render
function TabIcon({ route, isFocused, index, descriptors, navigation, animatedStyle, tabAnimation, unreadCount }: any) {
  const colorScheme = useColorScheme();
  const currentTheme = Colors[colorScheme ?? 'light'];

  const handleTabPress = () => {
    if (!isFocused) {
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Animate the tab
      tabAnimation.scale.value = withSpring(0.9, {
        damping: 15,
        stiffness: 200,
      }, () => {
        tabAnimation.scale.value = withSpring(1, {
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
    case 'reminders':
      iconName = isFocused ? 'alarm' : 'alarm-outline';
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
      onPress={handleTabPress}
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
}

// Custom Tab Bar Component with center highlight
function CustomTabBar({ state, descriptors, navigation }: any) {
  const colorScheme = useColorScheme();
  const currentTheme = Colors[colorScheme ?? 'light'];
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  // Create fixed number of animation values (max 5 tabs)
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const scale3 = useSharedValue(1);
  const scale4 = useSharedValue(1);
  const scale5 = useSharedValue(1);

  const rotation1 = useSharedValue(0);
  const rotation2 = useSharedValue(0);
  const rotation3 = useSharedValue(0);
  const rotation4 = useSharedValue(0);
  const rotation5 = useSharedValue(0);

  const tabAnimations = [
    { scale: scale1, rotation: rotation1 },
    { scale: scale2, rotation: rotation2 },
    { scale: scale3, rotation: rotation3 },
    { scale: scale4, rotation: rotation4 },
    { scale: scale5, rotation: rotation5 },
  ];

  // Create animated styles for all tabs upfront
  const animatedStyle1 = useAnimatedStyle(() => ({
    transform: [
      { scale: scale1.value },
      { rotate: `${rotation1.value}deg` },
    ],
  }));

  const animatedStyle2 = useAnimatedStyle(() => ({
    transform: [
      { scale: scale2.value },
      { rotate: `${rotation2.value}deg` },
    ],
  }));

  const animatedStyle3 = useAnimatedStyle(() => ({
    transform: [
      { scale: scale3.value },
      { rotate: `${rotation3.value}deg` },
    ],
  }));

  const animatedStyle4 = useAnimatedStyle(() => ({
    transform: [
      { scale: scale4.value },
      { rotate: `${rotation4.value}deg` },
    ],
  }));

  const animatedStyle5 = useAnimatedStyle(() => ({
    transform: [
      { scale: scale5.value },
      { rotate: `${rotation5.value}deg` },
    ],
  }));

  const animatedStyles = [
    animatedStyle1,
    animatedStyle2,
    animatedStyle3,
    animatedStyle4,
    animatedStyle5,
  ];


  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={95} tint={colorScheme ?? 'light'} style={styles.blurContainer}>
          <View style={styles.tabBar}>
            {state.routes.map((route: any, index: number) => (
              <TabIcon
                key={route.key}
                route={route}
                isFocused={state.index === index}
                index={index}
                descriptors={descriptors}
                navigation={navigation}
                animatedStyle={animatedStyles[index]}
                tabAnimation={tabAnimations[index]}
                unreadCount={unreadCount}
              />
            ))}
          </View>
        </BlurView>
      ) : (
        <View style={[styles.androidContainer, { backgroundColor: currentTheme.card }]}>
          <View style={styles.tabBar}>
            {state.routes.map((route: any, index: number) => (
              <TabIcon
                key={route.key}
                route={route}
                isFocused={state.index === index}
                index={index}
                descriptors={descriptors}
                navigation={navigation}
                animatedStyle={animatedStyles[index]}
                tabAnimation={tabAnimations[index]}
                unreadCount={unreadCount}
              />
            ))}
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
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const currentTheme = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

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
          marginBottom: Theme.spacing.xl,
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
        name="reminders"
        options={{
          title: 'Reminders',
          tabBarLabel: 'Reminders',
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