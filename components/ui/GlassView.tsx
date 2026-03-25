/**
 * GlassView & GlassContainer
 *
 * Wrapper components over `expo-glass-effect` that provide a stable internal
 * API. Swap the underlying implementation here without touching call-sites.
 *
 * Platform behaviour:
 *  - iOS  : renders the native liquid-glass effect when available, falls back
 *           to a plain View when the API is not present (e.g. older iOS 26
 *           betas per expo-glass-effect#40911).
 *  - Other: renders a plain View (glass is iOS-only).
 */

import React, { useMemo } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import {
  default as ExpoGlassView,
  GlassContainer as ExpoGlassContainer,
  isGlassEffectAPIAvailable,
  type GlassStyle,
} from 'expo-glass-effect';

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

/** The three intensity levels exposed by this wrapper. */
export type GlassIntensity = 'light' | 'regular' | 'prominent';

export interface GlassViewProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  /** Visual weight of the glass effect. Defaults to 'regular'. */
  intensity?: GlassIntensity;
  /** Optional tint colour overlaid on the glass surface. */
  tintColor?: string;
}

export interface GlassContainerProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  /**
   * Whether to render hairline dividers between child items.
   * Defaults to true.
   */
  dividers?: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Maps wrapper intensity to the expo-glass-effect GlassStyle value. */
const INTENSITY_TO_GLASS_STYLE: Record<GlassIntensity, GlassStyle> = {
  light: 'clear',
  regular: 'regular',
  prominent: 'regular', // package only has clear/regular/none; use regular for prominent
};

/**
 * Returns true when the glass API can safely be used on the current device.
 * Always false on non-iOS platforms.
 */
function canUseGlass(): boolean {
  if (Platform.OS !== 'ios') {
    return false;
  }
  try {
    return isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// GlassView
// ---------------------------------------------------------------------------

/**
 * A surface that renders a native liquid-glass effect on supported iOS
 * devices and gracefully degrades to a plain `View` elsewhere.
 */
export function GlassView({
  children,
  style,
  intensity = 'regular',
  tintColor,
}: GlassViewProps): React.JSX.Element {
  const glassStyle = INTENSITY_TO_GLASS_STYLE[intensity];

  if (!canUseGlass()) {
    return <View style={style}>{children}</View>;
  }

  return (
    <ExpoGlassView
      glassEffectStyle={glassStyle}
      tintColor={tintColor}
      style={style}
    >
      {children}
    </ExpoGlassView>
  );
}

// ---------------------------------------------------------------------------
// GlassContainer
// ---------------------------------------------------------------------------

const DIVIDER_STYLE = {
  height: StyleSheet.hairlineWidth,
  backgroundColor: 'rgba(0,0,0,0.1)',
} as const;

/**
 * A grouped container that wraps children in a glass surface and optionally
 * renders hairline dividers between them (similar to iOS Settings sections).
 */
export function GlassContainer({
  children,
  style,
  dividers = true,
}: GlassContainerProps): React.JSX.Element {
  const childArray = React.Children.toArray(children);

  const content = useMemo(
    () =>
      childArray.map((child, index) => (
        <React.Fragment key={index}>
          {child}
          {dividers && index < childArray.length - 1 ? (
            <View style={DIVIDER_STYLE} />
          ) : null}
        </React.Fragment>
      )),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [children, dividers],
  );

  if (!canUseGlass()) {
    return <View style={style}>{content}</View>;
  }

  return (
    <ExpoGlassContainer style={style}>
      {content}
    </ExpoGlassContainer>
  );
}
