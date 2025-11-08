import { User } from './api';

export type Coach = User;

export type DateRangeFilter = 'past_week' | 'past_month' | 'past_year';

export interface DateRangeOption {
  label: string;
  value: DateRangeFilter;
}

export const dateRangeOptions: DateRangeOption[] = [
  { label: 'Past Week', value: 'past_week' },
  { label: 'Past Month', value: 'past_month' },
  { label: 'Past Year', value: 'past_year' },
];

export interface CoachStats {
  enrollment_rate_on_day: number; // % who enrolled same day as trial (for selected period)
  enrollment_rate_ytd: number; // % overall enrollment for full year (includes delayed enrollments)
  total_trials_period: number; // trials during selected period
  total_on_day_enrollments_period: number; // enrolled same day during period
  total_trials_ytd: number; // trials for full year
  total_enrollments_ytd: number; // all enrollments for full year
}

export interface CreateCoachData {
  name: string;
  email: string;
  phone_number?: string;
  password: string;
}

export interface UpdateCoachData {
  name?: string;
  email?: string;
  phone_number?: string;
  password?: string;
}