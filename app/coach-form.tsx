import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Theme } from '@/constants/Theme';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { ScreenHeader, Input, Button } from '@/components/ui';
import { useForm, Controller } from 'react-hook-form';
import { CreateCoachData, UpdateCoachData } from '@/types/coaches';
import { coachesService } from '@/services/api/coaches.service';
import * as Haptics from 'expo-haptics';

interface CoachFormData {
  name: string;
  email: string;
  phone_number: string;
  password: string;
}

export default function CoachFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const coachId = params.coachId ? Number(params.coachId) : null;
  const isEditMode = params.mode === 'edit' && coachId !== null;

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCoach, setIsLoadingCoach] = useState(isEditMode);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CoachFormData>({
    defaultValues: {
      name: '',
      email: '',
      phone_number: '',
      password: '',
    },
  });

  // Load coach data if editing
  useEffect(() => {
    if (isEditMode && coachId) {
      loadCoachData();
    }
  }, [isEditMode, coachId]);

  const loadCoachData = async () => {
    try {
      setIsLoadingCoach(true);
      const coach = await coachesService.getCoachById(coachId!);
      setValue('name', coach.name || '');
      setValue('email', coach.email);
      setValue('phone_number', coach.phone_number || '');
    } catch (err) {
      console.error('Error loading coach:', err);
      Alert.alert('Error', 'Failed to load coach data. Please try again.');
      router.back();
    } finally {
      setIsLoadingCoach(false);
    }
  };

  const onSubmit = async (data: CoachFormData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setIsLoading(true);

      if (isEditMode && coachId) {
        // Update existing coach
        const updateData: UpdateCoachData = {
          name: data.name,
          email: data.email,
          phone_number: data.phone_number || undefined,
        };

        // Only include password if provided
        if (data.password) {
          updateData.password = data.password;
        }

        await coachesService.updateCoach(coachId, updateData);
        Alert.alert('Success', 'Coach updated successfully', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        // Create new coach
        if (!data.password) {
          Alert.alert('Error', 'Password is required for new coaches');
          setIsLoading(false);
          return;
        }

        const createData: CreateCoachData = {
          name: data.name,
          email: data.email,
          phone_number: data.phone_number || undefined,
          password: data.password,
        };

        await coachesService.createCoach(createData);
        Alert.alert('Success', 'Coach created successfully', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      }
    } catch (err: any) {
      console.error('Error saving coach:', err);
      Alert.alert('Error', err.message || 'Failed to save coach. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingCoach) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader
          title={isEditMode ? 'Edit Coach' : 'New Coach'}
          onBackPress={() => router.back()}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={isEditMode ? 'Edit Coach' : 'New Coach'}
        onBackPress={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Coach Information</Text>

          <Controller
            control={control}
            name="name"
            rules={{
              required: 'Name is required',
              minLength: {
                value: 2,
                message: 'Name must be at least 2 characters',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Full Name"
                placeholder="Enter coach's full name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
                autoCapitalize="words"
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            rules={{
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                placeholder="coach@tma.com"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}
          />

          <Controller
            control={control}
            name="phone_number"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Phone Number (Optional)"
                placeholder="07123456789"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.phone_number?.message}
                keyboardType="phone-pad"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            rules={
              isEditMode
                ? {}
                : {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters',
                    },
                  }
            }
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={isEditMode ? 'Password (Leave blank to keep current)' : 'Password'}
                placeholder="Enter password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                secureTextEntry
                autoCapitalize="none"
              />
            )}
          />
        </View>

        <View style={styles.actionsSection}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
          >
            {isEditMode ? 'Update Coach' : 'Create Coach'}
          </Button>

          <Button
            variant="outline"
            size="lg"
            fullWidth
            onPress={() => router.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.backgroundSecondary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    formSection: {
      backgroundColor: palette.background,
      borderRadius: Theme.borderRadius.lg,
      padding: 20,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: Theme.typography.sizes.lg,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
      marginBottom: 16,
    },
    actionsSection: {
      gap: 12,
    },
    bottomPadding: {
      height: 40,
    },
  });
