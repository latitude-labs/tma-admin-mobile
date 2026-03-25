import ColorPalette from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export const useThemeColors = () => {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  return ColorPalette[scheme];
};

export type ThemeColors = ReturnType<typeof useThemeColors>;
