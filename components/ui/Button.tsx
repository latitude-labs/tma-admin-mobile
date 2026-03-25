import React, { useMemo } from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Pressable,
  View,
  StyleProp,
  PressableProps,
  GestureResponderEvent,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/hooks/useThemeColors';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const LIP_HEIGHT = 2;
const SPRING_CONFIG = { damping: 15, stiffness: 180, mass: 0.5 };

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  fullWidth = false,
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  style,
  textStyle: customTextStyle,
  ...props
}) => {
  const palette = useThemeColors();
  const is3D = variant === 'primary' || variant === 'secondary';
  
  // Animation values
  const pressed = useSharedValue(0); // 0 to 1

  const handlePressIn = (e: GestureResponderEvent) => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pressed.value = withSpring(1, SPRING_CONFIG);
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (disabled || loading) return;
    pressed.value = withSpring(0, SPRING_CONFIG);
    onPressOut?.(e);
  };

  // Styles
  const animatedFaceStyle = useAnimatedStyle(() => {
    if (is3D) {
      return {
        transform: [{ translateY: pressed.value * LIP_HEIGHT }],
      };
    } else {
      return {
        transform: [{ scale: 1 - (pressed.value * 0.02) }], // Subtle scale for flat buttons
        opacity: 1 - (pressed.value * 0.2),
      };
    }
  });

  const getColors = () => {
    switch (variant) {
      case 'primary':
        return {
          face: 'rgba(255, 129, 51, 0.85)',
          lip: palette.primaryDark || '#CC6728', // Fallback if not in theme yet
          text: palette.textInverse,
        };
      case 'secondary':
        return {
          face: Platform.OS === 'ios'
            ? 'rgba(245, 245, 245, 0.7)'
            : palette.backgroundSecondary,
          lip: palette.secondaryDark || '#E0E0E0',
          text: palette.textPrimary,
        };
      case 'outline':
        return {
          face: 'transparent',
          lip: 'transparent',
          text: palette.primary,
          border: palette.primary,
        };
      case 'text':
        return {
          face: 'transparent',
          lip: 'transparent',
          text: palette.primary,
        };
      default:
        return {
          face: palette.primary,
          lip: palette.primaryDark,
          text: palette.textInverse,
        };
    }
  };

  const colors = getColors();

  const containerStyle = [
    styles.base,
    styles[size],
    fullWidth && styles.fullWidth,
    style,
  ];

  const faceStyle = [
    styles.face,
    styles[`${size}Face` as keyof typeof styles],
    {
      backgroundColor: colors.face,
      borderRadius: Theme.borderRadius.md, // Match outer radius
      borderColor: variant === 'outline' ? colors.border : undefined,
      borderWidth: variant === 'outline' ? 2 : 0, // Thicker border for outline
    },
    // For 3D buttons, the face sits "up" by the lip height initially (via margin in container)
    // But to make it easier, we'll just make the container have the lip color and paddingBottom
    // Actually, standard 3D button implementation:
    // Container (Lip Color)
    // Inner (Face) -> marginTop: 0, marginBottom: LIP_HEIGHT (to show lip)
    is3D && { marginBottom: LIP_HEIGHT },
    disabled && styles.disabled,
  ];

  const textStyles = [
    styles.textBase,
    { color: disabled ? palette.textTertiary : colors.text },
    styles[`${size}Text` as keyof typeof styles] as TextStyle,
    customTextStyle,
  ];

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator color={colors.text} size="small" />;
    }

    if (typeof children === 'string') {
      return <Text style={textStyles}>{children}</Text>;
    }

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {React.Children.map(children, (child) => {
           if (typeof child === 'string') return <Text style={textStyles}>{child}</Text>;
           return child;
        })}
      </View>
    );
  };

  if (is3D) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          containerStyle,
          {
            backgroundColor: disabled ? palette.backgroundSecondary : colors.lip,
            borderRadius: Theme.borderRadius.md,
          },
        ]}
        {...props}
      >
        <Animated.View style={[faceStyle, animatedFaceStyle, { width: '100%', alignItems: 'center', justifyContent: 'center' }] as any}>
          {renderContent()}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[containerStyle]}
      {...props}
    >
      <Animated.View style={[faceStyle, animatedFaceStyle, { width: '100%', alignItems: 'center', justifyContent: 'center' }] as any}>
        {renderContent()}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  face: {
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.7,
    backgroundColor: '#E0E0E0', // Generic disabled gray
  },
  // Sizes for Container (Outer)
  sm: { minHeight: 32 + LIP_HEIGHT },
  md: { minHeight: 48 + LIP_HEIGHT },
  lg: { minHeight: 56 + LIP_HEIGHT },
  
  // Sizes for Face (Inner)
  smFace: { height: 32, paddingHorizontal: Theme.spacing.md },
  mdFace: { height: 48, paddingHorizontal: Theme.spacing.lg },
  lgFace: { height: 56, paddingHorizontal: Theme.spacing.xl },

  textBase: {
    fontFamily: 'System',
    fontWeight: '700',
    textAlign: 'center',
  },
  smText: { fontSize: Theme.typography.sizes.sm },
  mdText: { fontSize: Theme.typography.sizes.md },
  lgText: { fontSize: Theme.typography.sizes.lg },
});

