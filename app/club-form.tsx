import React, { useEffect, useState, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useClubStore } from '@/store/clubStore';
import { MapView } from '@/components/ui/MapView';
import { Card } from '@/components/ui';
import { Theme } from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';

const AnimatedCard = Animated.createAnimatedComponent(Card);

interface FormData {
  name: string;
  address: string;
  postcode: string;
  directions: string;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string;
  acuity_calendar_id: string;
  sync_hours_to_google: boolean;
  class_prioritisation_enabled: boolean;
}

// Form input component
const FormInput = React.memo(({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  required,
  icon,
  palette,
  styles,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: any;
  required?: boolean;
  icon?: string;
  palette: ThemeColors;
  styles: any;
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.inputContainer}>
      <View style={styles.labelRow}>
        {icon && (
          <Ionicons
            name={icon as any}
            size={16}
            color={palette.textSecondary}
            style={styles.labelIcon}
          />
        )}
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      </View>
      <View style={[
        styles.inputWrapper,
        isFocused && styles.inputWrapperFocused,
        multiline && styles.textAreaWrapper
      ]}>
        <TextInput
          style={[styles.input, multiline && styles.textArea]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.textTertiary}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          keyboardType={keyboardType}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </View>
    </View>
  );
});

// Toggle switch component
const FormSwitch = React.memo(({
  label,
  value,
  onValueChange,
  description,
  icon,
  palette,
  styles,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  description?: string;
  icon?: string;
  palette: ThemeColors;
  styles: any;
}) => {
  return (
    <View style={styles.switchContainer}>
      <View style={styles.switchLeft}>
        {icon && (
          <View style={styles.switchIconContainer}>
            <Ionicons name={icon as any} size={18} color={palette.tint} />
          </View>
        )}
        <View style={styles.switchContent}>
          <Text style={styles.switchLabel}>{label}</Text>
          {description && (
            <Text style={styles.switchDescription}>{description}</Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: palette.borderDefault, true: palette.tint }}
        thumbColor={palette.background}
      />
    </View>
  );
});

export default function ClubFormScreen() {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const {
    selectedClub,
    isCreating,
    isUpdating,
    createClub,
    updateClub,
    fetchAdminClub,
  } = useClubStore();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    address: '',
    postcode: '',
    directions: '',
    latitude: null,
    longitude: null,
    google_place_id: '',
    acuity_calendar_id: '',
    sync_hours_to_google: false,
    class_prioritisation_enabled: false,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const saveButtonScale = useSharedValue(1);

  useEffect(() => {
    if (isEdit && id) {
      fetchAdminClub(parseInt(id));
    }
  }, [id]);

  useEffect(() => {
    if (isEdit && selectedClub) {
      setFormData({
        name: selectedClub.name || '',
        address: selectedClub.address || '',
        postcode: selectedClub.postcode || '',
        directions: selectedClub.directions || '',
        latitude: selectedClub.latitude || null,
        longitude: selectedClub.longitude || null,
        google_place_id: selectedClub.google_place_id || '',
        acuity_calendar_id: selectedClub.acuity_calendar_id || '',
        sync_hours_to_google: selectedClub.sync_hours_to_google || false,
        class_prioritisation_enabled: selectedClub.class_prioritisation_enabled || false,
      });
    }
  }, [selectedClub]);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveButtonScale.value }],
  }));

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Club name is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const dataToSave = {
        name: formData.name,
        address: formData.address,
        postcode: formData.postcode,
        directions: formData.directions,
        latitude: formData.latitude,
        longitude: formData.longitude,
        google_place_id: formData.google_place_id,
        acuity_calendar_id: formData.acuity_calendar_id,
        sync_hours_to_google: formData.sync_hours_to_google,
        class_prioritisation_enabled: formData.class_prioritisation_enabled,
      };

      if (isEdit && id) {
        await updateClub(parseInt(id), dataToSave);
      } else {
        const newClub = await createClub(dataToSave);
        if (newClub) {
          router.replace(`/club-detail?id=${newClub.id}`);
          return;
        }
      }

      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } catch (error) {
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert(
        'Error',
        isEdit ? 'Failed to update club' : 'Failed to create club'
      );
    }
  };

  const handleLocationChange = (latitude: number, longitude: number) => {
    setFormData(prev => ({ ...prev, latitude, longitude }));
  };

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: isEdit ? 'Edit Club' : 'Create Club',
          headerRight: () => (
            <Pressable
              onPress={handleSave}
              disabled={isCreating || isUpdating}
              style={styles.headerSaveButton}
            >
              {(isCreating || isUpdating) ? (
                <ActivityIndicator size="small" color={palette.tint} />
              ) : (
                <Text style={styles.headerSaveText}>Save</Text>
              )}
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basic Information */}
          <AnimatedCard
            variant="elevated"
            style={styles.card}
            entering={FadeInDown.duration(400).springify()}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="information-circle" size={20} color={palette.tint} />
              </View>
              <Text style={styles.cardTitle}>Basic Information</Text>
            </View>

            <FormInput
              label="Club Name"
              value={formData.name}
              onChangeText={(text) => updateField('name', text)}
              placeholder="Enter club name"
              required
              icon="business"
              palette={palette}
              styles={styles}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            <FormInput
              label="Address"
              value={formData.address}
              onChangeText={(text) => updateField('address', text)}
              placeholder="Enter full address"
              required
              icon="location"
              palette={palette}
              styles={styles}
            />
            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}

            <FormInput
              label="Postcode"
              value={formData.postcode}
              onChangeText={(text) => updateField('postcode', text)}
              placeholder="e.g., M1 1AA"
              icon="mail"
              palette={palette}
              styles={styles}
            />

            <FormInput
              label="Directions"
              value={formData.directions}
              onChangeText={(text) => updateField('directions', text)}
              placeholder="e.g., Near the central train station"
              multiline
              icon="navigate"
              palette={palette}
              styles={styles}
            />
          </AnimatedCard>

          {/* Location */}
          <AnimatedCard
            variant="elevated"
            style={styles.card}
            entering={FadeInDown.delay(100).duration(400).springify()}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="map" size={20} color={palette.tint} />
              </View>
              <Text style={styles.cardTitle}>Location</Text>
            </View>

            <Text style={styles.mapHelpText}>
              Tap on the map to set the club's location
            </Text>

            <MapView
              latitude={formData.latitude}
              longitude={formData.longitude}
              markerTitle={formData.name || 'Club Location'}
              height={250}
              editable
              onLocationChange={handleLocationChange}
              style={styles.map}
            />

            {formData.latitude && formData.longitude && (
              <View style={styles.coordinatesContainer}>
                <Text style={styles.coordinatesText}>
                  Coordinates: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                </Text>
              </View>
            )}
          </AnimatedCard>

          {/* Integration Settings */}
          <AnimatedCard
            variant="elevated"
            style={styles.card}
            entering={FadeInDown.delay(200).duration(400).springify()}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="settings" size={20} color={palette.tint} />
              </View>
              <Text style={styles.cardTitle}>Integration Settings</Text>
            </View>

            <FormInput
              label="Google Place ID"
              value={formData.google_place_id}
              onChangeText={(text) => updateField('google_place_id', text)}
              placeholder="e.g., ChIJ2dGMjxMe2EcRqVqkuXQkj7c"
              icon="logo-google"
              palette={palette}
              styles={styles}
            />

            <FormInput
              label="Acuity Calendar ID"
              value={formData.acuity_calendar_id}
              onChangeText={(text) => updateField('acuity_calendar_id', text)}
              placeholder="e.g., 12345"
              keyboardType="numeric"
              icon="calendar"
              palette={palette}
              styles={styles}
            />

            <FormSwitch
              label="Sync Hours to Google"
              value={formData.sync_hours_to_google}
              onValueChange={(value) => updateField('sync_hours_to_google', value)}
              description="Automatically sync opening hours with Google Business"
              icon="sync"
              palette={palette}
              styles={styles}
            />

            <FormSwitch
              label="Class Prioritisation"
              value={formData.class_prioritisation_enabled}
              onValueChange={(value) => updateField('class_prioritisation_enabled', value)}
              description="Enable automatic class prioritisation based on demand"
              icon="star"
              palette={palette}
              styles={styles}
            />
          </AnimatedCard>

          {/* Save Button */}
          <Animated.View style={[styles.saveButtonContainer, animatedButtonStyle]}>
            <Pressable
              style={styles.saveButton}
              onPress={handleSave}
              onPressIn={() => {
                saveButtonScale.value = withSpring(0.95);
              }}
              onPressOut={() => {
                saveButtonScale.value = withSpring(1);
              }}
              disabled={isCreating || isUpdating}
            >
              {(isCreating || isUpdating) ? (
                <ActivityIndicator size="small" color={palette.textInverse} />
              ) : (
                <>
                  <Ionicons
                    name={isEdit ? 'checkmark' : 'add'}
                    size={24}
                    color={palette.textInverse}
                  />
                  <Text style={styles.saveButtonText}>
                    {isEdit ? 'Update Club' : 'Create Club'}
                  </Text>
                </>
              )}
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Theme.spacing['3xl'],
  },
  headerSaveButton: {
    paddingHorizontal: Theme.spacing.md,
  },
  headerSaveText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.tint,
  },
  card: {
    margin: Theme.spacing.lg,
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  cardHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: `${palette.tint}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.sm,
  },
  cardTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
  },
  inputContainer: {
    marginBottom: Theme.spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  labelIcon: {
    marginRight: Theme.spacing.xs,
  },
  label: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
  },
  required: {
    color: palette.statusError,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: palette.borderDefault,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: palette.background,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
  },
  inputWrapperFocused: {
    borderColor: palette.tint,
    borderWidth: 2,
  },
  textAreaWrapper: {
    paddingVertical: Theme.spacing.md,
  },
  input: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textPrimary,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  errorText: {
    color: palette.statusError,
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    marginTop: -Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
    marginLeft: Theme.spacing.xs,
  },
  mapHelpText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  map: {
    marginHorizontal: -Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  coordinatesContainer: {
    backgroundColor: palette.backgroundSecondary,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
  },
  coordinatesText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.borderLight,
    marginTop: Theme.spacing.sm,
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  switchIconContainer: {
    width: 32,
    height: 32,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: palette.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  switchContent: {
    flex: 1,
  },
  switchLabel: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textPrimary,
  },
  switchDescription: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    marginTop: 2,
  },
  saveButtonContainer: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xl,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.tint,
    paddingVertical: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.xl,
    gap: Theme.spacing.sm,
    ...Theme.shadows.lg,
  },
  saveButtonText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
  },
});