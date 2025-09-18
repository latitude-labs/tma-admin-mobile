import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from './useColorScheme';
import Colors from '../constants/Colors';
import { Theme } from '../constants/Theme';

interface TechnicalDifficultiesScreenProps {
  onRetry: () => void;
  retryTime: Date | null;
}

export const TechnicalDifficultiesScreen: React.FC<TechnicalDifficultiesScreenProps> = ({
  onRetry,
  retryTime,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    if (!retryTime) {
      setCanRetry(true);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const diff = retryTime.getTime() - now.getTime();

      if (diff <= 0) {
        setCanRetry(true);
        setTimeRemaining('');
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        setCanRetry(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [retryTime]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.error + '20' }]}>
          <Ionicons
            name="cloud-offline-outline"
            size={64}
            color={colors.error}
          />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          Technical Difficulties
        </Text>

        <Text style={[styles.message, { color: colors.text + 'CC' }]}>
          We're experiencing some technical issues with our servers.
          Please try again in a few moments.
        </Text>

        {timeRemaining && (
          <View style={[styles.timerContainer, { backgroundColor: colors.card }]}>
            <Ionicons
              name="timer-outline"
              size={20}
              color={colors.primary}
              style={styles.timerIcon}
            />
            <Text style={[styles.timerText, { color: colors.text }]}>
              Retry available in: {timeRemaining}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.retryButton,
            {
              backgroundColor: canRetry ? colors.primary : colors.border,
              opacity: canRetry ? 1 : 0.6,
            }
          ]}
          onPress={onRetry}
          disabled={!canRetry}
        >
          {canRetry ? (
            <>
              <Ionicons
                name="refresh"
                size={20}
                color="#FFFFFF"
                style={styles.buttonIcon}
              />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </>
          ) : (
            <ActivityIndicator color="#FFFFFF" size="small" />
          )}
        </TouchableOpacity>

        <View style={[styles.infoBox, { backgroundColor: colors.notification + '10' }]}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={colors.notification}
            style={styles.infoIcon}
          />
          <Text style={[styles.infoText, { color: colors.text + 'AA' }]}>
            Error code: 5XX - Server Error{'\n'}
            Your data is safe and will sync when the connection is restored.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Manrope_700Bold',
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
    lineHeight: 24,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.lg,
  },
  timerIcon: {
    marginRight: Theme.spacing.xs,
  },
  timerText: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xl,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.xl,
    minWidth: 150,
    height: 48,
  },
  buttonIcon: {
    marginRight: Theme.spacing.xs,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
  },
  infoBox: {
    flexDirection: 'row',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    marginTop: Theme.spacing.lg,
    maxWidth: '100%',
  },
  infoIcon: {
    marginRight: Theme.spacing.sm,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 18,
  },
});