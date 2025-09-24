import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Theme } from '@/constants/Theme';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

type MenuSection = {
  title: string;
  items: MenuItem[];
};

type MenuItem = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  action?: () => void;
  badge?: number;
  color?: string;
  requiresAdmin?: boolean;
};

export default function MoreScreen() {
  const router = useRouter();
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const menuSections: MenuSection[] = [
    {
      title: 'Operations',
      items: [
        {
          title: 'Kit Orders',
          icon: 'shirt-outline' as keyof typeof Ionicons.glyphMap,
          route: '/kit-orders',
        },
        {
          title: 'End of Day',
          icon: 'clipboard-outline' as keyof typeof Ionicons.glyphMap,
          route: '/eod-reports',
        },
        {
          title: 'Reminders',
          icon: 'alarm-outline' as keyof typeof Ionicons.glyphMap,
          route: '/reminders',
        },
        {
          title: 'Holiday Requests',
          icon: 'airplane-outline' as keyof typeof Ionicons.glyphMap,
          route: '/holiday-requests',
        },
      ],
    },
    ...(user?.is_admin ? [{
      title: 'Admin',
      items: [
        {
          title: 'Club Health',
          icon: 'analytics-outline' as keyof typeof Ionicons.glyphMap,
          route: '/club-health',
        },
        {
          title: 'Reports',
          icon: 'stats-chart-outline' as keyof typeof Ionicons.glyphMap,
          route: '/reports',
        },
        {
          title: 'Facebook Ads',
          icon: 'trending-up-outline' as keyof typeof Ionicons.glyphMap,
          route: '/facebook',
        },
      ],
    }] : []),
    {
      title: 'Settings',
      items: [
        {
          title: 'Notifications',
          icon: 'notifications-outline' as keyof typeof Ionicons.glyphMap,
          route: '/notification-settings',
        },
        {
          title: 'Security',
          icon: 'shield-checkmark-outline' as keyof typeof Ionicons.glyphMap,
          route: '/security-settings',
        },
        {
          title: 'Logout',
          icon: 'log-out-outline' as keyof typeof Ionicons.glyphMap,
          action: handleLogout,
          color: Theme.colors.status.error,
        },
      ],
    },
  ];

  const MenuItemComponent = ({ item, index }: { item: MenuItem; index: number }) => {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      scale.value = withSpring(0.95, { damping: 15, stiffness: 400 }, () => {
        scale.value = withSpring(1, { damping: 10, stiffness: 200 });
      });

      if (item.action) {
        item.action();
      } else if (item.route) {
        router.push(item.route as any);
      }
    };

    return (
      <Animated.View
        style={animatedStyle}
        entering={FadeInRight.delay(index * 50).springify()}
      >
        <TouchableOpacity
          style={styles.menuItem}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: item.color
                    ? `${item.color}15`
                    : `${Theme.colors.primary}15`,
                },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={22}
                color={item.color || Theme.colors.primary}
              />
            </View>
            <Text
              style={[
                styles.menuItemText,
                {
                  color: item.color || palette.textPrimary,
                },
              ]}
            >
              {item.title}
            </Text>
          </View>
          {!item.action ? (
            <Ionicons
              name="chevron-forward"
              size={20}
              color={palette.textSecondary}
            />
          ) : null}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Card variant="filled" style={styles.profileCard}>
        <View style={styles.profileContent}>
          <Avatar
            name={user?.name || 'User'}
            size={'md'}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.name || ''}
            </Text>
            <Text style={styles.profileEmail}>
              {user?.email || ''}
            </Text>
            {user?.is_admin ? (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Card>

      {menuSections.map((section, sectionIndex) => (
        <View key={section.title} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {section.title}
            </Text>
            {section.title === 'Admin' ? (
              <View style={styles.adminBadgeSmall}>
                <Ionicons name="shield" size={12} color="#FFFFFF" />
              </View>
            ) : null}
          </View>
          <Card
            variant="outlined"
            style={[
              styles.sectionCard,
              section.title === 'Admin' && {
                borderColor: Theme.colors.primary,
                borderWidth: 1,
              }
            ]}
          >
            {section.items.map((item, index) => (
              <MenuItemComponent
                key={item.title}
                item={item}
                index={sectionIndex * 3 + index}
              />
            ))}
          </Card>
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.versionText}>
          TMA Admin v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  profileCard: {
    margin: 16,
    padding: 20,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    marginBottom: 8,
  },
  adminBadge: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  adminBadgeText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.medium,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
    textTransform: 'uppercase',
  },
  adminBadgeSmall: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.sm,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionCard: {
    paddingVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: palette.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textPrimary,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  versionText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textTertiary,
  },
});