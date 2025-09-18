import { useSyncStore } from '@/store/syncStore';

// Simple factory to create queue commands
export class CommandFactory {
  // Booking commands
  static updateBookingStatus(bookingId: number, status: string) {
    return {
      type: 'update' as const,
      entity: 'booking' as const,
      operation: 'updateStatus',
      data: { bookingId, status },
    };
  }

  static markBookingNoShow(bookingId: number) {
    return {
      type: 'update' as const,
      entity: 'booking' as const,
      operation: 'markNoShow',
      data: { bookingId },
    };
  }

  // Attendance commands
  static markAttendance(classId: number, studentId: number, status: 'present' | 'absent') {
    return {
      type: 'create' as const,
      entity: 'attendance' as const,
      operation: 'markAttendance',
      data: { classId, studentId, status },
    };
  }

  static bulkUpdateAttendance(classId: number, attendance: Array<{ studentId: number; status: string }>) {
    return {
      type: 'create' as const,
      entity: 'attendance' as const,
      operation: 'bulkUpdate',
      data: { classId, attendance },
    };
  }

  // End of Day commands
  static submitEndOfDayReport(reportData: any) {
    return {
      type: 'create' as const,
      entity: 'endOfDay' as const,
      operation: 'submitReport',
      data: reportData,
    };
  }

  // Generic API command for any endpoint
  static genericApiCommand(
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: any
  ) {
    return {
      type: 'create' as const,
      entity: 'booking' as const, // Default entity for generic commands
      operation: 'generic',
      data,
      endpoint,
      method,
    };
  }
}

// Helper function to queue a command
export function queueCommand(command: any) {
  const syncStore = useSyncStore.getState();
  syncStore.addToQueue(command);
}