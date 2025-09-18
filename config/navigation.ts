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
    name: 'classes',
    title: 'Classes',
    icon: 'calendar',
    href: '/(drawer)/classes',
  },
  {
    name: 'trials',
    title: 'Trials',
    icon: 'person-add',
    href: '/(drawer)/trials',
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