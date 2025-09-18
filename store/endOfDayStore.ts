import { create } from 'zustand';
import { endOfDayApi } from '@/services/api/endOfDay';
import {
  EndOfDayReport,
  CreateEndOfDayReportData,
  EndOfDayReportFilters,
  EoDWizardStep,
  EoDWizardState,
} from '@/types/endOfDay';
import { PaginatedResponse } from '@/types/api';

interface EndOfDayStore {
  // Reports list state
  reports: EndOfDayReport[];
  currentReport: EndOfDayReport | null;
  loading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    lastPage: number;
    total: number;
    perPage: number;
  } | null;

  // Wizard state
  wizardState: EoDWizardState;

  // Reports list actions
  fetchReports: (filters?: EndOfDayReportFilters) => Promise<void>;
  fetchReport: (id: number) => Promise<void>;
  createReport: (data: CreateEndOfDayReportData) => Promise<EndOfDayReport>;
  updateReport: (id: number, data: Partial<CreateEndOfDayReportData>) => Promise<EndOfDayReport>;
  checkReportExists: (clubId: number, date: string) => Promise<boolean>;
  clearError: () => void;

  // Wizard actions
  initializeWizard: (clubId?: number) => void;
  setWizardStep: (step: EoDWizardStep) => void;
  updateWizardData: (data: Partial<CreateEndOfDayReportData>) => void;
  setClassAvailability: (hasKids1: boolean, hasKids2: boolean, hasAdults: boolean) => void;
  resetWizard: () => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  submitWizardReport: () => Promise<EndOfDayReport>;
}

const WIZARD_STEPS_ORDER: EoDWizardStep[] = [
  EoDWizardStep.SelectClub,
  EoDWizardStep.Attendance,
  EoDWizardStep.Trials,
  EoDWizardStep.NewSignups,
  EoDWizardStep.ReturningSignups,
  EoDWizardStep.Financial,
  EoDWizardStep.AdditionalInfo,
  EoDWizardStep.Review,
];

const getInitialWizardState = (): EoDWizardState => ({
  currentStep: EoDWizardStep.SelectClub,
  data: {
    report_date: new Date().toISOString().split('T')[0],
    kids_1_count: 0,
    kids_2_count: 0,
    adults_count: 0,
    kids_1_trials: 0,
    kids_2_trials: 0,
    adults_trials: 0,
    new_kids_paid_kit_and_signed_dd_count: 0,
    new_kids_signed_dd_no_kit_count: 0,
    new_adults_paid_kit_and_signed_dd_count: 0,
    new_adults_signed_dd_no_kit_count: 0,
    returning_kids_paid_kit_and_signed_dd_count: 0,
    returning_kids_signed_dd_no_kit_count: 0,
    returning_adults_paid_kit_and_signed_dd_count: 0,
    returning_adults_signed_dd_no_kit_count: 0,
    total_cash_taken: 0,
  },
  hasKids1Class: true,
  hasKids2Class: false,
  hasAdultsClass: true,
});

export const useEndOfDayStore = create<EndOfDayStore>((set, get) => ({
  // Initial state
  reports: [],
  currentReport: null,
  loading: false,
  error: null,
  pagination: null,
  wizardState: getInitialWizardState(),

  // Reports list actions
  fetchReports: async (filters?: EndOfDayReportFilters) => {
    set({ loading: true, error: null });
    try {
      const response = await endOfDayApi.listReports(filters);
      console.log('===== END OF DAY REPORTS LIST =====');
      console.log('Total Reports:', response.data.length);
      console.log('First Report Sample:', response.data[0] ? JSON.stringify(response.data[0], null, 2) : 'No reports');
      console.log('Pagination:', response.meta);
      console.log('===================================');
      set({
        reports: response.data,
        pagination: {
          currentPage: response.meta.current_page,
          lastPage: response.meta.last_page,
          total: response.meta.total,
          perPage: response.meta.per_page,
        },
        loading: false,
      });
    } catch (error: any) {
      console.error('Error fetching reports list:', error);
      set({
        error: error.message || 'Failed to fetch reports',
        loading: false,
      });
    }
  },

  fetchReport: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const report = await endOfDayApi.getReport(id);
      console.log('===== END OF DAY REPORT DETAIL =====');
      console.log('Report ID:', id);
      console.log('Full Report Data:', JSON.stringify(report, null, 2));
      console.log('Report Date:', report.report_date);
      console.log('User:', report.user);
      console.log('Coach:', report.coach);
      console.log('Club:', report.club);
      console.log('Notes Fields:');
      console.log('  - signup_names:', report.signup_names);
      console.log('  - helper_names:', report.helper_names);
      console.log('  - incidents:', report.incidents);
      console.log('  - general_notes:', report.general_notes);
      console.log('===================================');
      set({
        currentReport: report,
        loading: false,
      });
    } catch (error: any) {
      console.error('Error fetching report:', error);
      set({
        error: error.message || 'Failed to fetch report',
        loading: false,
      });
    }
  },

  createReport: async (data: CreateEndOfDayReportData) => {
    set({ loading: true, error: null });
    try {
      const response = await endOfDayApi.createReport(data);
      const { report } = response;

      // Add to reports list
      set(state => ({
        reports: [report, ...state.reports],
        loading: false,
      }));

      return report;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to create report';
      set({
        error: errorMessage,
        loading: false,
      });
      throw new Error(errorMessage);
    }
  },

  updateReport: async (id: number, data: Partial<CreateEndOfDayReportData>) => {
    set({ loading: true, error: null });
    try {
      const response = await endOfDayApi.updateReport(id, data);
      const { report } = response;

      // Update in reports list
      set(state => ({
        reports: state.reports.map(r => r.id === id ? report : r),
        currentReport: state.currentReport?.id === id ? report : state.currentReport,
        loading: false,
      }));

      return report;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update report';
      set({
        error: errorMessage,
        loading: false,
      });
      throw new Error(errorMessage);
    }
  },

  checkReportExists: async (clubId: number, date: string) => {
    try {
      return await endOfDayApi.checkReportExists(clubId, date);
    } catch (error) {
      console.error('Error checking report existence:', error);
      return false;
    }
  },

  clearError: () => set({ error: null }),

  // Wizard actions
  initializeWizard: (clubId?: number) => {
    const initialState = getInitialWizardState();
    if (clubId) {
      initialState.data.club_id = clubId;
      // Skip club selection if club is already provided
      initialState.currentStep = EoDWizardStep.Attendance;
    }
    set({ wizardState: initialState });
  },

  setWizardStep: (step: EoDWizardStep) => {
    set(state => ({
      wizardState: {
        ...state.wizardState,
        currentStep: step,
      },
    }));
  },

  updateWizardData: (data: Partial<CreateEndOfDayReportData>) => {
    set(state => ({
      wizardState: {
        ...state.wizardState,
        data: {
          ...state.wizardState.data,
          ...data,
        },
      },
    }));
  },

  setClassAvailability: (hasKids1: boolean, hasKids2: boolean, hasAdults: boolean) => {
    set(state => ({
      wizardState: {
        ...state.wizardState,
        hasKids1Class: hasKids1,
        hasKids2Class: hasKids2,
        hasAdultsClass: hasAdults,
      },
    }));
  },

  resetWizard: () => {
    set({ wizardState: getInitialWizardState() });
  },

  goToNextStep: () => {
    const { wizardState } = get();
    const currentIndex = WIZARD_STEPS_ORDER.indexOf(wizardState.currentStep);

    if (currentIndex < WIZARD_STEPS_ORDER.length - 1) {
      const nextStep = WIZARD_STEPS_ORDER[currentIndex + 1];

      // Skip steps based on class availability
      if (nextStep === EoDWizardStep.NewSignups || nextStep === EoDWizardStep.ReturningSignups) {
        const { hasKids1Class, hasKids2Class, hasAdultsClass } = wizardState;
        if (!hasKids1Class && !hasKids2Class && !hasAdultsClass) {
          // Skip signup steps if no classes
          set(state => ({
            wizardState: {
              ...state.wizardState,
              currentStep: WIZARD_STEPS_ORDER[currentIndex + 2] || EoDWizardStep.Financial,
            },
          }));
          return;
        }
      }

      set(state => ({
        wizardState: {
          ...state.wizardState,
          currentStep: nextStep,
        },
      }));
    }
  },

  goToPreviousStep: () => {
    const { wizardState } = get();
    const currentIndex = WIZARD_STEPS_ORDER.indexOf(wizardState.currentStep);

    if (currentIndex > 0) {
      const prevStep = WIZARD_STEPS_ORDER[currentIndex - 1];

      // Skip steps based on class availability when going back
      if (prevStep === EoDWizardStep.ReturningSignups || prevStep === EoDWizardStep.NewSignups) {
        const { hasKids1Class, hasKids2Class, hasAdultsClass } = wizardState;
        if (!hasKids1Class && !hasKids2Class && !hasAdultsClass) {
          // Skip signup steps if no classes
          set(state => ({
            wizardState: {
              ...state.wizardState,
              currentStep: WIZARD_STEPS_ORDER[currentIndex - 2] || EoDWizardStep.Trials,
            },
          }));
          return;
        }
      }

      set(state => ({
        wizardState: {
          ...state.wizardState,
          currentStep: prevStep,
        },
      }));
    }
  },

  submitWizardReport: async () => {
    const { wizardState, createReport } = get();
    const data = wizardState.data as CreateEndOfDayReportData;

    if (!data.club_id) {
      throw new Error('Club must be selected');
    }

    const report = await createReport(data);
    get().resetWizard();
    return report;
  },
}));