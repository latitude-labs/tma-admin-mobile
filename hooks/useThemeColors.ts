import ColorPalette from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useMemo } from 'react';

export const useThemeColors = () => {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const palette = ColorPalette[scheme];

  return useMemo(() => ({
    ...palette,
    backgroundGradientStart: palette.backgroundGradientStart,
    backgroundGradientEnd: palette.backgroundGradientEnd,
    softShadow: scheme === 'dark'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.15,
          shadowRadius: 3,
          elevation: 1,
        }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 3,
          elevation: 1,
        },
  }), [palette, scheme]);
};

export type ThemeColors = ReturnType<typeof useThemeColors>;
