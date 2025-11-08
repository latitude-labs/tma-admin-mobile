import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Coach } from '@/types/coaches';
import { Avatar } from '@/components/ui';
import { Theme } from '@/constants/Theme';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInRight,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface CoachCardProps {
  coach: Coach;
  onPress: () => void;
  index: number;
}

export const CoachCard: React.FC<CoachCardProps> = ({ coach, onPress, index }) => {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.97, { damping: 20, stiffness: 300 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 250 });
    }, 100);
    onPress();
  };

  return (
    <Animated.View
      style={animatedStyle}
      entering={FadeInRight.delay(index * 50).springify()}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.content}>
          <Avatar
            name={coach.name || ''}
            size="md"
            style={styles.avatar}
          />
          <View style={styles.info}>
            <Text style={styles.name}>{coach.name || ''}</Text>
            <View style={styles.emailRow}>
              <Ionicons
                name="mail-outline"
                size={14}
                color={palette.textSecondary}
                style={styles.icon}
              />
              <Text style={styles.email}>{coach.email || ''}</Text>
            </View>
            {coach.phone_number ? (
              <View style={styles.phoneRow}>
                <Ionicons
                  name="call-outline"
                  size={14}
                  color={palette.textSecondary}
                  style={styles.icon}
                />
                <Text style={styles.phone}>{coach.phone_number}</Text>
              </View>
            ) : null}
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={palette.textTertiary}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: palette.background,
      borderRadius: Theme.borderRadius.lg,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      marginRight: 12,
    },
    info: {
      flex: 1,
    },
    name: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
      marginBottom: 4,
    },
    emailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
    },
    phoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    icon: {
      marginRight: 6,
    },
    email: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
    },
    phone: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
    },
  });
