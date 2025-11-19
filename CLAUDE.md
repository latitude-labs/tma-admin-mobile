# Development Guidelines for TMA Admin Mobile

## Project Overview
This is an Expo/React Native mobile application for TMA Admin using Expo SDK 54. The app follows modern best practices and incorporates a friendly, Duolingo-inspired UI design system.

## Current Stack & Dependencies

### Core Technologies
- **Expo SDK**: 54.0.7 (React Native 0.81.4)
- **React**: 19.1.0
- **TypeScript**: 5.9.2
- **Navigation**: Expo Router 6.0.4 with React Navigation (Drawer)
- **State Management**: Zustand 5.0.8
- **Forms**: React Hook Form 7.62.0
- **HTTP Client**: Axios 1.12.2
- **Animations**: React Native Reanimated 4.1.0
- **Date Handling**: date-fns 4.1.0

### Project Configuration
- **New Architecture**: Enabled (`newArchEnabled: true` in app.json)
- **TypeScript**: Strict mode enabled
- **Path Alias**: `@/*` maps to project root

## Development Commands
```bash
# Start development server
npm start

# Platform-specific starts
npm run ios      # iOS simulator
npm run android  # Android emulator
npm run web      # Web browser

# Testing & Quality (add these scripts to package.json when needed)
npm run typecheck  # TypeScript checking
npm run lint       # ESLint checking
```

## Project Structure
```
app/
  (drawer)/          # Drawer navigation screens
  _layout.tsx        # Root layout with navigation setup
  login.tsx          # Auth screens
  *.tsx              # Other top-level screens
components/
  ui/                # Reusable UI components (Button, Card, Input, etc.)
  features/          # Feature-specific components
constants/
  Colors.ts          # Color palette
  Theme.ts           # Theme configuration
  Layout.ts          # Layout constants
hooks/               # Custom React hooks
services/            # API services and external integrations
utils/               # Utility functions
assets/
  images/            # App icons and images
  fonts/             # Custom fonts (Manrope)
```

## Duolingo-Inspired Design System

### Core Design Principles

#### 1. Friendly & Professional
- Use warm, vibrant colors that feel approachable
- Rounded corners and soft edges for visual comfort
- Smooth, delightful micro-animations
- Clear, helpful feedback messages

#### 2. Visual Clarity & Delight
- Clean progress indicators for task tracking
- Status badges for quick information scanning
- Subtle success animations (not game-like)
- Visual feedback that's helpful, not playful

#### 3. Color Palette (Aligned with Current Setup)
```typescript
// From constants/Colors.ts
const colors = {
  // Primary brand color
  primary: '#FF8133',         // TMA Orange

  // Status colors (friendly tones)
  success: '#4CAF50',         // Green
  warning: '#FFC107',         // Yellow
  error: '#F44336',           // Red
  info: '#2196F3',            // Blue

  // Neutrals
  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5F5',
    tertiary: '#E8E8E8',
  },
  text: {
    primary: '#2C2C2C',
    secondary: '#666666',
    tertiary: '#999999',
    inverse: '#FFFFFF',
  },
  border: {
    default: '#E0E0E0',
    light: '#F0F0F0',
    dark: '#CCCCCC',
  },
};
```

#### 4. Typography
```typescript
// Using Manrope font family (already installed)
const typography = {
  fontFamily: {
    regular: 'Manrope_400Regular',
    medium: 'Manrope_500Medium',
    semiBold: 'Manrope_600SemiBold',
    bold: 'Manrope_700Bold',
  },
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    '2xl': 32,
  },
};
```

#### 5. Component Patterns

**Buttons** (from components/ui/Button)
- Large touch targets (min 48px height)
- Rounded corners (12-16px radius)
- Clear visual states (primary, secondary, outline, text)
- Loading and disabled states
- Haptic feedback on press

**Cards** (from components/ui/Card)
- Three variants: elevated, filled, outlined
- Soft shadows for depth
- Consistent padding (16px)
- Rounded corners for friendliness

**Input Fields** (from components/ui/Input)
- Clear labels and placeholders
- Error states with helpful messages
- Focus animations
- Icon support

**Chips & Badges** (from components/ui/Chip, Badge)
- Selectable chips for filters
- Status badges with colors
- Smooth selection animations

### Animation Guidelines

Using React Native Reanimated 4.1.0 for subtle, professional animations:

```typescript
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';

// Gentle scale animation for feedback
const gentle = withSpring(value, {
  damping: 20,
  stiffness: 100,
});

// Smooth transitions for professional feel
const smooth = withTiming(value, {
  duration: 300,
  easing: Easing.inOut(Easing.ease),
});
```

### Navigation Pattern

Using Expo Router with drawer navigation:
- Clear navigation hierarchy
- Visual breadcrumbs where needed
- Smooth transitions between screens
- Gesture support for drawer

### Admin Section

The admin section of the more tab will contain pages that are more data-heavy, sometimes featuring charts and graphs. The style of this should closely match the rest of the app, but be more functional, and more in the style of a modern banking app like the Starling Bank app.

## API Integration

```typescript
// Using Axios with environment variables
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
});

// Add request/response interceptors for auth
api.interceptors.request.use((config) => {
  // Add auth token
  return config;
});
```

## State Management with Zustand

```typescript
import { create } from 'zustand';

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
}

const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
```

## Form Handling with React Hook Form

```typescript
import { useForm, Controller } from 'react-hook-form';
import { Input } from '@/components/ui';

const MyForm = () => {
  const { control, handleSubmit } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  return (
    <Controller
      control={control}
      name="email"
      rules={{ required: true }}
      render={({ field, fieldState }) => (
        <Input
          {...field}
          placeholder="Email"
          error={fieldState.error?.message}
        />
      )}
    />
  );
};
```

## Environment Variables

Store configuration in `.env`:
```
EXPO_PUBLIC_API_URL=https://api.example.com
EXPO_PUBLIC_APP_NAME=TMA Admin
```

## React Hooks Rules

### CRITICAL: Never Use Hooks Inside Render Functions or Loops
1. **Hooks must be called at the top level** - Never use hooks inside map(), conditional logic, or nested functions
2. **Extract components for repeated elements** - Create separate components instead of using hooks in render functions
3. **Common mistake to avoid:**
   ```typescript
   // ❌ WRONG - Hooks inside map() will cause "Rendered more hooks than during the previous render" error
   const MyComponent = () => {
     return (
       <View>
         {items.map((item) => {
           const animatedValue = useSharedValue(0); // ERROR!
           return <AnimatedView />;
         })}
       </View>
     );
   };

   // ✅ CORRECT - Extract to separate component
   const ItemComponent = ({ item }) => {
     const animatedValue = useSharedValue(0); // OK - at component top level
     return <AnimatedView />;
   };

   const MyComponent = () => {
     return (
       <View>
         {items.map((item) => (
           <ItemComponent key={item.id} item={item} />
         ))}
       </View>
     );
   };
   ```

4. **State in render functions** - Never use useState inside render functions
   ```typescript
   // ❌ WRONG - useState inside render function
   const renderModal = () => {
     const [selected, setSelected] = useState(''); // ERROR!
     return <Modal />;
   };

   // ✅ CORRECT - Move state to parent component
   const MyComponent = () => {
     const [modalSelected, setModalSelected] = useState(''); // OK

     const renderModal = () => {
       return <Modal selected={modalSelected} />;
     };
   };
   ```

## React Native Text Rendering Rules

### CRITICAL: Text Component Requirements
1. **ALL text must be wrapped in `<Text>` components** - React Native does NOT allow bare text strings
2. **Handle undefined/null values** - Always use fallbacks: `{value || ''}` instead of `{value}`
3. **No text outside Text components** - Even whitespace or line breaks between components can cause errors
4. **NEVER use && for conditional rendering** - Always use ternary operator with explicit null
5. **Common mistakes to avoid:**
   ```typescript
   // ❌ WRONG - undefined will cause "Text strings must be rendered within a <Text> component" error
   <Text>{user?.name}</Text>

   // ✅ CORRECT - Always provide fallback for potentially undefined values
   <Text>{user?.name || ''}</Text>

   // ❌ WRONG - Conditional rendering that might return undefined
   <Text>{isAdmin && 'Admin'}</Text>

   // ✅ CORRECT - Ensure falsy values return null or empty string
   <Text>{isAdmin ? 'Admin' : ''}</Text>

   // ❌ WRONG - && operator can render false/undefined
   {user?.is_admin && <AdminBadge />}

   // ✅ CORRECT - Ternary with explicit null
   {user?.is_admin ? <AdminBadge /> : null}
   ```

## CRITICAL: Theme Color Implementation

### ⚠️ ALWAYS Use Dynamic Theme Colors - Never Static Colors

**This is mandatory for dark mode support.** Every component MUST use the `useThemeColors` hook and dynamic styles.

#### ❌ WRONG - Static colors break dark mode:
```typescript
// NEVER do this - breaks dark mode
import ColorPalette from '@/constants/Colors';
import { useColorScheme } from 'react-native';

const colorScheme = useColorScheme();
const colors = ColorPalette[colorScheme ?? 'light'];
```

#### ✅ CORRECT - Dynamic theme colors:
```typescript
// ALWAYS do this for proper dark mode support
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import React, { useMemo } from 'react';

export default function MyComponent() {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  // Use palette.background, palette.textPrimary, etc.
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: palette.background, // Dynamic color
    // NEVER use: backgroundColor: '#FFFFFF' or ColorPalette.light.background
  },
});
```

#### Key Rules:
1. **ALWAYS** use `useThemeColors()` hook in components
2. **ALWAYS** pass palette to `createStyles` function
3. **NEVER** hardcode hex colors like `#FFFFFF` or `#000000`
4. **NEVER** use `useColorScheme` with `ColorPalette` directly
5. **ALWAYS** use `useMemo` to optimize style recreation
6. **Theme.colors** is OK for static theme constants (primary, success, error)
7. **palette** should be used for colors that change with theme (background, text, borders)

## Best Practices for 2025

### Performance
1. **New Architecture**: Already enabled for better performance
2. **Image Optimization**: Use appropriate image sizes and formats
3. **List Performance**: Use FlatList with proper optimization props
4. **Memoization**: Use React.memo, useMemo, and useCallback appropriately

### Code Quality
1. **TypeScript**: Strict mode for type safety
2. **Component Structure**: Keep components small and focused
3. **Custom Hooks**: Extract complex logic into reusable hooks
4. **Error Boundaries**: Implement error boundaries for graceful error handling

### Accessibility
1. **Touch Targets**: Minimum 44x44 points
2. **Labels**: Use accessibilityLabel for screen readers
3. **Contrast**: Ensure sufficient color contrast
4. **Keyboard Navigation**: Support keyboard navigation where applicable

### Security
1. **Sensitive Data**: Never commit sensitive data
2. **API Keys**: Use environment variables
3. **HTTPS**: Always use secure connections
4. **Input Validation**: Validate all user inputs

## Testing Checklist

Before pushing changes:
- [ ] TypeScript compiles without errors
- [ ] No console errors or warnings
- [ ] Tested on iOS simulator
- [ ] Tested on Android emulator
- [ ] Animations run at 60 FPS
- [ ] Forms validate correctly
- [ ] API calls handle errors gracefully

## Deployment Notes

### iOS Build Requirements
- Xcode 16+ (for iOS 18 SDK)
- iOS deployment target: 15.0+
- Required from April 24, 2025: iOS 18 SDK

### Android Build
- Adaptive icon configured
- Edge-to-edge enabled
- Predictive back gesture disabled

## UI Component Examples

### Feedback Animation (Subtle & Professional)
```typescript
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue
} from 'react-native-reanimated';

const FeedbackCard = ({ type = 'success' }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    translateY.value = withTiming(0, { duration: 300 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      {/* Feedback content - informative, not game-like */}
    </Animated.View>
  );
};
```

### Progress Indicator
```typescript
import { View, Text } from 'react-native';
import { Colors } from '@/constants/Colors';

const ProgressBar = ({ progress, total }) => {
  const percentage = (progress / total) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${percentage}%` }
          ]}
        />
      </View>
      <Text style={styles.progressText}>
        {progress}/{total}
      </Text>
    </View>
  );
};
```

## Resources
- [Expo Documentation](https://docs.expo.dev)
- [React Native Documentation](https://reactnative.dev)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [React Hook Form](https://react-hook-form.com/)
- [Zustand](https://github.com/pmndrs/zustand)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)

---

*Remember: Create a professional yet delightful experience that coaches and managers find intuitive and pleasant to use. Focus on clarity, efficiency, and visual appeal without gamification.*

Don't start the dev server yourself, leave this to the user.

## Active Technologies
- TypeScript 5.9.2 / Node.js 20+ (audit tool implementation) + TypeScript Compiler API (ts-morph or @typescript-eslint/parser), Glob for file discovery, Markdown generation library (001-constitution-compliance-audit)
- File system for audit reports (JSON + Markdown), historical data in specs/001-constitution-compliance-audit/audit-history/ (001-constitution-compliance-audit)
- TypeScript 5.9.2 (strict mode enabled) / React Native 0.81.4 + Expo SDK 54.0.7, Expo Router 6.0.4, React 19.1.0, Zustand 5.0.8, React Hook Form 7.62.0, Axios 1.12.2, React Native Reanimated 4.1.0 (002-trial-bookings-management)
- AsyncStorage (via Zustand persist middleware for offline bookings cache) (002-trial-bookings-management)

## Recent Changes
- 001-constitution-compliance-audit: Added TypeScript 5.9.2 / Node.js 20+ (audit tool implementation) + TypeScript Compiler API (ts-morph or @typescript-eslint/parser), Glob for file discovery, Markdown generation library
