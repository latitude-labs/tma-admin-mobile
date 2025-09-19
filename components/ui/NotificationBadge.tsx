import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';

interface NotificationBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
  animate?: boolean;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  size = 'medium',
  animate = true,
}) => {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (animate && count > 0) {
      scale.value = withSpring(1.2, { damping: 10, stiffness: 100 }, () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 150 });
      });
    }
  }, [count, animate]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (count === 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();

  const sizeStyles = {
    small: {
      minWidth: 18,
      height: 18,
      paddingHorizontal: 5,
      fontSize: 11,
    },
    medium: {
      minWidth: 22,
      height: 22,
      paddingHorizontal: 6,
      fontSize: 12,
    },
    large: {
      minWidth: 26,
      height: 26,
      paddingHorizontal: 8,
      fontSize: 14,
    },
  };

  return (
    <Animated.View style={[styles.container, sizeStyles[size], animatedStyle]}>
      <Text style={[styles.text, { fontSize: sizeStyles[size].fontSize }]}>
        {displayCount}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.status.error,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -8,
    right: -8,
  },
  text: {
    color: Colors.text.inverse,
    fontFamily: 'Manrope_700Bold',
    textAlign: 'center',
  },
});