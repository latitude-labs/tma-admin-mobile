// Calendar Event Types
export type EventType = 'class' | 'holiday' | 'overtime' | 'custom';
export type EventStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
export type HolidayReason = 'holiday' | 'sick' | 'personal' | 'other';
export type HolidayStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type CoverageStatus = 'pending' | 'confirmed' | 'declined';

// Calendar Views
export type CalendarView = 'month' | 'week' | 'day';

// Main Calendar Event (matching backend /api/rota response)
export interface CalendarEvent {
  id: number;
  title: string;
  description?: string | null;
  start_date: string; // ISO datetime string
  end_date: string;
  all_day: boolean;
  status: EventStatus;
  type: EventType;
  color?: string;
  notes?: string | null;
  metadata?: Record<string, any> | null;
  is_cover: boolean;
  original_user?: string | null; // Name of original coach if coverage
  coach?: {
    id: number;
    name: string;
    email?: string;
  };
  club?: {
    id: number;
    name: string;
    address?: string;
  };
  class_time?: {
    id: number;
    name: string;
    day: string;
    start_time: string;
    end_time: string;
  };
}

// Holiday Request (matching backend /api/holiday-requests response)
export interface HolidayRequest {
  id: number;
  uuid?: string;
  user_id: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  reason: HolidayReason;
  notes?: string;
  status: HolidayStatus;
  approved_by?: number | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  user?: {
    id: number;
    name: string;
    email?: string;
  };
  approvedBy?: {
    id: number;
    name: string;
    email?: string;
  };
  rotas?: CalendarEvent[];
}

// Affected Class (for holiday requests)
export interface AffectedClass {
  date: string;
  class_time: {
    id: number;
    name: string;
    start_time: string;
    end_time: string;
    club?: {
      id: number;
      name: string;
    };
  };
  coverage?: {
    status: 'pending' | 'assigned';
    covering_user?: {
      id: number;
      name: string;
    };
  };
}

// Coverage Assignment
export interface CoverageAssignment {
  id: number;
  holiday_request_id: number;
  original_user_id: number;
  original_user?: {
    id: number;
    name: string;
  };
  covering_user_id: number;
  covering_user?: {
    id: number;
    name: string;
  };
  class_time_id: number;
  class_time?: {
    id: number;
    name: string;
    club?: {
      id: number;
      name: string;
    };
  };
  date: string;
  status: CoverageStatus;
  notes?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

// Available Coach for Coverage
export interface AvailableCoach {
  id: number;
  name: string;
  email?: string;
  availability: 'available' | 'maybe' | 'busy';
  skills?: string[];
  distance_km?: number;
  last_taught?: string;
  conflicting_events?: {
    title: string;
    time: string;
  }[];
}

// Default Schedule
export interface DefaultSchedule {
  Monday: DefaultScheduleItem[];
  Tuesday: DefaultScheduleItem[];
  Wednesday: DefaultScheduleItem[];
  Thursday: DefaultScheduleItem[];
  Friday: DefaultScheduleItem[];
  Saturday: DefaultScheduleItem[];
  Sunday: DefaultScheduleItem[];
}

export interface DefaultScheduleItem {
  class_time_id: number;
  start_time: string;
  end_time: string;
  club: string;
  name: string;
}

// Calendar Sync
export interface CalendarSyncOperation {
  client_id?: string;
  id?: number;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp?: number;
}

export interface CalendarSyncResponse {
  synced: {
    client_id?: string;
    server_id: number;
    status: 'success' | 'error';
    error?: string;
  }[];
  conflicts: {
    id: number;
    client_version: any;
    server_version: any;
    resolution: 'server_wins' | 'client_wins' | 'merged';
  }[];
  server_time: string;
}

// Calendar Filters
export interface CalendarFilters {
  view: CalendarView;
  selectedDate: Date;
  showTypes: EventType[];
  selectedUsers: number[];
  selectedClubs: number[];
  showTeamEvents: boolean;
  showCoverageNeeded: boolean;
}

// Calendar State (for store)
export interface CalendarState {
  // Events
  events: CalendarEvent[];
  eventsLoading: boolean;
  eventsError: string | null;

  // Holiday Requests
  holidayRequests: HolidayRequest[];
  holidayRequestsLoading: boolean;

  // Coverage
  coverageAssignments: CoverageAssignment[];
  availableCoaches: AvailableCoach[];

  // UI State
  filters: CalendarFilters;
  selectedEvent: CalendarEvent | null;
  selectedDateRange: {
    start: Date;
    end: Date;
  } | null;

  // Sync State
  syncQueue: CalendarSyncOperation[];
  lastSyncTime: string | null;
  isSyncing: boolean;

  // Cache Management
  cachedMonths: string[]; // YYYY-MM format
  cacheExpiry: { [key: string]: number };
}

// API Request Types (matching backend endpoints)
export interface CreateEventRequest {
  title: string;
  type: EventType;
  start_date: string;
  end_date: string;
  all_day?: boolean;
  description?: string;
  notes?: string;
  user_id?: number; // Admin only
  club_id?: number;
  class_time_id?: number;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  all_day?: boolean;
  status?: EventStatus;
  notes?: string;
}

export interface CreateHolidayRequest {
  start_date: string;
  end_date: string;
  reason: HolidayReason;
  notes?: string;
}

export interface AssignCoverageRequest {
  assignments: {
    date: string;
    class_time_id: number;
    covering_user_id: number;
    notes?: string;
  }[];
}

export interface PopulateDefaultScheduleRequest {
  user_id?: number;
  start_date: string;
  end_date: string;
  exclude_holidays?: boolean;
}

// Helper Types
export interface DateRange {
  start: Date;
  end: Date;
}

export interface MonthData {
  year: number;
  month: number;
  weeks: WeekData[];
}

export interface WeekData {
  weekNumber: number;
  days: DayData[];
}

export interface DayData {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
  hasHoliday: boolean;
  hasClass: boolean;
  needsCoverage: boolean;
}

// API Response Types
export interface EventsResponse {
  data: CalendarEvent[];
  total: number;
  meta?: {
    total: number;
    has_conflicts?: boolean;
  };
}

export interface HolidayRequestsResponse {
  data: HolidayRequest[];
  meta?: {
    total: number;
    current_page: number;
    last_page: number;
  };
}

export interface TeamCalendarResponse {
  data: CalendarEvent[];
  team_members: {
    id: number;
    name: string;
  }[];
}

export interface PopulateScheduleResponse {
  message: string;
  created: number;
  skipped?: number;
}

export interface ConflictsCheckResponse {
  has_conflicts: boolean;
  conflicts: CalendarEvent[];
}