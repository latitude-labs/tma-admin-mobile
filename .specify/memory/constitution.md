<!--
Sync Impact Report
==================
Version Change: 0.0.0 → 1.0.0 (Initial Constitution)
Principles Added:
  - I. Design System Adherence
  - II. Type Safety & Code Quality
  - III. Component Architecture
  - IV. Accessibility & User Experience
  - V. Performance & Optimization
  - VI. State Management
  - VII. Testing & Documentation

Templates Updated:
  ✅ plan-template.md - Constitution Check section aligns
  ✅ spec-template.md - Requirements align with principles
  ✅ tasks-template.md - Task categories reflect principles

Follow-up TODOs: None

Rationale for MAJOR version (1.0.0):
  This is the initial constitution establishing foundational governance for TMA Admin Mobile.
  All principles are new and set binding development standards.
-->

# TMA Admin Mobile Constitution

## Core Principles

### I. Design System Adherence

**Non-Negotiable Rules:**
- Every component MUST use dynamic theme colors via the `useThemeColors()` hook
- NEVER hardcode hex color values (`#FFFFFF`, `#000000`) in component styles
- NEVER use `useColorScheme()` with `ColorPalette` directly - ALWAYS use `useThemeColors()`
- ALL styles MUST be created using `useMemo(() => createStyles(palette), [palette])` pattern
- Component styling MUST follow the Duolingo-inspired design system: rounded corners (12-16px), soft shadows, warm colors, professional animations
- Typography MUST use the Manrope font family with Theme.typography scale
- Spacing MUST use the Theme.spacing scale (base 4px unit)
- Status colors MUST use Theme.colors (primary, success, warning, error, info)

**Rationale:**
Dark mode support is non-negotiable for modern mobile applications. Static color references break theme switching and create maintenance debt. The `useThemeColors()` hook provides a single source of truth for theme-aware colors, ensuring consistent behavior across light and dark modes. The Duolingo-inspired design system creates a friendly yet professional user experience that differentiates TMA from competitors.

### II. Type Safety & Code Quality

**Non-Negotiable Rules:**
- TypeScript strict mode MUST remain enabled at all times
- ALL API responses MUST have TypeScript interfaces defined in `types/` directory
- ALL component props MUST have explicit TypeScript interfaces
- NEVER use `any` type unless absolutely necessary with documented justification
- ALL async operations MUST use proper error handling with try-catch blocks
- Error types MUST be consistent and use standardized error interfaces
- ALL form data MUST be validated using schema-based validation (React Hook Form + validation rules)

**Rationale:**
TypeScript strict mode catches bugs at compile time rather than runtime, reducing production errors. Explicit typing serves as living documentation and enables better IDE support. Consistent error handling ensures predictable behavior and better debugging capabilities.

### III. Component Architecture

**Non-Negotiable Rules:**
- React hooks MUST NEVER be called inside map(), loops, or conditional logic
- Extract separate components instead of using hooks in render functions
- ALL text MUST be wrapped in `<Text>` components - no bare strings
- ALWAYS provide fallbacks for potentially undefined values: `{value || ''}` instead of `{value}`
- NEVER use `&&` for conditional rendering - use ternary with explicit `null`: `{condition ? <Component /> : null}`
- Complex components MUST be extracted to separate files when exceeding 200 lines
- Component files MUST export a single default component with supporting types/interfaces
- Memoize list item components with `React.memo()` when used in FlatList
- Use `useCallback` for functions passed to child components in lists

**Rationale:**
The "Rendered more hooks than during the previous render" error is a common React Native pitfall that crashes the app. React's Rules of Hooks are fundamental to its rendering model. Text component requirements prevent runtime crashes from undefined values. Component extraction improves maintainability and enables better performance optimization.

### IV. Accessibility & User Experience

**Non-Negotiable Rules:**
- ALL interactive elements MUST have minimum touch target of 44x44 points
- ALL interactive components MUST include `accessibilityLabel` prop
- ALL form inputs MUST have clear labels and error states
- ALL user actions MUST provide visual feedback (haptic, toast, or animation)
- Haptic feedback MUST use `expo-haptics` with appropriate intensity (Light/Medium for interactions, Success/Error/Warning for notifications)
- Loading states MUST be shown for all async operations exceeding 300ms
- Error messages MUST be user-friendly, actionable, and displayed via Toast component
- Animations MUST be subtle and professional (spring damping: 15-20, stiffness: 100-200)
- NEVER block user interaction without loading indicator or feedback

**Rationale:**
Accessibility is a legal requirement and improves usability for all users. Professional haptic feedback creates a premium feel. Clear error states reduce user frustration and support load. Subtle animations enhance UX without feeling playful or game-like.

### V. Performance & Optimization

**Non-Negotiable Rules:**
- Style creation MUST use `useMemo` with palette dependency: `useMemo(() => createStyles(palette), [palette])`
- List rendering MUST use FlatList with `keyExtractor`, `getItemLayout` (if fixed height), and `removeClippedSubviews`
- Image components MUST specify explicit `width` and `height` props
- Heavy computations MUST be memoized with `useMemo` or extracted to utility functions
- API responses MUST be cached appropriately (using RequestManager patterns)
- Avoid inline function definitions in render for components used in lists
- Animations MUST run on the UI thread using React Native Reanimated 4.x
- Avoid excessive re-renders by using `useCallback` for event handlers passed to memoized children

**Rationale:**
Mobile devices have limited resources compared to desktops. Unnecessary re-renders and recalculations cause janky UI and poor battery life. Proper memoization and list optimization ensure 60 FPS scrolling. Reanimated's UI thread animations prevent JavaScript thread blocking.

### VI. State Management

**Non-Negotiable Rules:**
- Global state MUST use Zustand stores (located in `store/` directory)
- Each store MUST have a TypeScript interface defining its complete shape
- Stores MUST separate concerns (auth, clubs, bookings, sync, etc.) - no god objects
- Async operations in stores MUST set loading/error states
- Stores requiring persistence MUST use Zustand persist middleware with AsyncStorage
- Component local state MUST use `useState` - do not use Zustand for purely component-local state
- Auth state MUST be managed through `authStore` - never duplicate in component state
- API data MUST be cached in appropriate Zustand stores with last-sync timestamp
- Offline data queue MUST use `syncStore` pattern for network-resilient operations

**Rationale:**
Zustand provides lightweight, TypeScript-friendly state management without boilerplate. Separating concerns prevents store bloat and improves maintainability. Offline-first architecture is critical for mobile apps with unreliable connectivity. Consistent patterns reduce cognitive load for developers.

### VII. Testing & Documentation

**Non-Negotiable Rules:**
- ALL new features MUST include acceptance criteria in the feature specification
- ALL UI components in `components/ui/` MUST include JSDoc comments describing props and usage
- ALL complex business logic MUST be extracted to testable utility functions
- Breaking changes to shared components MUST be documented in commit messages
- API integration MUST reference OpenAPI specification (`openapi.yaml`)
- Critical user flows (auth, data sync, offline queue) SHOULD have integration tests when testing infrastructure is established
- NEVER ship features that crash on undefined/null data - defensive coding is mandatory

**Rationale:**
While testing infrastructure is not yet established, defensive coding and clear documentation prevent bugs. JSDoc serves as inline documentation for IDE support. Extracting testable logic enables future test coverage when the framework is added. OpenAPI spec ensures API contract alignment.

## Development Workflow

### Code Standards

- **File Naming**: Use kebab-case for files (`club-form.tsx`), PascalCase for component exports
- **Import Organization**:
  1. React/React Native imports
  2. Third-party libraries
  3. Local imports (services, stores, components, utils)
  4. Type imports
  5. Styles (if not using createStyles pattern)
- **Service Layer**: ALL API calls MUST go through services in `services/api/` - components NEVER call API client directly
- **Environment Variables**: ALL configuration MUST use environment variables via `config/env.ts`
- **Error Propagation**: Services throw errors, components catch and display via Toast
- **Offline First**: Data writes MUST queue in `syncStore` when offline, sync on reconnection

### Component Development Checklist

Before committing a component:
- [ ] Uses `useThemeColors()` hook for dynamic colors
- [ ] Styles created with `useMemo` pattern
- [ ] All text wrapped in `<Text>` components with fallbacks
- [ ] No hooks inside loops/conditionals
- [ ] TypeScript interfaces defined for all props
- [ ] Interactive elements have accessibility labels
- [ ] Haptic feedback on user interactions
- [ ] Loading/error states for async operations
- [ ] Component memoized if used in lists
- [ ] No hardcoded colors, spacing, or typography

### Screen Development Checklist

Before committing a screen:
- [ ] Stack.Screen configured with proper header options
- [ ] Navigation uses typed routes from expo-router
- [ ] Auth state checked if protected route
- [ ] Offline state handled gracefully
- [ ] Form validation uses React Hook Form with proper error display
- [ ] Success/error feedback via Toast
- [ ] Safe area context considered (notches, system UI)
- [ ] Keyboard avoidance implemented for forms

## Quality Gates

### Pre-Commit Requirements

ALL code changes MUST pass these gates before commit:

1. **TypeScript Compilation**: `npx tsc --noEmit` must pass with zero errors
2. **CLAUDE.md Compliance**: Manual verification of design system rules
3. **Theme Color Pattern**: `grep -r "useColorScheme\|#[0-9A-Fa-f]\{6\}" components/` should yield zero hits in committed files (except Colors.ts, Theme.ts)
4. **Hooks Pattern**: No hooks inside render functions - extract components if needed
5. **Text Component**: No bare strings outside `<Text>` components

### Pre-Push Requirements

1. TypeScript compilation passes
2. No console errors in development server
3. App launches successfully on iOS/Android simulator
4. No undefined/null crashes in tested flows
5. Theme switching (light/dark) works without visual breaks

### Pre-PR Requirements

1. All pre-push requirements met
2. Feature specification exists in `.specify/` (for new features)
3. Commit messages follow conventional format (`feat:`, `fix:`, `refactor:`, `docs:`)
4. Breaking changes documented in PR description
5. Screenshots/videos for UI changes

## Future Infrastructure

When the following capabilities are added, these principles will become enforceable:

### Testing (When Implemented)

- Unit tests for utility functions and business logic
- Integration tests for critical flows (auth, sync, booking)
- Component tests for complex UI components
- E2E tests for core user journeys
- Test coverage requirement: 70% for services, 50% for components

### Linting (To Be Added)

- ESLint configuration with React Native, TypeScript, React Hooks rules
- Prettier for code formatting (single quotes, 2-space indent, trailing commas)
- Pre-commit hooks to enforce linting
- Custom ESLint rules for CLAUDE.md patterns (useThemeColors enforcement)

### CI/CD (To Be Added)

- Automated TypeScript checks
- Automated tests (when implemented)
- EAS Build for iOS/Android
- Preview builds for PRs
- Automated deployment to staging

## Governance

### Amendment Process

1. Propose amendment via PR to `.specify/memory/constitution.md`
2. Document rationale and impact on existing code
3. Update version number following semantic versioning:
   - **MAJOR**: Backward-incompatible principle changes or removals
   - **MINOR**: New principles added or existing principles expanded
   - **PATCH**: Clarifications, typo fixes, non-semantic refinements
4. Update `LAST_AMENDED_DATE` to amendment date
5. Update Sync Impact Report at top of file
6. Require approval from project maintainer
7. Update dependent templates (plan, spec, tasks) to reflect changes
8. Communicate changes to development team

### Compliance Review

- Constitution compliance is REQUIRED for all PRs
- Code reviews MUST verify adherence to all principles
- Non-compliance without documented justification will block merge
- Complexity violations (new architecture patterns, additional dependencies) MUST be justified in PR with "Simpler Alternative Rejected Because" reasoning
- Deviation from constitution requires amendment first, implementation second

### Enforcement

- This constitution supersedes all other development practices
- CLAUDE.md remains the comprehensive development guide and is complementary
- When conflict arises between constitution and other docs, constitution takes precedence
- Constitution focuses on non-negotiable rules; CLAUDE.md provides implementation guidance
- Runtime development guidance references CLAUDE.md for detailed patterns

### Living Document

- Constitution is version-controlled in `.specify/memory/constitution.md`
- Sync Impact Report tracks all changes for transparency
- Regular reviews (quarterly) to assess effectiveness
- Metrics tracked: PR rejections due to violations, time to fix violations
- Success measured by: reduced bugs, improved consistency, faster onboarding

**Version**: 1.0.0 | **Ratified**: 2025-01-08 | **Last Amended**: 2025-01-08
