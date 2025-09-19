import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Theme } from '@/constants/Theme';
import Colors from '@/constants/Colors';
import { useAuthStore } from '@/store/authStore';
import { getNavigationItems, NavigationItem } from '@/config/navigation';
import { Avatar } from '@/components/ui';
import { Logo } from '@/components/Logo';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export function CustomDrawer(props: DrawerContentComponentProps) {
  const colorScheme = useColorScheme();
  const { user, logout } = useAuthStore();
  const currentTheme = Colors[colorScheme ?? 'light'] || Colors.light;
  const isDark = colorScheme === 'dark';

  const navigationItems = getNavigationItems(user?.is_admin ?? false);

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      // For web, use window.confirm instead of Alert
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) {
        logout().then(() => {
          router.replace('/login');
        });
      }
    } else {
      // For mobile, use the native Alert
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
              await logout();
              router.replace('/login');
            },
          },
        ]
      );
    }
  };

  const handleNavigation = (href: string) => {
    router.push(href as any);
    props.navigation.closeDrawer();
  };

  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

  const renderNavItem = (item: NavigationItem, index: number) => {
    const isActive = props.state.routeNames[props.state.index] === item.name;
    const scale = useSharedValue(1);
    const translateX = useSharedValue(-20);
    const opacity = useSharedValue(0);

    useEffect(() => {
      translateX.value = withTiming(0, {
        duration: 300 + index * 50,
        easing: Easing.out(Easing.exp),
      });
      opacity.value = withTiming(1, {
        duration: 300 + index * 50,
      });
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    }));

    const handlePress = () => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      scale.value = withSpring(0.95, { damping: 20, stiffness: 400 }, () => {
        scale.value = withSpring(1, { damping: 20, stiffness: 400 });
      });
      handleNavigation(item.href);
    };

    return (
      <AnimatedPressable
        key={item.name}
        onPress={handlePress}
        style={[
          styles.navItem,
          animatedStyle,
          isActive && styles.navItemActive,
          isActive && { backgroundColor: Theme.colors.primary + '15' },
        ]}
      >
        <View style={styles.navItemContent}>
          <View style={[
            styles.iconContainer,
            isActive && styles.iconContainerActive,
          ]}>
            <Ionicons
              name={item.icon}
              size={22}
              color={isActive ? Theme.colors.primary : Theme.colors.text.secondary}
            />
          </View>
          <Text
            style={[
              styles.navItemText,
              isActive && styles.navItemTextActive,
              { color: isActive ? Theme.colors.primary : currentTheme.text },
            ]}
          >
            {item.title}
          </Text>
          {item.badge && item.badge > 0 && (
            <Animated.View
              style={[
                styles.badge,
                useAnimatedStyle(() => ({
                  transform: [{
                    scale: withSpring(1, { damping: 15, stiffness: 200 })
                  }]
                }))
              ]}
            >
              <Text style={styles.badgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
            </Animated.View>
          )}
        </View>
      </AnimatedPressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View style={styles.header}>
        <Logo width={80} height={72} variant={isDark ? 'dark' : 'light'} />
      </View>

      <Animated.View
        style={[
          styles.userSection,
          { borderBottomColor: Theme.colors.border.light },
          useAnimatedStyle(() => ({
            opacity: withTiming(1, { duration: 400 }),
            transform: [{
              translateY: withTiming(0, {
                duration: 400,
                easing: Easing.out(Easing.exp),
              })
            }]
          }))
        ]}
      >
        <Avatar name={user?.name || 'User'} size="md" />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: currentTheme.text }]} numberOfLines={1}>
            {user?.name || ''}
          </Text>
          <Text style={[styles.userEmail, { color: Theme.colors.text.secondary }]} numberOfLines={1}>
            {user?.email || ''}
          </Text>
          {user?.is_admin ? (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={12} color={Theme.colors.primary} />
              <Text style={styles.adminText}>Admin</Text>
            </View>
          ) : null}
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={styles.navSection}>
          {navigationItems.map((item, index) => renderNavItem(item, index))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: Theme.colors.border.light }]}>
        <Pressable
          onPress={() => router.push('/design-system' as any)}
          style={({ pressed }) => [
            styles.footerItem,
            pressed && styles.navItemPressed,
          ]}
        >
          <Ionicons
            name="color-palette-outline"
            size={22}
            color={Theme.colors.text.secondary}
            style={styles.navItemIcon}
          />
          <Text style={[styles.footerItemText, { color: Theme.colors.text.secondary }]}>
            Design System
          </Text>
        </Pressable>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.footerItem,
            pressed && styles.navItemPressed,
          ]}
        >
          <Ionicons
            name="log-out-outline"
            size={22}
            color={Theme.colors.status.error}
            style={styles.navItemIcon}
          />
          <Text style={[styles.footerItemText, { color: Theme.colors.status.error }]}>
            Sign Out
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xl,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    marginBottom: Theme.spacing.xs,
  },
  userInfo: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  userName: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.xs,
    gap: 4,
  },
  adminText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Theme.spacing.xs,
    paddingBottom: Theme.spacing.xs,
  },
  navSection: {
    paddingHorizontal: Theme.spacing.md,
  },
  navItem: {
    marginBottom: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  navItemActive: {
    backgroundColor: Theme.colors.primary + '10',
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.primary,
  },
  navItemPressed: {
    opacity: 0.9,
    backgroundColor: Theme.colors.background.secondary,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconContainerActive: {
    backgroundColor: Theme.colors.primary + '15',
  },
  navItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 10,
    minHeight: 48,
  },
  navItemText: {
    flex: 1,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    marginLeft: Theme.spacing.sm,
  },
  navItemTextActive: {
    fontFamily: Theme.typography.fonts.semibold,
  },
  badge: {
    backgroundColor: Theme.colors.status.error,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.full,
    minWidth: 26,
    minHeight: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.status.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.semibold,
  },
  footer: {
    borderTopWidth: 1,
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.md,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 10,
    borderRadius: Theme.borderRadius.lg,
    marginBottom: 4,
  },
  footerItemText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    marginLeft: Theme.spacing.md,
  },
});