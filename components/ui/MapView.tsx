import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Platform } from 'react-native';
import Mapbox, { Camera, MapView as RNMapView, PointAnnotation, MarkerView } from '@rnmapbox/maps';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { Theme } from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring, withRepeat, withTiming } from 'react-native-reanimated';

// You'll need to set your Mapbox access token
// Add this to your .env file: EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

// Initialize Mapbox
if (MAPBOX_ACCESS_TOKEN) {
  Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
}

interface MapViewProps {
  latitude?: number | null;
  longitude?: number | null;
  markerTitle?: string;
  markerDescription?: string;
  zoomLevel?: number;
  height?: number;
  editable?: boolean;
  onLocationChange?: (latitude: number, longitude: number) => void;
  showUserLocation?: boolean;
  style?: any;
}

// Custom marker component
const CustomMarker = React.memo(({ title, palette }: { title: string; palette: ThemeColors }) => {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.3);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSpring(1.5, { damping: 2, stiffness: 80 }),
      -1,
      true
    );
    pulseOpacity.value = withRepeat(
      withTiming(0, { duration: 2000 }),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  return (
    <View style={styles.markerContainer}>
      <Animated.View
        style={[
          styles.markerPulse,
          { backgroundColor: palette.tint },
          pulseStyle,
        ]}
      />
      <View style={[styles.markerInner, { backgroundColor: palette.tint }]}>
        <Ionicons name="location" size={20} color={palette.textInverse} />
      </View>
      {title && (
        <View style={[styles.markerLabel, { backgroundColor: palette.background }]}>
          <Text style={[styles.markerLabelText, { color: palette.textPrimary }]}>
            {title}
          </Text>
        </View>
      )}
    </View>
  );
});

export const MapView = React.memo(({
  latitude,
  longitude,
  markerTitle,
  markerDescription,
  zoomLevel = 15,
  height = 250,
  editable = false,
  onLocationChange,
  showUserLocation = false,
  style,
}: MapViewProps) => {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const mapRef = useRef<RNMapView>(null);
  const [isMapReady, setIsMapReady] = React.useState(false);
  const [selectedLocation, setSelectedLocation] = React.useState(
    latitude && longitude ? { latitude, longitude } : null
  );

  useEffect(() => {
    if (latitude && longitude) {
      setSelectedLocation({ latitude, longitude });
    }
  }, [latitude, longitude]);

  // Fallback to Manchester city center if no location provided
  const centerCoordinate = useMemo(() => {
    if (selectedLocation) {
      return [selectedLocation.longitude, selectedLocation.latitude];
    }
    return [-2.2426, 53.4808]; // Manchester city center
  }, [selectedLocation]);

  const handleMapPress = (event: any) => {
    if (!editable) return;

    const { geometry } = event;
    const [lng, lat] = geometry.coordinates;

    setSelectedLocation({ latitude: lat, longitude: lng });
    onLocationChange?.(lat, lng);
  };

  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <View style={[styles.container, { height }, style]}>
        <View style={styles.errorContainer}>
          <Ionicons name="map-outline" size={48} color={palette.textTertiary} />
          <Text style={styles.errorText}>Map not configured</Text>
          <Text style={styles.errorSubtext}>Please set up Mapbox access token</Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={[styles.container, { height }, style]}
    >
      <RNMapView
        ref={mapRef}
        style={styles.map}
        styleURL={Mapbox.StyleURL.Street}
        onDidFinishLoadingStyle={() => setIsMapReady(true)}
        onPress={handleMapPress}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={true}
        compassPosition={{ top: 10, right: 10 }}
        scaleBarEnabled={false}
      >
        <Camera
          centerCoordinate={centerCoordinate}
          zoomLevel={zoomLevel}
          animationMode="flyTo"
          animationDuration={1000}
        />

        {selectedLocation && isMapReady && (
          Platform.OS === 'ios' ? (
            <MarkerView
              coordinate={[selectedLocation.longitude, selectedLocation.latitude]}
            >
              <CustomMarker title={markerTitle || ''} palette={palette} />
            </MarkerView>
          ) : (
            <PointAnnotation
              id="selected-location"
              coordinate={[selectedLocation.longitude, selectedLocation.latitude]}
            >
              <CustomMarker title={markerTitle || ''} palette={palette} />
            </PointAnnotation>
          )
        )}
      </RNMapView>

      {!isMapReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={palette.tint} />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}

      {editable && (
        <View style={styles.editHint}>
          <View style={styles.editHintPill}>
            <Ionicons name="hand-left" size={16} color={palette.tint} />
            <Text style={styles.editHintText}>
              Tap on the map to set location
            </Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  markerInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerLabel: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  markerLabelText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
  },
});

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: palette.backgroundSecondary,
  },
  map: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  errorText: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginTop: Theme.spacing.md,
  },
  errorSubtext: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    marginTop: Theme.spacing.xs,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.background + 'F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Theme.spacing.md,
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
  },
  editHint: {
    position: 'absolute',
    bottom: Theme.spacing.md,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  editHintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: palette.background,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    ...Theme.shadows.md,
  },
  editHintText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textPrimary,
  },
});

export default MapView;