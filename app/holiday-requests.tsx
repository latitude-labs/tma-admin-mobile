import { Badge, Button, Card, Chip, ScreenHeader } from '@/components/ui';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { calendarService } from '@/services/api/calendar.service';
import { useAuthStore } from '@/store/authStore';
import { useCalendarStore } from '@/store/calendarStore';
import { HolidayRequest, HolidayStatus } from '@/types/calendar';
import { Ionicons } from '@expo/vector-icons';
import { differenceInDays, format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  Layout,
} from 'react-native-reanimated';

export default function HolidayRequestsScreen() {
  const palette = useThemeColors();
  const styles = createStyles(palette);
  const { user } = useAuthStore();
  const { holidayRequests, holidayRequestsLoading, setHolidayRequests } = useCalendarStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<HolidayStatus | 'all'>('all');
  const [selectedRequest, setSelectedRequest] = useState<HolidayRequest | null>(null);

  const isAdmin = user?.role === 'Admin';
  const isHeadCoach = user?.role === 'Head Coach';
  const canApprove = isAdmin || isHeadCoach;

  useEffect(() => {
    loadHolidayRequests();
  }, []);

  const loadHolidayRequests = useCallback(async () => {
    try {
      const params = selectedStatus === 'all' ? {} : { status: selectedStatus };
      const response = await calendarService.getHolidayRequests(params);
      setHolidayRequests(response.data);
    } catch (error) {
      console.error('Failed to load holiday requests:', error);
      Alert.alert('Error', 'Failed to load holiday requests');
    }
  }, [selectedStatus]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHolidayRequests();
    setRefreshing(false);
  }, [loadHolidayRequests]);

  const handleStatusFilter = useCallback((status: HolidayStatus | 'all') => {
    setSelectedStatus(status);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleApprove = useCallback(async (request: HolidayRequest) => {
    Alert.alert(
      'Approve Holiday',
      `Approve holiday request from ${request.user?.name} for ${format(new Date(request.start_date), 'MMM d')} - ${format(new Date(request.end_date), 'MMM d')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              await calendarService.updateHolidayRequest(request.id, {
                status: 'approved',
              });
              Alert.alert('Success', 'Holiday request approved');
              handleRefresh();
            } catch (error) {
              Alert.alert('Error', 'Failed to approve holiday request');
            }
          },
        },
      ]
    );
  }, [handleRefresh]);

  const handleReject = useCallback(async (request: HolidayRequest) => {
    Alert.prompt(
      'Reject Holiday',
      `Provide a reason for rejecting ${request.user?.name}'s holiday request:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            if (!reason) {
              Alert.alert('Error', 'Please provide a rejection reason');
              return;
            }
            try {
              await calendarService.updateHolidayRequest(request.id, {
                status: 'rejected',
                rejection_reason: reason,
              });
              Alert.alert('Success', 'Holiday request rejected');
              handleRefresh();
            } catch (error) {
              Alert.alert('Error', 'Failed to reject holiday request');
            }
          },
        },
      ],
      'plain-text'
    );
  }, [handleRefresh]);

  const handleCancel = useCallback(async (request: HolidayRequest) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this holiday request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await calendarService.cancelHolidayRequest(request.id);
              Alert.alert('Success', 'Holiday request cancelled');
              handleRefresh();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel holiday request');
            }
          },
        },
      ]
    );
  }, [handleRefresh]);

  const handleViewAffectedClasses = useCallback(async (request: HolidayRequest) => {
    try {
      const response = await calendarService.getAffectedClasses(request.id);
      const classes = response.data;

      const message = classes.map(c =>
        `• ${format(new Date(c.date), 'MMM d')}: ${c.class_time.name} at ${c.class_time.club?.name || 'Unknown'} ${
          c.coverage?.status === 'assigned'
            ? `\n  ✓ Covered by ${c.coverage.covering_user?.name}`
            : '\n  ⚠️ Needs coverage'
        }`
      ).join('\n\n');

      Alert.alert('Affected Classes', message || 'No classes affected');
    } catch (error) {
      Alert.alert('Error', 'Failed to load affected classes');
    }
  }, []);

  const filteredRequests = useMemo(() => {
    if (selectedStatus === 'all') return holidayRequests;
    return holidayRequests.filter(r => r.status === selectedStatus);
  }, [holidayRequests, selectedStatus]);

  const renderRequest = ({ item: request, index }: { item: HolidayRequest; index: number }) => {
    const dayCount = differenceInDays(
      new Date(request.end_date),
      new Date(request.start_date)
    ) + 1;

    const isOwnRequest = request.user_id === user?.id;

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 50).springify()}
        layout={Layout.springify()}
      >
        <Card variant="filled" style={styles.requestCard}>
          {/* Header */}
          <View style={styles.requestHeader}>
            <View style={styles.requestUser}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {request.user?.name?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.userName}>{request.user?.name}</Text>
                <Text style={styles.requestDate}>
                  Requested {format(new Date(request.created_at || Date.now()), 'MMM d, yyyy')}
                </Text>
              </View>
            </View>
            {request.status === 'pending' && (
              <Badge variant="warning">Pending</Badge>
            )}
            {request.status === 'approved' && (
              <Badge variant="success">Approved</Badge>
            )}
            {request.status === 'rejected' && (
              <Badge variant="error">Rejected</Badge>
            )}
            {request.status === 'cancelled' && (
              <Badge variant="secondary">Cancelled</Badge>
            )}
          </View>

          {/* Dates */}
          <View style={styles.dateSection}>
            <View style={styles.dateRange}>
              <Ionicons name="calendar-outline" size={20} color={palette.tint} />
              <Text style={styles.dateText}>
                {format(new Date(request.start_date), 'MMM d, yyyy')} - {' '}
                {format(new Date(request.end_date), 'MMM d, yyyy')}
              </Text>
            </View>
            <Badge variant="info" size="sm">
              {dayCount} {dayCount === 1 ? 'day' : 'days'}
            </Badge>
          </View>

          {/* Reason & Notes */}
          <View style={styles.reasonSection}>
            {request.notes && (
              <Text style={styles.notes}>{request.notes}</Text>
            )}
          </View>

          {/* Rejection reason */}
          {request.status === 'rejected' && request.rejection_reason && (
            <View style={styles.rejectionSection}>
              <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
              <Text style={styles.rejectionText}>{request.rejection_reason}</Text>
            </View>
          )}

          {/* Approval info */}
          {request.status === 'approved' && request.approvedBy && (
            <View style={styles.approvalSection}>
              <Text style={styles.approvalText}>
                Approved by {request.approvedBy.name} on{' '}
                {format(new Date(request.approved_at!), 'MMM d, yyyy')}
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              variant="text"
              size="sm"
              onPress={() => handleViewAffectedClasses(request)}
            >
              View Classes
            </Button>

            {request.status === 'pending' && canApprove && !isOwnRequest && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => handleApprove(request)}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => handleReject(request)}
                >
                  Reject
                </Button>
              </>
            )}

            {request.status === 'pending' && isOwnRequest && (
              <Button
                variant="outline"
                size="sm"
                onPress={() => handleCancel(request)}
              >
                Cancel Request
              </Button>
            )}
          </View>
        </Card>
      </Animated.View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ScreenHeader
          title="Holiday Requests"
          rightAction={
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleRefresh}
            >
              <Ionicons
                name="refresh"
                size={24}
                color={palette.textPrimary}
              />
            </TouchableOpacity>
          }
        />

      {/* Status Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <Chip
          label={`All (${holidayRequests.length})`}
          selected={selectedStatus === 'all'}
          onPress={() => handleStatusFilter('all')}
        />
        <Chip
          label={`Pending (${holidayRequests.filter(r => r.status === 'pending').length})`}
          selected={selectedStatus === 'pending'}
          onPress={() => handleStatusFilter('pending')}
        />
        <Chip
          label={`Approved (${holidayRequests.filter(r => r.status === 'approved').length})`}
          selected={selectedStatus === 'approved'}
          onPress={() => handleStatusFilter('approved')}
        />
        <Chip
          label={`Rejected (${holidayRequests.filter(r => r.status === 'rejected').length})`}
          selected={selectedStatus === 'rejected'}
          onPress={() => handleStatusFilter('rejected')}
        />
        <Chip
          label={`Cancelled (${holidayRequests.filter(r => r.status === 'cancelled').length})`}
          selected={selectedStatus === 'cancelled'}
          onPress={() => handleStatusFilter('cancelled')}
        />
      </ScrollView>

      {/* Requests List */}
      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRequest}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[palette.tint]}
            tintColor={palette.tint}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="calendar-outline"
              size={64}
              color={palette.textTertiary}
            />
            <Text style={styles.emptyText}>No holiday requests</Text>
          </View>
        }
      />
      </View>
    </>
  );
}

const createStyles = (palette: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.backgroundSecondary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Theme.spacing.lg,
      paddingTop: 60,
      paddingBottom: Theme.spacing.md,
      backgroundColor: palette.background,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderLight,
    },
    title: {
      fontSize: Theme.typography.sizes.xl,
      fontFamily: Theme.typography.fonts.bold,
      color: palette.textPrimary,
    },
    headerButton: {
      padding: Theme.spacing.sm,
    },
    filterContainer: {
      backgroundColor: palette.background,
      maxHeight: 60,
    },
    filterContent: {
      paddingHorizontal: Theme.spacing.lg,
      paddingVertical: Theme.spacing.md,
      gap: Theme.spacing.sm,
    },
    listContent: {
      padding: Theme.spacing.lg,
      paddingBottom: Theme.spacing.xl * 2,
    },
    requestCard: {
      marginBottom: Theme.spacing.md,
    },
    requestHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: Theme.spacing.md,
    },
    requestUser: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: palette.tint,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Theme.spacing.sm,
    },
    avatarText: {
      fontSize: Theme.typography.sizes.lg,
      fontFamily: Theme.typography.fonts.bold,
      color: palette.textInverse,
    },
    userName: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
    },
    requestDate: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
      marginTop: 2,
    },
    dateSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Theme.spacing.sm,
      marginBottom: Theme.spacing.sm,
    },
    dateRange: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.sm,
    },
    dateText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textPrimary,
    },
    reasonSection: {
      paddingVertical: Theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: palette.borderLight,
    },
    reasonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.sm,
      marginBottom: Theme.spacing.xs,
    },
    label: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textSecondary,
    },
    notes: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textPrimary,
      marginTop: Theme.spacing.xs,
    },
    rejectionSection: {
      padding: Theme.spacing.sm,
      backgroundColor: `${palette.statusError}10`,
      borderRadius: Theme.borderRadius.md,
      marginTop: Theme.spacing.sm,
    },
    rejectionLabel: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.statusError,
      marginBottom: Theme.spacing.xs,
    },
    rejectionText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textPrimary,
    },
    approvalSection: {
      padding: Theme.spacing.sm,
      backgroundColor: `${palette.statusSuccess}10`,
      borderRadius: Theme.borderRadius.md,
      marginTop: Theme.spacing.sm,
    },
    approvalText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.statusSuccess,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: Theme.spacing.sm,
      marginTop: Theme.spacing.md,
      paddingTop: Theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: palette.borderLight,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: Theme.spacing.xl * 3,
    },
    emptyText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textTertiary,
      marginTop: Theme.spacing.md,
    },
  });