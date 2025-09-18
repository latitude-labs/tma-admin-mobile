import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { Card, Button, Badge, Chip } from '@/components/ui';
import { Theme } from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import { useBookingStore } from '@/store/bookingStore';
import { useClubStore } from '@/store/clubStore';

export default function TrialsScreen() {
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const {
    bookings,
    isLoading,
    error,
    isOffline,
    lastSync,
    pagination,
    fetchBookings,
    fetchBookingsPage,
    refreshBookings,
    setFilters,
    getFilteredBookings,
    updateBookingStatus,
    setSearchQuery: updateSearchQuery,
  } = useBookingStore();
  const { clubs } = useClubStore();

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    setFilters({ status: filterStatus as any, searchQuery });
    updateSearchQuery(searchQuery);
  }, [filterStatus, searchQuery]);

  const statusColors: Record<string, string> = {
    scheduled: Theme.colors.status.info,
    completed: Theme.colors.status.success,
    'no-show': Theme.colors.status.error,
    cancelled: Theme.colors.status.error,
  };

  const sortedBookings = getFilteredBookings();

  const getBookingStatus = (booking: any) => {
    if (booking.cancelled_at) return 'cancelled';
    if (booking.no_show) return 'no-show';
    if (new Date(booking.start_time) < new Date()) return 'completed';
    return 'scheduled';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading && bookings.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  if (error && bookings.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle" size={48} color={Theme.colors.status.error} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refreshBookings}
          colors={[Theme.colors.primary]}
        />
      }>
      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Trial Bookings ({pagination.totalItems})</Text>
            {isOffline && (
              <View style={styles.offlineBadge}>
                <Ionicons name="cloud-offline" size={14} color="#FFF" />
                <Text style={styles.offlineText}>Offline</Text>
              </View>
            )}
          </View>
          <Button variant="primary" size="sm">
            Add Trial
          </Button>
        </View>
        {lastSync && (
          <Text style={styles.syncText}>
            Last synced: {new Date(lastSync).toLocaleString('en-GB', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        )}

        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={Theme.colors.text.secondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or phone..."
            placeholderTextColor={Theme.colors.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color={Theme.colors.text.secondary} />
            </Button>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          <Chip
            label="All"
            selected={!filterStatus}
            onPress={() => setFilterStatus(null)}
          />
          <Chip
            label="Scheduled"
            selected={filterStatus === 'scheduled'}
            onPress={() => setFilterStatus(filterStatus === 'scheduled' ? null : 'scheduled')}
          />
          <Chip
            label="Completed"
            selected={filterStatus === 'completed'}
            onPress={() => setFilterStatus(filterStatus === 'completed' ? null : 'completed')}
          />
          <Chip
            label="Cancelled"
            selected={filterStatus === 'cancelled'}
            onPress={() => setFilterStatus(filterStatus === 'cancelled' ? null : 'cancelled')}
          />
          <Chip
            label="No Show"
            selected={filterStatus === 'no-show'}
            onPress={() => setFilterStatus(filterStatus === 'no-show' ? null : 'no-show')}
          />
        </ScrollView>

        {sortedBookings.length > 0 ? (
          <>
            {sortedBookings.map((booking) => {
              const status = getBookingStatus(booking);

              return (
                <Card key={booking.id} variant="elevated" style={styles.trialCard}>
                  <View style={styles.trialHeader}>
                    <View style={styles.trialHeaderLeft}>
                      <Text style={styles.trialName}>
                        {booking.names}
                      </Text>
                      <Badge
                        variant="default"
                        size="sm"
                        style={{ backgroundColor: statusColors[status] }}
                      >
                        <Text style={{ color: '#FFF' }}>
                          {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                        </Text>
                      </Badge>
                    </View>
                    {booking.class_time?.name && (
                      <Badge
                        variant={booking.class_time.name.toLowerCase().includes('kid') ? 'warning' : 'info'}
                        size="sm"
                      >
                        {booking.class_time.name}
                      </Badge>
                    )}
                  </View>

                  <View style={styles.trialDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={16} color={Theme.colors.text.secondary} />
                      <Text style={styles.detailText}>{formatDate(booking.start_time)}</Text>
                    </View>
                    {booking.club && (
                      <View style={styles.detailRow}>
                        <Ionicons name="business-outline" size={16} color={Theme.colors.text.secondary} />
                        <Text style={styles.detailText}>{booking.club.name}</Text>
                      </View>
                    )}
                    {booking.class_time && (
                      <View style={styles.detailRow}>
                        <Ionicons name="time-outline" size={16} color={Theme.colors.text.secondary} />
                        <Text style={styles.detailText}>
                          {booking.class_time.day} • {booking.class_time.start_time?.substring(0, 5)}
                        </Text>
                      </View>
                    )}
                    {booking.email && (
                      <View style={styles.detailRow}>
                        <Ionicons name="mail-outline" size={16} color={Theme.colors.text.secondary} />
                        <Text style={styles.detailText}>{booking.email}</Text>
                      </View>
                    )}
                    {booking.phone && (
                      <View style={styles.detailRow}>
                        <Ionicons name="call-outline" size={16} color={Theme.colors.text.secondary} />
                        <Text style={styles.detailText}>{booking.phone}</Text>
                      </View>
                    )}
                    {booking.source && (
                      <View style={styles.detailRow}>
                        <Ionicons name="globe-outline" size={16} color={Theme.colors.text.secondary} />
                        <Text style={styles.detailText}>Source: {booking.source}</Text>
                      </View>
                    )}
                  </View>

                  {status === 'scheduled' && (
                    <View style={styles.actionButtons}>
                      <Button
                        variant="outline"
                        size="sm"
                        style={styles.actionButton}
                        onPress={() => updateBookingStatus(booking.id, 'no-show')}
                      >
                        No Show
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        style={styles.actionButton}
                        onPress={() => updateBookingStatus(booking.id, 'completed')}
                      >
                        Check In
                      </Button>
                    </View>
                  )}
                </Card>
              );
            })}

            {!isOffline && pagination.totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.currentPage === 1}
                  onPress={() => fetchBookingsPage(pagination.currentPage - 1)}
                  style={styles.paginationButton}
                >
                  <Ionicons name="chevron-back" size={20} color={pagination.currentPage === 1 ? Theme.colors.text.disabled : Theme.colors.text.primary} />
                </Button>
                <View style={styles.paginationInfo}>
                  <Text style={styles.paginationText}>
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </Text>
                  <Text style={styles.paginationSubtext}>
                    Showing {Math.min((pagination.currentPage - 1) * pagination.perPage + 1, pagination.totalItems)}-{Math.min(pagination.currentPage * pagination.perPage, pagination.totalItems)} of {pagination.totalItems}
                  </Text>
                </View>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.currentPage === pagination.totalPages}
                  onPress={() => fetchBookingsPage(pagination.currentPage + 1)}
                  style={styles.paginationButton}
                >
                  <Ionicons name="chevron-forward" size={20} color={pagination.currentPage === pagination.totalPages ? Theme.colors.text.disabled : Theme.colors.text.primary} />
                </Button>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-clear-outline" size={48} color={Theme.colors.text.secondary} />
            <Text style={styles.emptyStateText}>
              {searchQuery ? `No bookings found for "${searchQuery}"` : 'No bookings found'}
            </Text>
            {searchQuery && (
              <Button
                variant="primary"
                size="sm"
                onPress={() => setSearchQuery('')}
                style={{ marginTop: Theme.spacing.md }}
              >
                Clear Search
              </Button>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  loadingText: {
    marginTop: Theme.spacing.md,
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.text.secondary,
  },
  errorText: {
    marginTop: Theme.spacing.md,
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.status.error,
    textAlign: 'center',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.status.warning,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.sm,
    gap: 4,
    marginTop: Theme.spacing.xs,
  },
  offlineText: {
    color: '#FFF',
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.medium,
  },
  syncText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.text.secondary,
    marginBottom: Theme.spacing.md,
  },
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background.secondary,
  },
  content: {
    padding: Theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  title: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: Theme.colors.text.primary,
  },
  filterContainer: {
    marginBottom: Theme.spacing.lg,
    flexGrow: 0,
  },
  trialCard: {
    marginBottom: Theme.spacing.md,
  },
  trialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  trialHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    flex: 1,
  },
  trialName: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
  },
  trialDetails: {
    marginTop: Theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  detailText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  notesRow: {
    marginTop: Theme.spacing.sm,
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border.light,
  },
  notesLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  notesText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border.light,
  },
  actionButton: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background.primary,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border.default,
  },
  searchIcon: {
    marginRight: Theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.primary,
  },
  clearButton: {
    padding: Theme.spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xl * 2,
  },
  emptyStateText: {
    marginTop: Theme.spacing.md,
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.text.secondary,
    textAlign: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border.light,
  },
  paginationButton: {
    paddingHorizontal: Theme.spacing.md,
  },
  paginationInfo: {
    flex: 1,
    alignItems: 'center',
  },
  paginationText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
  },
  paginationSubtext: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
    marginTop: Theme.spacing.xs,
  },
});