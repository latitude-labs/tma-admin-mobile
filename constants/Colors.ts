const tmaPrimary = '#FF8133';

export const Colors = {
  primary: tmaPrimary,
  secondary: {
    dark: '#2C2C2C',
    light: '#F5F5F5',
  },
  status: {
    success: '#4CAF50',
    warning: '#FFC107',
    error: '#F44336',
    info: '#2196F3',
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5F5',
    tertiary: '#E8E8E8',
  },
  text: {
    primary: '#2C2C2C',
    secondary: '#666666',
    tertiary: '#999999',
    inverse: '#FFFFFF',
  },
  border: {
    default: '#E0E0E0',
    light: '#F0F0F0',
    dark: '#CCCCCC',
  },
  shadow: {
    default: 'rgba(0, 0, 0, 0.1)',
    light: 'rgba(0, 0, 0, 0.05)',
    dark: 'rgba(0, 0, 0, 0.2)',
  },
};

export const DarkColors = {
  primary: tmaPrimary,
  secondary: {
    dark: '#E0E0E0',
    light: '#2A2A2A',
  },
  status: {
    success: '#66BB6A',
    warning: '#FFCA28',
    error: '#EF5350',
    info: '#42A5F5',
  },
  background: {
    primary: '#1A1A1A',
    secondary: '#252525',
    tertiary: '#303030',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#B3B3B3',
    tertiary: '#808080',
    inverse: '#2C2C2C',
  },
  border: {
    default: '#404040',
    light: '#333333',
    dark: '#505050',
  },
  shadow: {
    default: 'rgba(0, 0, 0, 0.3)',
    light: 'rgba(0, 0, 0, 0.2)',
    dark: 'rgba(0, 0, 0, 0.5)',
  },
  overlay: 'rgba(0, 0, 0, 0.7)',
  notification: {
    unread: '#2A2317',
  },
};

export default {
  light: {
    text: Colors.text.primary,
    background: Colors.background.primary,
    backgroundSecondary: Colors.background.secondary,
    backgroundTertiary: Colors.background.tertiary,
    tint: tmaPrimary,
    primary: tmaPrimary, // Alias for brand color (CLAUDE.md compliance)
    tabIconDefault: '#999999',
    tabIconSelected: tmaPrimary,
    textPrimary: Colors.text.primary,
    textSecondary: Colors.text.secondary,
    textTertiary: Colors.text.tertiary,
    textInverse: Colors.text.inverse,
    border: Colors.border.default,
    borderDefault: Colors.border.default,
    borderLight: Colors.border.light,
    borderDark: Colors.border.dark,
    card: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',
    shadowDefault: Colors.shadow.default,
    shadowLight: Colors.shadow.light,
    shadowDark: Colors.shadow.dark,
    statusSuccess: Colors.status.success,
    statusWarning: Colors.status.warning,
    statusError: Colors.status.error,
    statusInfo: Colors.status.info,
    notificationUnread: '#FFF9F5',
    isDark: false, // Theme mode indicator
  },
  dark: {
    text: DarkColors.text.primary,
    background: DarkColors.background.primary,
    backgroundSecondary: DarkColors.background.secondary,
    backgroundTertiary: DarkColors.background.tertiary,
    tint: tmaPrimary,
    primary: tmaPrimary, // Alias for brand color (CLAUDE.md compliance)
    tabIconDefault: '#666666',
    tabIconSelected: tmaPrimary,
    textPrimary: DarkColors.text.primary,
    textSecondary: DarkColors.text.secondary,
    textTertiary: DarkColors.text.tertiary,
    textInverse: DarkColors.text.inverse,
    border: DarkColors.border.default,
    borderDefault: DarkColors.border.default,
    borderLight: DarkColors.border.light,
    borderDark: DarkColors.border.dark,
    card: DarkColors.background.secondary,
    overlay: DarkColors.overlay,
    shadowDefault: DarkColors.shadow.default,
    shadowLight: DarkColors.shadow.light,
    shadowDark: DarkColors.shadow.dark,
    statusSuccess: DarkColors.status.success,
    statusWarning: DarkColors.status.warning,
    statusError: DarkColors.status.error,
    statusInfo: DarkColors.status.info,
    notificationUnread: DarkColors.notification.unread,
    isDark: true, // Theme mode indicator
  },
};
