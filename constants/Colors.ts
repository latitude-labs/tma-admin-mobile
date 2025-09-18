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

export default {
  light: {
    text: Colors.text.primary,
    background: Colors.background.primary,
    tint: tmaPrimary,
    tabIconDefault: '#999999',
    tabIconSelected: tmaPrimary,
  },
  dark: {
    text: '#FFFFFF',
    background: '#1A1A1A',
    tint: tmaPrimary,
    tabIconDefault: '#666666',
    tabIconSelected: tmaPrimary,
  },
};
