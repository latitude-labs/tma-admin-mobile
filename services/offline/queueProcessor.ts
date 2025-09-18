import { useSyncStore } from '@/store/syncStore';
import { offlineStorage } from '@/services/offline/storage';
import apiClient from '@/services/api/client';
import NetInfo from '@react-native-community/netinfo';

export interface QueueCommand {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'booking' | 'attendance' | 'trial' | 'student' | 'endOfDay';
  operation: string;
  data: any;
  timestamp: number;
  retries: number;
  lastError?: string;
  // Simple API endpoint config for generic operations
  endpoint?: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}

class QueueProcessor {
  private static instance: QueueProcessor;
  private isProcessing: boolean = false;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds between retries

  static getInstance(): QueueProcessor {
    if (!this.instance) {
      this.instance = new QueueProcessor();
    }
    return this.instance;
  }

  private constructor() {
    // Listen for network changes
    NetInfo.addEventListener((state) => {
      if (state.isConnected && !this.isProcessing) {
        this.processQueue();
      }
    });
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    const isOnline = await offlineStorage.isOnline();
    if (!isOnline) {
      return;
    }

    const syncStore = useSyncStore.getState();
    const queue = syncStore.syncQueue;

    if (queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    syncStore.setSyncing(true);

    try {
      // Process queue items one by one (simple and reliable)
      for (const command of queue) {
        try {
          await this.processCommand(command);
          syncStore.removeFromQueue(command.id);
        } catch (error: any) {
          console.error(`Failed to process command ${command.id}:`, error);

          // Increment retry count
          if (command.retries < this.MAX_RETRIES) {
            syncStore.incrementRetries(command.id);
            // Wait before processing next item on error
            await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
          } else {
            // Max retries reached, remove from queue and log error
            syncStore.removeFromQueue(command.id);
            syncStore.addSyncError(`Failed after ${this.MAX_RETRIES} retries: ${error.message}`);
          }
        }
      }

      syncStore.setLastSyncTime(Date.now());
    } catch (error) {
      console.error('Queue processing error:', error);
      syncStore.addSyncError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this.isProcessing = false;
      syncStore.setSyncing(false);
    }
  }

  private async processCommand(command: QueueCommand): Promise<any> {
    // Handle generic endpoint-based commands
    if (command.endpoint && command.method) {
      return this.processGenericCommand(command);
    }

    // Handle entity-specific commands
    switch (command.entity) {
      case 'booking':
        return this.processBookingCommand(command);
      case 'attendance':
        return this.processAttendanceCommand(command);
      case 'endOfDay':
        return this.processEndOfDayCommand(command);
      default:
        throw new Error(`Unsupported entity type: ${command.entity}`);
    }
  }

  private async processBookingCommand(command: QueueCommand): Promise<any> {
    const { operation, data } = command;

    switch (operation) {
      case 'updateStatus':
        return apiClient.patch(`/bookings/${data.bookingId}/status`, {
          status: data.status,
        });
      case 'markNoShow':
        return apiClient.patch(`/bookings/${data.bookingId}/no-show`, {
          no_show: true,
        });
      default:
        throw new Error(`Unsupported booking operation: ${operation}`);
    }
  }

  private async processAttendanceCommand(command: QueueCommand): Promise<any> {
    const { operation, data } = command;

    switch (operation) {
      case 'markAttendance':
        return apiClient.post('/attendance', {
          class_id: data.classId,
          student_id: data.studentId,
          status: data.status,
        });
      case 'bulkUpdate':
        return apiClient.post('/attendance/bulk', {
          class_id: data.classId,
          attendance: data.attendance,
        });
      default:
        throw new Error(`Unsupported attendance operation: ${operation}`);
    }
  }

  private async processEndOfDayCommand(command: QueueCommand): Promise<any> {
    const { operation, data } = command;

    switch (operation) {
      case 'submitReport':
        return apiClient.post('/end-of-day/reports', data);
      default:
        throw new Error(`Unsupported end-of-day operation: ${operation}`);
    }
  }

  private async processGenericCommand(command: QueueCommand): Promise<any> {
    const { endpoint, method, data } = command;

    if (!endpoint || !method) {
      throw new Error('Generic command requires endpoint and method');
    }

    switch (method) {
      case 'POST':
        return apiClient.post(endpoint, data);
      case 'PUT':
        return apiClient.put(endpoint, data);
      case 'PATCH':
        return apiClient.patch(endpoint, data);
      case 'DELETE':
        return apiClient.delete(endpoint);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  // Force process the queue (for manual trigger)
  async forceSync(): Promise<void> {
    this.isProcessing = false; // Reset flag to allow processing
    return this.processQueue();
  }
}

export const queueProcessor = QueueProcessor.getInstance();