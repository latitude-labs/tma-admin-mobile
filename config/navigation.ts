import { Ionicons } from '@expo/vector-icons';

export type NavigationItem = {
  name: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  requiresAdmin?: boolean;
  badge?: number;
};

export const navigationItems: NavigationItem[] = [
  {
    name: 'dashboard',
    title: 'Dashboard',
    icon: 'home',
    href: '/(drawer)/dashboard',
    requiresAdmin: true,
  },
  {
    name: 'coach-dashboard',
    title: 'Dashboard',
    icon: 'home',
    href: '/(drawer)/coach-dashboard',
    requiresAdmin: false,
  },
  {
    name: 'clubs',
    title: 'Clubs',
    icon: 'business',
    href: '/(drawer)/clubs',
  },
  {
    name: 'calendar',
    title: 'Calendar',
    icon: 'calendar',
    href: '/(drawer)/calendar',
  },
  {
    name: 'holiday-requests',
    title: 'Holiday Requests',
    icon: 'airplane',
    href: '/(drawer)/holiday-requests',
  },
  {
    name: 'trials',
    title: 'Trials',
    icon: 'person-add',
    href: '/(drawer)/trials',
  },
  {
    name: 'reminders',
    title: 'Reminders',
    icon: 'notifications',
    href: '/(drawer)/reminders',
  },
  {
    name: 'eod-reports',
    title: 'End of Day',
    icon: 'clipboard',
    href: '/(drawer)/eod-reports',
  },
  {
    name: 'facebook',
    title: 'Facebook Ads',
    icon: 'trending-up',
    href: '/(drawer)/facebook',
  },
  {
    name: 'reports',
    title: 'Reports',
    icon: 'document-text',
    href: '/(drawer)/reports',
    requiresAdmin: true,
  },
  {
    name: 'security-settings',
    title: 'Security',
    icon: 'shield-checkmark',
    href: '/(drawer)/security-settings',
  },
];

export const getNavigationItems = (isAdmin: boolean): NavigationItem[] => {
  return navigationItems.filter(item => {
    // Show admin dashboard only to admins
    if (item.name === 'dashboard' && !isAdmin) return false;
    // Show coach dashboard only to non-admins
    if (item.name === 'coach-dashboard' && isAdmin) return false;
    // Show other items based on requiresAdmin flag
    return !item.requiresAdmin || isAdmin;
  });
};