import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { EnrollerStep } from './steps/EnrollerStep';
import { StatusStep } from './steps/StatusStep';
import { LicenceDetailsStep } from './steps/LicenceDetailsStep';
import { KitPackageStep } from './steps/KitPackageStep';
import { useBookingStore } from '@/store/bookingStore';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { Booking, BookingStatus, LicenceDetails, PackageName } from '@/types/api';
import { Coach } from '@/types/coaches';
import kitOrdersService from '@/services/api/kitOrders.service';
import { Theme } from '@/constants/Theme';

// ── Constants ───────────────────────────────────────────────────────

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HALF_HEIGHT = SCREEN_HEIGHT * 0.45;
const FULL_HEIGHT = SCREEN_HEIGHT * 0.9;

type FlowStep = 'enroller' | 'status' | 'licence' | 'kit';

// ── Helpers ─────────────────────────────────────────────────────────

const getStatusLabel = (status: BookingStatus): string => {
  const labels: Record<BookingStatus, string> = {
    pending: 'Pending',
    fully_paid: 'Fully Paid',
    paid_dd: 'Fully Paid',
    paid_awaiting_dd: 'Paid (awaiting DD)',
    deposit_and_dd: 'Deposit and DD',
    deposit_only: 'Deposit only',
    unpaid_dd: 'Unpaid (DD Scheduled)',
    unpaid: 'Unpaid',
    unpaid_coach_call: 'Unpaid (Coach Call)',
    not_joining: 'Not Joining',
  };
  return labels[status] || status;
};

const isPaidStatus = (status: BookingStatus): boolean =>
  status === 'fully_paid' || status === 'paid_dd' || status === 'paid_awaiting_dd';

// ── Props ───────────────────────────────────────────────────────────

interface BookingFlowSheetProps {
  booking: Booking | null;
  visible: boolean;
  onClose: () => void;
  coaches: Coach[];
}

// ── Component ───────────────────────────────────────────────────────

export function BookingFlowSheet({
  booking,
  visible,
  onClose,
  coaches,
}: BookingFlowSheetProps) {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const updateBookingConversionStatus = useBookingStore(
    s => s.updateBookingConversionStatus,
  );

  // ── Internal state ──────────────────────────────────────────────

  const [step, setStep] = useState<FlowStep>('enroller');
  const [enrollerId, setEnrollerId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | null>(null);
  const [licenceDetails, setLicenceDetails] = useState<Partial<LicenceDetails>>({});

  // ── Animated height ─────────────────────────────────────────────

  const sheetHeight = useSharedValue(HALF_HEIGHT);

  const animatedSheetStyle = useAnimatedStyle(() => ({
    height: sheetHeight.value,
  }));

  // Update height when step changes
  useEffect(() => {
    const needsFullHeight = step === 'licence' || step === 'kit';
    sheetHeight.value = withSpring(needsFullHeight ? FULL_HEIGHT : HALF_HEIGHT, {
      damping: 20,
      stiffness: 150,
    });
  }, [step, sheetHeight]);

  // ── Reset on close / booking change ─────────────────────────────

  useEffect(() => {
    if (!visible) {
      setStep('enroller');
      setEnrollerId(null);
      setSelectedStatus(null);
      setLicenceDetails({});
    }
  }, [visible]);

  // ── Derived values ──────────────────────────────────────────────

  const bookingName = booking?.names || '';

  const bookingDetail = booking?.class_time
    ? `${booking.class_time.name || ''} · ${booking.class_time.day || ''}`
    : '';

  const enrollerName = useMemo(() => {
    if (!enrollerId) return '';
    const coach = coaches.find(c => c.id === enrollerId);
    return coach?.name || '';
  }, [enrollerId, coaches]);

  // ── Handlers ────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleEnrollerNext = useCallback(() => {
    setStep('status');
  }, []);

  const handleStatusSelect = useCallback(
    async (status: BookingStatus) => {
      if (!booking || enrollerId === null) return;

      setSelectedStatus(status);

      // "Not Joining" from a previously-paid status needs confirmation
      if (
        status === 'not_joining' &&
        booking.status &&
        isPaidStatus(booking.status)
      ) {
        Alert.alert(
          'Confirm Status Change',
          'This member was previously marked as paid. Changing to "Not Joining" will delete any existing kit orders. Continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue',
              style: 'destructive',
              onPress: async () => {
                try {
                  await kitOrdersService.deleteBookingKitOrders(booking.id);
                  await updateBookingConversionStatus(
                    booking.id,
                    status,
                    enrollerId,
                  );
                  handleClose();
                } catch {
                  Alert.alert('Error', 'Failed to update booking status.');
                }
              },
            },
          ],
        );
        return;
      }

      // Paid statuses continue to licence / kit flow
      if (isPaidStatus(status)) {
        setStep('licence');
        return;
      }

      // Non-paid, non-destructive: update directly and close
      try {
        await updateBookingConversionStatus(booking.id, status, enrollerId);
        handleClose();
      } catch {
        Alert.alert('Error', 'Failed to update booking status.');
      }
    },
    [booking, enrollerId, handleClose, updateBookingConversionStatus],
  );

  const handleLicenceNext = useCallback(() => {
    setStep('kit');
  }, []);

  const handleKitConfirm = useCallback(
    async (
      packageName: PackageName,
      kitItems: Array<{ type: string; size: string }>,
    ) => {
      if (!booking || !selectedStatus || enrollerId === null) return;

      try {
        await updateBookingConversionStatus(
          booking.id,
          selectedStatus,
          enrollerId,
          licenceDetails as LicenceDetails,
          packageName,
          kitItems,
        );
        handleClose();
      } catch {
        Alert.alert('Error', 'Failed to update booking status.');
      }
    },
    [booking, selectedStatus, enrollerId, licenceDetails, handleClose, updateBookingConversionStatus],
  );

  // ── Step rendering ──────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      case 'enroller':
        return (
          <EnrollerStep
            coaches={coaches}
            selectedCoachId={enrollerId}
            onSelect={setEnrollerId}
            onNext={handleEnrollerNext}
            bookingName={bookingName}
            bookingDetail={bookingDetail}
          />
        );
      case 'status':
        return (
          <StatusStep
            onSelect={handleStatusSelect}
            bookingName={bookingName}
            enrollerName={enrollerName}
          />
        );
      case 'licence':
        return (
          <LicenceDetailsStep
            initialName={bookingName}
            value={licenceDetails}
            onChange={setLicenceDetails}
            onNext={handleLicenceNext}
            bookingName={bookingName}
            statusLabel={selectedStatus ? getStatusLabel(selectedStatus) : ''}
          />
        );
      case 'kit':
        return (
          <KitPackageStep
            onConfirm={handleKitConfirm}
            bookingName={bookingName}
            statusLabel={selectedStatus ? getStatusLabel(selectedStatus) : ''}
          />
        );
      default:
        return null;
    }
  };

  if (!booking) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropPress} onPress={handleClose} />

        <Animated.View style={[styles.sheet, animatedSheetStyle]}>
          {/* Drag handle */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {renderStep()}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    backdropPress: {
      flex: 1,
    },
    sheet: {
      backgroundColor: palette.background,
      borderTopLeftRadius: Theme.borderRadius.xl,
      borderTopRightRadius: Theme.borderRadius.xl,
      overflow: 'hidden',
      ...palette.softShadow,
    },
    handleRow: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: palette.border,
    },
  });
