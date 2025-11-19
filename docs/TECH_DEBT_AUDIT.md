# Technical Debt Audit Report

**Date:** November 19, 2025
**Auditor:** Gemini Agent

## 1. Executive Summary
The project demonstrates a solid foundation with working features and some areas of excellent architecture (specifically `calendar.tsx` and `club-health.tsx`). However, rapid development has led to significant technical debt in core areas, particularly the Dashboard implementation. The codebase currently suffers from "God Components" that tightly couple UI, data fetching, and business logic, making maintenance and testing difficult. 

Refactoring these areas to match the cleaner patterns found elsewhere in the app will significantly improve stability, performance, and developer velocity.

## 2. Critical Issues (High Priority)

### 2.1. "God Components" in Dashboard
**Files:** `components/dashboard/AdminDashboard.tsx`, `components/dashboard/CoachDashboard.tsx`

The dashboard implementation is the most significant area of debt.
-   **AdminDashboard.tsx (~700+ lines):** Handles data fetching, local/global state mixing, complex animations, and UI rendering all in one file.
-   **CoachDashboard.tsx:** Contains nested data fetching (N+1 problem when fetching bookings for classes), mixes offline/online logic directly in the render body, and defines internal components inline.

**Impact:** High risk of regression when modifying dashboard features. difficult to unit test. Poor performance due to unoptimized re-renders.

**Recommendation:** 
-   Decompose into smaller, single-purpose components (e.g., `StatCard`, `ClassList`, `ActionButtons`).
-   Extract data fetching and business logic into custom hooks (e.g., `useAdminStats`, `useCoachSchedule`).

### 2.2. Inconsistent State Management
While `calendar.tsx` and `club-health.tsx` use Zustand stores effectively, the Dashboards mix local `useState` with global stores and direct service calls.

**Impact:** Unpredictable data flow and difficult debugging.

**Recommendation:** 
-   Migrate Dashboard logic to dedicated Zustand stores (`dashboardStore.ts` is likely needed or should be expanded).
-   Standardize on the "Store + Custom Hook" pattern seen in `club-health.tsx`.

## 3. Component Specific Recommendations

### 3.1. Login Screen Logic
**File:** `app/login.tsx`

The login screen contains heavy logic for biometric authentication, enrollment checks, and navigation delays (using `setTimeout`).

**Recommendation:**
-   Extract biometric logic into a `useBiometricAuth` hook.
-   Move navigation logic into the `authStore` or a dedicated side-effect handler to avoid race conditions with `setTimeout`.

### 3.2. Performance Bottlenecks in Coach Dashboard
**File:** `components/dashboard/CoachDashboard.tsx`

The current implementation appears to fetch daily classes and *then* iterate to fetch bookings for each class individually.

**Recommendation:**
-   Refactor the API or the service layer to support a "bulk fetch" or "include" pattern (e.g., `getClasses({ include: ['bookings'] })`) to reduce network round trips.

## 4. Architectural Alignment (The "North Star")

The project already contains the blueprint for success. Future refactoring should aim to replicate the architecture of:
-   **`app/calendar.tsx`**: Composes smaller components (`CalendarView`, modals).
-   **`app/club-health.tsx`**: Separation of View (UI) and Logic (Store).

**Standard Pattern to Adopt:**
1.  **Page Component:** Handles routing params and layout only.
2.  **View Component:** Pure UI, receives data via props or hooks.
3.  **Custom Hook/Store:** Handles data fetching, transformations, and state updates.

## 5. Action Plan

1.  **Refactor `app/login.tsx`**: Quick win to simplify the entry point.
2.  **Decompose `AdminDashboard.tsx`**: Break down the UI into smaller components first (no logic change).
3.  **Extract Admin Logic**: Move data fetching to a hook/store.
4.  **Refactor `CoachDashboard.tsx`**: Address the N+1 data fetching issue and decompose UI.
5.  **Audit Services**: Ensure all API calls are centralized in `services/` and not called directly from components.
