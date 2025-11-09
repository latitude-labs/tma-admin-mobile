import React, { useMemo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/hooks/useThemeColors';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...props
}) => {
  const palette = useThemeColors();

  const variantStyles: Record<ButtonVariant, ViewStyle> = useMemo(() => ({
    primary: {
      backgroundColor: palette.primary,
    },
    secondary: {
      backgroundColor: palette.backgroundSecondary,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: palette.primary,
    },
    text: {
      backgroundColor: 'transparent',
    },
  }), [palette]);

  const textVariantStyles: Record<ButtonVariant, TextStyle> = useMemo(() => ({
    primary: {
      color: palette.textInverse,
    },
    secondary: {
      color: palette.textPrimary,
    },
    outline: {
      color: palette.primary,
    },
    text: {
      color: palette.primary,
    },
  }), [palette]);

  const buttonStyles = [
    styles.base,
    variantStyles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.textBase,
    textVariantStyles[variant],
    styles[`${size}Text` as keyof typeof styles] as TextStyle,
  ];

  const getActivityIndicatorColor = () => {
    if (variant === 'primary') {
      return palette.textInverse;
    }
    return palette.primary;
  };

  const renderContent = () => {
    const childArray = React.Children.toArray(children);

    const rendered = childArray
      .map((child, index) => {
        if (typeof child === 'string') {
          const trimmed = child.trim();
          if (!trimmed) {
            return null;
          }

          return (
            <Text key={index} style={textStyles}>
              {trimmed}
            </Text>
          );
        }

        if (typeof child === 'number') {
          return (
            <Text key={index} style={textStyles}>
              {child}
            </Text>
          );
        }

        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            key: child.key ?? index,
          });
        }

        return null;
      })
      .filter(Boolean);

    if (rendered.length === 0) {
      return null;
    }

    return rendered.length === 1 ? rendered[0] : rendered;
  };

  return (
    <TouchableOpacity
      style={buttonStyles}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={getActivityIndicatorColor()}
          size={size === 'sm' ? 'small' : 'small'}
        />
      ) : (
        renderContent()
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Theme.borderRadius.md,
  },
  sm: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    minHeight: 32,
  },
  md: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    minHeight: 44,
  },
  lg: {
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.lg,
    minHeight: 56,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  textBase: {
    fontFamily: Theme.typography.fonts.semibold,
  },
  smText: {
    fontSize: Theme.typography.sizes.sm,
  },
  mdText: {
    fontSize: Theme.typography.sizes.md,
  },
  lgText: {
    fontSize: Theme.typography.sizes.lg,
  },
});
