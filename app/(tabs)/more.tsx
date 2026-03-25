import { Avatar } from '@/components/ui/Avatar';
import { GlassView } from '@/components/ui/GlassView';
import { IconBox } from '@/components/ui/IconBox';
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
  FadeIn,
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
 * Single menu row component — extracted to respect hooks rules (CLAUDE.md:267-300).
 * Uses press scale animation via shared values.
 */
const MenuRowComponent = React.memo(({
  item,
  isLast,
  palette,
  styles,
}: {
  item: MenuItem;
  isLast: boolean;
  palette: ThemeColors;
  styles: ReturnType<typeof createStyles>;
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
    <React.Fragment>
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          <View style={styles.menuRowLeft}>
            <IconBox
              icon={item.icon}
              size="sm"
              variant="filled"
              color={item.color || Theme.colors.primary}
              style={{ marginRight: Theme.spacing.md }}
            />
            <Text
              style={[
                styles.menuLabel,
                { color: item.color || palette.textPrimary },
              ]}
            >
              {item.title}
            </Text>
          </View>
          {!item.action ? (
            <Ionicons
              name="chevron-forward"
              size={16}
              color={palette.textTertiary}
            />
          ) : null}
        </TouchableOpacity>
      </Animated.View>
      {!isLast ? <View style={styles.divider} /> : null}
    </React.Fragment>
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
    <LinearGradient
      colors={[palette.backgroundGradientStart, palette.backgroundGradientEnd]}
      style={styles.container}
    >
      <ScrollView style={styles.scrollContainer}>
        {/* Profile card as a glass panel */}
        <Animated.View entering={FadeIn.duration(300)}>
          <GlassView style={styles.profilePanel} intensity="prominent">
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
          </GlassView>
        </Animated.View>

        {/* Menu sections as grouped glass panels */}
        {menuSections.map((section, sectionIndex) => (
          <Animated.View
            key={section.title}
            entering={FadeIn.delay(sectionIndex * 60).duration(300)}
            style={styles.section}
          >
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

            <GlassView
              style={section.title === 'Admin'
                ? { ...styles.sectionPanel, ...styles.adminSectionPanel }
                : styles.sectionPanel
              }
              intensity="regular"
            >
              {section.items.map((item, index) => (
                <MenuRowComponent
                  key={item.title}
                  item={item}
                  isLast={index === section.items.length - 1}
                  palette={palette}
                  styles={styles}
                />
              ))}
            </GlassView>
          </Animated.View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.versionText}>
            TMA Admin v1.0.0
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  // Profile panel
  profilePanel: {
    margin: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    borderRadius: 20,
    padding: Theme.spacing.xl,
    overflow: 'hidden',
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
    fontFamily: 'System',
    fontWeight: '600',
    color: palette.textPrimary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: 'System',
    fontWeight: '400',
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
    fontFamily: 'System',
    fontWeight: '600',
  },
  // Sections
  section: {
    marginBottom: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: 'System',
    fontWeight: '600',
    color: palette.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
  sectionPanel: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  adminSectionPanel: {
    borderWidth: 1,
    borderColor: Theme.colors.primary,
  },
  // Menu rows
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: Theme.spacing.md,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuLabel: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: 'System',
    fontWeight: '500',
    color: palette.textPrimary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.borderLight,
    marginLeft: Theme.spacing.md + 32 + Theme.spacing.md, // align with text after icon
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: Theme.spacing['2xl'],
    paddingBottom: Theme.spacing['3xl'],
  },
  versionText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: 'System',
    fontWeight: '400',
    color: palette.textTertiary,
  },
});
