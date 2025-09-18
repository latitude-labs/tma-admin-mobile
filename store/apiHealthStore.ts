import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ApiHealthState {
  isApiDown: boolean;
  lastServerError: Date | null;
  retryAfter: Date | null;
  errorCount: number;
  suspendedUntil: Date | null;

  recordServerError: () => void;
  clearServerError: () => void;
  canMakeApiCall: () => boolean;
  attemptRetry: () => void;
  getSuspensionTimeRemaining: () => number;
}

const SUSPENSION_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const ERROR_THRESHOLD = 2; // Number of 5XX errors before suspending

export const useApiHealthStore = create<ApiHealthState>()(
  persist(
    (set, get) => ({
      isApiDown: false,
      lastServerError: null,
      retryAfter: null,
      errorCount: 0,
      suspendedUntil: null,

      recordServerError: () => {
        // Skip suspension in development mode
        if (__DEV__) {
          console.warn('[Dev Mode] 5XX error occurred but suspension is disabled');
          return;
        }

        const state = get();
        const newErrorCount = state.errorCount + 1;
        const now = new Date();

        if (newErrorCount >= ERROR_THRESHOLD) {
          const suspendedUntil = new Date(now.getTime() + SUSPENSION_DURATION);

          set({
            isApiDown: true,
            lastServerError: now,
            retryAfter: suspendedUntil,
            errorCount: newErrorCount,
            suspendedUntil,
          });
        } else {
          set({
            lastServerError: now,
            errorCount: newErrorCount,
          });
        }
      },

      clearServerError: () => {
        set({
          isApiDown: false,
          lastServerError: null,
          retryAfter: null,
          errorCount: 0,
          suspendedUntil: null,
        });
      },

      canMakeApiCall: () => {
        const state = get();

        if (!state.suspendedUntil) {
          return true;
        }

        const now = new Date();
        const canCall = now >= state.suspendedUntil;

        // Auto-clear if suspension period has passed
        if (canCall && state.isApiDown) {
          set({
            isApiDown: false,
            suspendedUntil: null,
            retryAfter: null,
            errorCount: 0,
          });
        }

        return canCall;
      },

      attemptRetry: () => {
        const state = get();
        const now = new Date();

        if (!state.suspendedUntil || now >= state.suspendedUntil) {
          set({
            isApiDown: false,
            suspendedUntil: null,
            retryAfter: null,
            errorCount: 0,
          });
        }
      },

      getSuspensionTimeRemaining: () => {
        const state = get();

        if (!state.suspendedUntil) {
          return 0;
        }

        const now = new Date();
        const remaining = state.suspendedUntil.getTime() - now.getTime();

        return Math.max(0, remaining);
      },
    }),
    {
      name: 'api-health-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isApiDown: state.isApiDown,
        lastServerError: state.lastServerError,
        retryAfter: state.retryAfter,
        errorCount: state.errorCount,
        suspendedUntil: state.suspendedUntil,
      }),
      // Convert dates back from strings after rehydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.lastServerError) {
            state.lastServerError = new Date(state.lastServerError);
          }
          if (state.retryAfter) {
            state.retryAfter = new Date(state.retryAfter);
          }
          if (state.suspendedUntil) {
            state.suspendedUntil = new Date(state.suspendedUntil);
          }

          // Check if suspension period has passed
          state.canMakeApiCall();
        }
      },
    }
  )
);