# Gemini Project Context & Guidelines

## 1. Project Overview
**Name:** TMA Admin Mobile
**Type:** Expo/React Native mobile application
**Purpose:** Admin application for TMA, featuring a friendly, Duolingo-inspired UI.
**Architecture:** Expo SDK 54 (New Architecture enabled), TypeScript, Zustand, React Hook Form.

## 2. Tech Stack

### Core
- **Runtime:** Expo SDK 54.0.7 (React Native 0.81.4)
- **Framework:** React 19.1.0
- **Language:** TypeScript 5.9.2 (Strict Mode)
- **Navigation:** Expo Router 6.0.4
- **State Management:** Zustand 5.0.8 (Global), React Query (if applicable, otherwise just Axios + Zustand)
- **Forms:** React Hook Form 7.62.0
- **HTTP Client:** Axios 1.12.2

### UI & UX
- **Styling:** StyleSheet with Dynamic Theme Colors (Custom implementation)
- **Animations:** React Native Reanimated 4.1.0
- **Fonts:** Manrope (via `expo-font`)
- **Dates:** date-fns 4.1.0

### Infrastructure
- **Offline:** AsyncStorage (via Zustand persist)
- **Audit:** Node.js 20+ custom scripts

## 3. Project Structure
```
/
├── app/                 # Expo Router screens & layouts
│   ├── (tabs)/          # Tab navigation
│   ├── _layout.tsx      # Root layout
│   └── ...              # Screens
├── components/          # UI Components
│   ├── ui/              # Generic reusable atoms (Button, Card, Input)
│   ├── features/        # Domain-specific components
│   └── ...
├── config/              # Configuration (Env, Navigation)
├── constants/           # Static constants (Colors, Theme)
├── hooks/               # Custom Hooks (useThemeColors, etc.)
├── services/            # Business logic & API calls
├── store/               # Zustand stores
├── types/               # TypeScript definitions
└── utils/               # Helper functions
```

## 4. Core Development Principles (The Constitution)

### I. Design System Adherence
*   **Dynamic Theming:** EVERY component **MUST** use `useThemeColors()`.
    *   **NEVER** hardcode hex values (e.g., `#FFFFFF`) in styles.
    *   **NEVER** use `useColorScheme` directly with static palettes.
    *   **ALWAYS** use `useMemo` for styles: `const styles = useMemo(() => createStyles(palette), [palette]);`
*   **Style:** Follow the Duolingo-inspired "Friendly & Professional" system (Rounded corners, soft shadows, warm colors).
*   **Typography:** Use `Manrope` font family constants.

### II. Type Safety
*   **Strict Mode:** Must remain enabled.
*   **No `any`:** Avoid `any` completely. Define interfaces for all Props, API responses, and Store states.
*   **Validation:** Use schema validation for all forms.

### III. Component Architecture
*   **Hooks Rules:** NEVER call hooks inside loops, conditions, or nested functions. Extract components if necessary.
*   **Text Rules:** ALL text must be wrapped in `<Text>` components. Handle undefined/null gracefully (`{value || ''}`).
*   **Extraction:** Extract complex logic or large render trees (>200 lines) into separate components/hooks.

### IV. Performance
*   **Lists:** Use `FlatList` with `keyExtractor` and `getItemLayout` (where possible). Memoize list items (`React.memo`).
*   **Images:** Explicitly size images.
*   **Memoization:** Use `useMemo` and `useCallback` to prevent unnecessary re-renders, especially for style creation and event handlers.

## 5. Design System Details

### Philosophy
*   **Friendly & Professional:** Warm, vibrant colors but professional execution.
*   **Clarity:** Clear progress indicators, status badges, and feedback.
*   **Delight:** Subtle, smooth animations (Reanimated) for interactions.

### Palette (Dynamic)
Accessed via `useThemeColors()` hook.
*   **Primary:** TMA Orange (`#FF8133`)
*   **Status:** Success (Green), Warning (Yellow), Error (Red), Info (Blue)
*   **Backgrounds:** Primary/Secondary/Tertiary variants for depth.

### Typography
*   **Font:** Manrope
*   **Weights:** Regular (400), Medium (500), SemiBold (600), Bold (700)

### Key Components
*   **Buttons:** Large touch targets (min 48px), rounded (12-16px), clear states.
*   **Cards:** Elevated, Filled, or Outlined. Soft shadows.
*   **Inputs:** Clear labels, error states, focus animations.

## 6. Coding Patterns

### Theme Implementation (Mandatory)
```typescript
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { StyleSheet, View, Text } from 'react-native';
import React, { useMemo } from 'react';

export default function MyComponent() {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Content</Text>
    </View>
  );
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: palette.background, // Dynamic
    padding: 16,
  },
  text: {
    color: palette.text, // Dynamic
  },
});
```

### React Hooks (Correct Usage)
```typescript
// ✅ CORRECT
const MyComponent = ({ items }) => {
  return (
    <View>
      {items.map(item => <ItemComponent key={item.id} item={item} />)}
    </View>
  );
};

const ItemComponent = ({ item }) => {
  const sv = useSharedValue(0); // OK: Top level of component
  return <AnimatedView ... />;
};

// ❌ WRONG
const MyComponent = ({ items }) => {
  return (
    <View>
      {items.map(item => {
        const sv = useSharedValue(0); // ERROR: Hook in loop
        return <AnimatedView ... />;
      })}
    </View>
  );
};
```

### State Management (Zustand)
```typescript
import { create } from 'zustand';

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
```

## 7. Development Workflow

### Commands
*   `npm start`: Start development server.
*   `npm run ios` / `android`: Run on simulator/emulator.
*   `npm run typecheck`: Run TypeScript compiler checks.

### Pre-Commit Checklist
1.  **Typecheck:** `npm run typecheck` passes (0 errors).
2.  **Theme Check:** No hardcoded colors or direct `useColorScheme` usage in components.
3.  **Hooks Check:** No hooks in loops/conditionals.
4.  **Text Check:** No bare strings; all text in `<Text>`.
5.  **Functionality:** Tested on at least one platform (iOS/Android).

## 8. Directory & File Naming
*   **Files:** kebab-case (`club-form.tsx`).
*   **Components:** PascalCase (`ClubForm`).
*   **Stores:** camelCase (`clubStore.ts`).
*   **Hooks:** camelCase (`useThemeColors.ts`).
