export interface EndOfDayReport {
  id: number;
  club_id: number;
  user_id: number;
  report_date: string;

  // Attendance counts
  kids_1_count: number;
  kids_2_count: number;
  adults_count: number;

  // Trial counts
  kids_1_trials: number;
  kids_2_trials: number;
  adults_trials: number;

  // New sign-ups (same day as trial)
  new_kids_paid_kit_and_signed_dd_count: number;
  new_kids_signed_dd_no_kit_count: number;
  new_adults_paid_kit_and_signed_dd_count: number;
  new_adults_signed_dd_no_kit_count: number;

  // Returning sign-ups (later date after trial)
  returning_kids_paid_kit_and_signed_dd_count: number;
  returning_kids_signed_dd_no_kit_count: number;
  returning_adults_paid_kit_and_signed_dd_count: number;
  returning_adults_signed_dd_no_kit_count: number;

  // Financial
  total_cash_taken: number;

  // Additional info
  signup_names?: string | null;
  helper_names?: string | null;
  helper_attendance?: HelperAttendance[] | null;
  incidents?: string | null;
  general_notes?: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Relations
  club?: {
    id: number;
    name: string;
  };
  user?: {
    id: number;
    name: string;
  };
  coach?: {
    id: number;
    name: string;
  };
}

export interface CreateEndOfDayReportData {
  club_id: number;
  report_date: string;
  kids_1_count: number;
  kids_2_count: number;
  adults_count: number;
  kids_1_trials: number;
  kids_2_trials: number;
  adults_trials: number;
  new_kids_paid_kit_and_signed_dd_count: number;
  new_kids_signed_dd_no_kit_count: number;
  new_adults_paid_kit_and_signed_dd_count: number;
  new_adults_signed_dd_no_kit_count: number;
  returning_kids_paid_kit_and_signed_dd_count: number;
  returning_kids_signed_dd_no_kit_count: number;
  returning_adults_paid_kit_and_signed_dd_count: number;
  returning_adults_signed_dd_no_kit_count: number;
  total_cash_taken: number;
  signup_names?: string | null;
  helper_names?: string | null;
  helper_attendance?: HelperAttendance[] | null;
  incidents?: string | null;
  general_notes?: string | null;
}

export interface EndOfDayReportFilters {
  club_id?: number;
  user_id?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}

// Helper attendance tracking
export interface HelperAttendance {
  name: string;
  status: 'on_time' | 'late' | 'no_show';
  message?: string;
}

// Wizard steps for the creation flow
export enum EoDWizardStep {
  SelectClub = 'selectClub',
  Attendance = 'attendance',
  Trials = 'trials',
  NewSignups = 'newSignups',
  ReturningSignups = 'returningSignups',
  Financial = 'financial',
  HelperCheckups = 'helperCheckups',
  AdditionalInfo = 'additionalInfo',
  Review = 'review',
}

export interface EoDWizardState {
  currentStep: EoDWizardStep;
  data: Partial<CreateEndOfDayReportData>;
  hasKids1Class: boolean;
  hasKids2Class: boolean;
  hasAdultsClass: boolean;
}