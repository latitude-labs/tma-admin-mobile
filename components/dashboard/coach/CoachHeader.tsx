import { Theme } from '@/constants/Theme';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { User } from '@/types/auth';

interface CoachHeaderProps {
  user: User | null;
  colors: ThemeColors;
  isOffline: boolean;
  isSyncing: boolean;
  isRefreshing: boolean;
  lastSyncTime: number | null;
  classCount: number;
  onRefresh: () => void;
}

export function CoachHeader({
  user,
  colors: _colors,
  isOffline,
  isSyncing,
  isRefreshing,
  lastSyncTime,
  classCount,
  onRefresh
}: CoachHeaderProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let animationLoop: Animated.CompositeAnimation | null = null;

    if (isSyncing || isRefreshing) {
      animationLoop = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      animationLoop.start();
    } else {
      rotateAnim.stopAnimation();
      rotateAnim.setValue(0);
    }

    return () => {
      if (animationLoop) {
        animationLoop.stop();
      }
      rotateAnim.stopAnimation();
    };
  }, [isSyncing, isRefreshing]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const getLastSyncText = () => {
    if (!lastSyncTime) return '';
    const diff = currentTime - lastSyncTime;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (diff < 60000) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };


  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingEmoji}>
            {new Date().getHours() < 12 ? '☀️' : new Date().getHours() < 18 ? '🌤️' : '🌙'}
          </Text>
          <View>
            <Text style={styles.greeting}>
              Hi {user?.name?.split(' ')[0] || 'Coach'} 👋
            </Text>
            <Text style={styles.greetingSubtext}>
              {classCount > 0 ? `${classCount} classes today!` : 'No classes today'} · {new Date().toLocaleDateString('en-GB', { weekday: 'long' })}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.syncBadge, isOffline ? styles.syncBadgeOffline : null]}
          onPress={onRefresh}
          disabled={isSyncing || isRefreshing}
        >
          <View style={styles.syncBadgeContent}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons
                name={isOffline ? 'cloud-offline' : (isSyncing || isRefreshing) ? 'sync' : 'checkmark-circle'}
                size={20}
                color={isOffline ? colors.statusError : colors.tint}
              />
            </Animated.View>
            {lastSyncTime && !isSyncing && !isRefreshing ? (
              <Text style={[styles.syncTimeText, isOffline ? styles.syncTimeTextOffline : null]}>
                {getLastSyncText()}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  header: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.lg,
    backgroundColor: colors.background,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: Theme.spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  greetingEmoji: {
    fontSize: 32,
  },
  greeting: {
    fontSize: 24,
    fontFamily: Theme.typography.fonts.bold,
    fontWeight: Theme.typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  greetingSubtext: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    fontWeight: Theme.typography.fontWeights.medium,
    color: colors.textSecondary,
    marginTop: 2,
  },
  syncBadge: {
    backgroundColor: colors.tint + '10',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.tint + '20',
  },
  syncBadgeOffline: {
    backgroundColor: colors.statusError + '10',
    borderColor: colors.statusError + '20',
  },
  syncBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncTimeText: {
    fontSize: 12,
    fontFamily: Theme.typography.fonts.medium,
    fontWeight: Theme.typography.fontWeights.medium,
    color: colors.tint,
  },
  syncTimeTextOffline: {
    color: colors.statusError,
  },
});
