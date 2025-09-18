import React from 'react';
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

  const renderNavItem = (item: NavigationItem) => {
    const isActive = props.state.routeNames[props.state.index] === item.name;

    return (
      <Pressable
        key={item.name}
        onPress={() => handleNavigation(item.href)}
        style={({ pressed }) => [
          styles.navItem,
          isActive && styles.navItemActive,
          isActive && { backgroundColor: Theme.colors.primary + '10' },
          pressed && styles.navItemPressed,
        ]}
      >
        <View style={styles.navItemContent}>
          <Ionicons
            name={item.icon}
            size={22}
            color={isActive ? Theme.colors.primary : Theme.colors.text.secondary}
            style={styles.navItemIcon}
          />
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
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View style={styles.header}>
        <Logo width={100} height={90} variant={isDark ? 'dark' : 'light'} />
      </View>

      <View style={[styles.userSection, { borderBottomColor: Theme.colors.border.light }]}>
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
      </View>

      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.navSection}>
          {navigationItems.map(renderNavItem)}
        </View>
      </DrawerContentScrollView>

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
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.lg,
    borderBottomWidth: 1,
    marginBottom: Theme.spacing.sm,
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
  scrollContent: {
    paddingBottom: Theme.spacing.md,
  },
  navSection: {
    paddingHorizontal: Theme.spacing.md,
  },
  navItem: {
    marginBottom: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
  },
  navItemActive: {
    backgroundColor: Theme.colors.primary + '15',
  },
  navItemPressed: {
    opacity: 0.7,
    backgroundColor: Theme.colors.background.secondary,
  },
  navItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
  },
  navItemIcon: {
    width: 28,
  },
  navItemText: {
    flex: 1,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    marginLeft: Theme.spacing.md,
  },
  navItemTextActive: {
    fontFamily: Theme.typography.fonts.semibold,
  },
  badge: {
    backgroundColor: Theme.colors.status.error,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.full,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.semibold,
  },
  footer: {
    borderTopWidth: 1,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
  },
  footerItemText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    marginLeft: Theme.spacing.md,
  },
});