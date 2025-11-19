import { Theme } from '@/constants/Theme';
import { ThemeColors } from '@/hooks/useThemeColors';
import { useSyncStore } from '@/store/syncStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { User } from '@/types/auth';

interface DashboardHeaderProps {
  user: User | null;
  colors: ThemeColors;
  isOffline: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function DashboardHeader({ 
  user, 
  colors, 
  isOffline, 
  isRefreshing,
  onRefresh 
}: DashboardHeaderProps) {
  const {
    lastSyncTime,
    isSyncing,
  } = useSyncStore();
  
  const [currentTime, setCurrentTime] = useState(Date.now());
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Update current time every minute for sync time display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Rotation animation for sync icon
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

  const styles = StyleSheet.create({
    header: {
      marginBottom: Theme.spacing.lg,
      overflow: 'hidden',
    },
    headerGradient: {
      paddingHorizontal: Theme.spacing.lg,
      paddingTop: Theme.spacing.xl,
      paddingBottom: Theme.spacing.xl,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
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
      color: colors.textPrimary,
    },
    greetingSubtext: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: colors.textSecondary,
      marginTop: 2,
    },
    syncBadge: {
      backgroundColor: colors.tint + '15',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: colors.tint + '30',
      shadowColor: colors.tint,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
    },
    syncBadgeOffline: {
      backgroundColor: colors.statusError + '15',
      borderColor: colors.statusError + '30',
      shadowColor: colors.statusError,
    },
    syncBadgeContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    syncTimeText: {
      fontSize: 12,
      fontFamily: Theme.typography.fonts.medium,
      color: colors.tint,
    },
    syncTimeTextOffline: {
      color: colors.statusError,
    },
  });

  return (
    <View style={styles.header}>
      <LinearGradient
        colors={[colors.background, colors.background + 'F0']}
        style={styles.headerGradient}
      >
        <View style={styles.headerTop}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingEmoji}>
              {new Date().getHours() < 12 ? '☀️' : new Date().getHours() < 18 ? '🌤️' : '🌙'}
            </Text>
            <View>
              <Text style={styles.greeting}>
                Hi {user?.name?.split(' ')[0] || 'Admin'} 👋
              </Text>
              <Text style={styles.greetingSubtext}>
                Welcome back · {new Date().toLocaleDateString('en-GB', { weekday: 'long' })}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.syncBadge, isOffline && styles.syncBadgeOffline]}
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
              {lastSyncTime && !isSyncing && !isRefreshing && (
                <Text style={[styles.syncTimeText, isOffline && styles.syncTimeTextOffline]}>
                  {getLastSyncText()}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}
