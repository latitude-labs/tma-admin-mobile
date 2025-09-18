import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '@/constants/Theme';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  source?: { uri: string };
  name?: string;
  size?: AvatarSize;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name = '',
  size = 'md',
  style,
}) => {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeStyle = styles[size];

  return (
    <View style={[styles.base, sizeStyle, style]}>
      {source?.uri ? (
        <Image source={source} style={[styles.image, sizeStyle]} />
      ) : (
        <Text style={[styles.initials, styles[`${size}Text`]]}>
          {initials}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    color: Theme.colors.text.inverse,
    fontFamily: Theme.typography.fonts.semibold,
  },
  sm: {
    width: 32,
    height: 32,
  },
  md: {
    width: 48,
    height: 48,
  },
  lg: {
    width: 64,
    height: 64,
  },
  xl: {
    width: 96,
    height: 96,
  },
  smText: {
    fontSize: Theme.typography.sizes.xs,
  },
  mdText: {
    fontSize: Theme.typography.sizes.md,
  },
  lgText: {
    fontSize: Theme.typography.sizes.lg,
  },
  xlText: {
    fontSize: Theme.typography.sizes.xl,
  },
});