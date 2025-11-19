import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Theme } from '@/constants/Theme';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
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

/**
 * Menu item component with animation
 * Extracted outside parent to follow hooks rules (CLAUDE.md:267-300)
 */
const MenuItemComponent = React.memo(({
  item,
  index,
  palette,
  styles,
}: {
  item: MenuItem;
  index: number;
  palette: ThemeColors;
  styles: any;
}) => {
  const router = useRouter();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.97, { damping: 20, stiffness: 300 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 250 });
    }, 100);

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
});

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
          title: 'Calendar',
          icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap,
          route: '/calendar',
        },
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
          route: '/club-health-overview',
        },
        {
          title: 'Reports',
          icon: 'stats-chart-outline' as keyof typeof Ionicons.glyphMap,
          route: '/reports',
        },
        {
          title: 'Coaches',
          icon: 'people-outline' as keyof typeof Ionicons.glyphMap,
          route: '/coaches',
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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          palette.backgroundSecondary,
          palette.background,
          palette.backgroundSecondary,
        ]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <ScrollView style={styles.scrollContainer}>
        <Card variant="filled" style={styles.profileCard}>
          <LinearGradient
            colors={[`${Theme.colors.primary}08`, `${Theme.colors.primary}03`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCardGradient}
          >
            <View style={styles.profileContent}>
              <View style={styles.avatarWrapper}>
                <View style={[styles.avatarGlow, { backgroundColor: Theme.colors.primary }]} />
                <Avatar
                  name={user?.name || 'User'}
                  size={'md'}
                  style={styles.avatar}
                />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {user?.name || ''}
                </Text>
                <Text style={styles.profileEmail}>
                  {user?.email || ''}
                </Text>
                {user?.is_admin ? (
                  <View style={styles.adminBadge}>
                    <Ionicons name="shield" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.adminBadgeText}>Admin</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </LinearGradient>
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
                  palette={palette}
                  styles={styles}
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
    </View>
  );
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollContainer: {
    flex: 1,
  },
  profileCard: {
    margin: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    padding: 0,
    overflow: 'hidden',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  profileCardGradient: {
    padding: Theme.spacing.xl,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: Theme.spacing.lg,
  },
  avatarGlow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: Theme.borderRadius.full,
    opacity: 0.2,
    top: -4,
    left: -4,
  },
  avatar: {
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
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
    marginBottom: Theme.spacing.sm,
  },
  adminBadge: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.full,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  adminBadgeText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.semibold,
  },
  section: {
    marginBottom: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  adminBadgeSmall: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
    marginLeft: Theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionCard: {
    paddingVertical: 4,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: palette.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItemText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textPrimary,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Theme.spacing['2xl'],
    paddingBottom: Theme.spacing['3xl'],
  },
  versionText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textTertiary,
  },
});