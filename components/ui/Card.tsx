import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { Theme } from '@/constants/Theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'filled' | 'outlined';
  padding?: keyof typeof Theme.spacing;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  padding = 'lg',
  style,
  ...props
}) => {
  return (
    <View
      style={[
        styles.base,
        styles[variant],
        { padding: Theme.spacing[padding] },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: Theme.colors.background.primary,
    borderRadius: Theme.borderRadius.lg,
  },
  elevated: {
    ...Theme.shadows.md,
  },
  filled: {
    backgroundColor: Theme.colors.background.secondary,
  },
  outlined: {
    borderWidth: 1,
    borderColor: Theme.colors.border.default,
  },
});