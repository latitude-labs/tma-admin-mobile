import ColorPalette from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export const useThemeColors = () => {
  const colorScheme = useColorScheme();
  return ColorPalette[colorScheme ?? 'light'];
};

export type ThemeColors = ReturnType<typeof useThemeColors>;
