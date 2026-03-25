const tmaPrimary = '#FF8133';
const tmaPrimaryDark = '#CC6728'; // Darker shade for 3D button lip

export const Colors = {
  primary: tmaPrimary,
  primaryDark: tmaPrimaryDark,
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
    secondary: '#FAFAFA',
    tertiary: '#F0F0F0',
  },
  gradient: {
    start: '#FFFFFF',
    end: '#FFF8F2',
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
  primaryDark: tmaPrimaryDark,
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
    primary: '#141210',
    secondary: '#1E1C1A',
    tertiary: '#2A2826',
  },
  gradient: {
    start: '#141210',
    end: '#1A1510',
  },
  text: {
    primary: '#F5F5F5',
    secondary: '#A0A0A0',
    tertiary: '#707070',
    inverse: '#2C2C2C',
  },
  border: {
    default: 'rgba(255, 255, 255, 0.08)',
    light: 'rgba(255, 255, 255, 0.04)',
    dark: 'rgba(255, 255, 255, 0.12)',
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
    primaryDark: Colors.primaryDark,
    secondaryDark: '#E0E0E0', // For secondary button lip
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
    backgroundGradientStart: Colors.gradient.start,
    backgroundGradientEnd: Colors.gradient.end,
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
    primaryDark: DarkColors.primaryDark,
    secondaryDark: '#404040', // For secondary button lip
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
    backgroundGradientStart: DarkColors.gradient.start,
    backgroundGradientEnd: DarkColors.gradient.end,
    notificationUnread: DarkColors.notification.unread,
    isDark: true, // Theme mode indicator
  },
};
