import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { useColorScheme } from './useColorScheme';

interface LogoProps {
  width?: number;
  height?: number;
  variant?: 'light' | 'dark' | 'auto';
}

export function Logo({ width = 120, height = 108, variant = 'auto' }: LogoProps) {
  const colorScheme = useColorScheme();
  const isDark = variant === 'dark' || (variant === 'auto' && colorScheme === 'dark');

  // Maintain aspect ratio from original SVG (1200x1085)
  const aspectRatio = 1200 / 1085;
  const calculatedHeight = width / aspectRatio;

  const backgroundColor = isDark ? '#202020' : '#F7F2F0';
  const foregroundColor = isDark ? '#F7F2F0' : '#202020';

  return (
    <Svg
      width={width}
      height={height || calculatedHeight}
      viewBox="0 0 1200 1085"
      fill="none"
    >
      <Path
        d="M1041.91 302.897L1031.27 807.287L201.442 828.115L158.905 785.627L178.939 271L995.097 256.115L1041.91 302.897Z"
        fill={backgroundColor}
      />
      <Path
        d="M241.833 441.227L244.227 379.498H446.661L444.746 441.227H241.833ZM305.956 699.646L316.009 441.227H377.738L366.728 699.646H305.956Z"
        fill={foregroundColor}
      />
      <Path
        d="M542.291 379.498L543.21 380.153L543.236 379.498H542.291Z"
        fill={foregroundColor}
      />
      <Path
        d="M707.385 379.498L695.896 699.646H633.688L642.179 462.719L589.167 495.788L540.426 457.251L531.747 699.646H470.017L481.028 379.498H542.291L543.21 380.153L592.065 415.376L645.177 379.498H707.385Z"
        fill={foregroundColor}
      />
      <Path
        d="M899.212 379.498H871.459H810.208H777.668H748L736.511 699.658H798.719L800.281 656.259L866.269 627.939L864.769 699.658H926.511L933.692 379.498H899.212ZM802.624 590.662L807.966 441.706H870.149L867.617 562.745L802.624 590.662Z"
        fill={foregroundColor}
      />
    </Svg>
  );
}