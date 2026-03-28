# Liquid Glass Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the TMA Admin Mobile app to use Apple's iOS 26 liquid glass design language with translucent surfaces, SF Pro typography, evolved 3D buttons, and warm gradient backgrounds.

**Architecture:** Bottom-up approach — update the theme foundation first (colors, typography, shadows), then glass-ify the core UI component library, then update layouts/screens that consume those components. The SDK 55 upgrade happens first since all glass work depends on it.

**Tech Stack:** Expo SDK 55, React Native 0.82+, `expo-glass-effect` (with `@callstack/liquid-glass` as fallback), SF Pro (system font), React Native Reanimated 4.x

**Spec:** `docs/superpowers/specs/2026-03-25-liquid-glass-redesign-design.md`

---

## File Structure

### Theme & Constants (modified)
- `constants/Colors.ts` — Revised color palette: warm background gradients, simplified borders, dark mode refinements
- `constants/Theme.ts` — SF Pro typography, simplified shadow scale (subtle/elevated), border radius xl: 20
- `hooks/useThemeColors.ts` — Add gradient tokens, remove per-level shadow tokens, add softShadow

### UI Components (modified)
- `components/ui/Button.tsx` — 2px lip, translucent face, adjusted spring physics
- `components/ui/Card.tsx` — GlassView integration, remove outlined variant, radius 20px
- `components/ui/Input.tsx` — 1px border, translucent bg, focus glow via shadow wrapper
- `components/ui/Toast.tsx` — GlassView body, remove shadow
- `components/ui/Badge.tsx` — Glass backing with status tint
- `components/ui/Chip.tsx` — Glass selected state, 200ms transition
- `components/ui/IconBox.tsx` — Glow default, glass filled variant
- `components/ui/Skeleton.tsx` — Fix useThemeColors violation, glass-aware shimmer
- `components/ui/Dropdown.tsx` — Fix useThemeColors violation, glass styling
- `components/ui/ScreenHeader.tsx` — Evaluate for native nav bar replacement
- `components/ui/MapView.tsx` — Fix Manrope and shadow references
- `components/ui/NotificationBadge.tsx` — Fix Manrope references
- `components/ui/NotificationItem.tsx` — Fix Manrope references
- `components/ui/SwipeableNotificationItem.tsx` — Fix Manrope references

### UI Components (created)
- `components/ui/GlassView.tsx` — Wrapper for glass effect package (GlassView + GlassContainer)

### Dashboard Components (modified)
- `components/dashboard/AdminDashboard.tsx` — Warm gradient background
- `components/dashboard/admin/DashboardHeader.tsx` — Glass nav integration
- `components/dashboard/admin/StatCard.tsx` — GlassView + color tint
- `components/dashboard/admin/StatsGrid.tsx` — GlassContainer grouping

### Navigation (modified)
- `app/_layout.tsx` — Remove Manrope font loading, SDK 55 navigation config
- `app/(tabs)/_layout.tsx` — Native tab bar with glass, remove custom BlurView tab bar

### Screens (modified)
- `app/(tabs)/more.tsx` — Grouped glass panels (structural change from individual cards)
- `app/(tabs)/clubs.tsx` — Glass cards, updated entrance animations
- `app/(tabs)/trials.tsx` — Glass cards
- `app/(tabs)/reminders.tsx` — Glass cards
- `app/(tabs)/dashboard.tsx` — Gradient background
- All detail/form screens — Glass panels, native sheet presentations

### Configuration (modified)
- `package.json` — SDK 55 deps, remove Manrope, add glass package
- `app.json` — SDK 55 config

---

## Task 1: Expo SDK 55 Upgrade

**Files:**
- Modify: `package.json`
- Modify: `app.json`

This is the foundation everything else depends on. Must be done first.

- [ ] **Step 1: Run the SDK upgrade command**

```bash
npx expo install expo@latest --fix
```

This upgrades Expo SDK and fixes all Expo package versions to be compatible. Review the output for any breaking changes.

- [ ] **Step 2: Verify app.json is updated**

Check that `app.json` reflects SDK 55. The `expo.sdkVersion` field should read `"55.0.0"` or similar. If not present, Expo infers from the installed package.

- [ ] **Step 3: Install the glass effect package**

```bash
npx expo install expo-glass-effect
```

If `expo-glass-effect` is not available, fall back to:
```bash
npm install @callstack/liquid-glass
```

If neither exists yet, skip this step and create a placeholder wrapper module in Task 2 that exports a `GlassView` component wrapping `expo-blur` BlurView temporarily.

- [ ] **Step 4: Verify the app compiles**

Have the user run `npm start` and verify the app launches without errors on iOS simulator (Xcode 26 / iOS 26).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app.json
git commit -m "chore: upgrade to Expo SDK 55 and install glass effect package"
```

---

## Task 2: Theme Foundation — Colors & Shadows

**Files:**
- Modify: `constants/Colors.ts`
- Modify: `constants/Theme.ts`
- Modify: `hooks/useThemeColors.ts`

Update the theme system to support the glass design language before touching any components.

- [ ] **Step 1: Update Colors.ts — light mode backgrounds**

Change the light theme background values:
```typescript
background: {
  primary: '#FFFFFF',
  secondary: '#FAFAFA',  // was #F5F5F5 — cleaner canvas for glass
  tertiary: '#F0F0F0',   // was #E8E8E8 — lighter
},
```

Add gradient background tokens:
```typescript
gradient: {
  start: '#FFFFFF',
  end: '#FFF8F2',  // whisper of TMA orange warmth
},
```

- [ ] **Step 2: Update Colors.ts — dark mode backgrounds and gradients**

```typescript
// Dark theme
background: {
  primary: '#141210',   // was #1A1A1A — warm near-black
  secondary: '#1E1C1A', // was #252525
  tertiary: '#2A2826',  // was #303030
},
gradient: {
  start: '#141210',
  end: '#1A1510',  // subtle warmth
},
```

Dark text:
```typescript
text: {
  primary: '#F5F5F5',   // was #FFFFFF — easier on eyes
  secondary: '#A0A0A0', // was #B3B3B3
  tertiary: '#707070',  // was #808080
},
```

Dark borders (lighter touch):
```typescript
border: {
  default: 'rgba(255, 255, 255, 0.08)',  // was #404040
  light: 'rgba(255, 255, 255, 0.04)',     // was #333333
  dark: 'rgba(255, 255, 255, 0.12)',      // was #505050
},
```

- [ ] **Step 3: Update Theme.ts — typography to SF Pro**

Replace all Manrope font references with system font:
```typescript
fonts: {
  regular: 'System',
  medium: 'System',
  semiBold: 'System',
  bold: 'System',
},
```

Update `fontWeights` to use numeric values that SF Pro respects:
```typescript
fontWeights: {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
},
```

Remove any references to ExtraLight (200), Light (300), ExtraBold (800) weights.

- [ ] **Step 4: Update Theme.ts — simplified shadow scale**

Replace the current 4-tier shadow system with 2 tiers:

```typescript
shadows: {
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
},
```

Update `getThemeShadows()` to return only `subtle` and `elevated` keys. Dark mode versions:
```typescript
// Dark
subtle: { ...base, shadowOpacity: 0.15 },
elevated: { ...base, shadowOpacity: 0.3 },
```

- [ ] **Step 5: Update Theme.ts — border radius**

```typescript
borderRadius: {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,    // was 24 — slightly tighter for glass panels
  full: 999,
},
```

- [ ] **Step 6: Update useThemeColors.ts — add gradient tokens**

Extend the `ThemeColors` type and the hook return value to include:
```typescript
backgroundGradientStart: string;
backgroundGradientEnd: string;
softShadow: {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};
```

Map these from the new `gradient` and shadow values in the color palette.

- [ ] **Step 7: Global shadow reference migration**

The shadow scale change from `sm/md/lg/xl` to `subtle/elevated` will break ~19 files. Do a global find-and-replace now to keep the build compilable:

```bash
# Find all shadow references
grep -rn "shadows\.sm\|shadows\.md\|shadows\.lg\|shadows\.xl\|getThemeShadows" --include="*.tsx" --include="*.ts" .
```

Migration rules:
- `shadows.sm` → `shadows.subtle`
- `shadows.md` → `shadows.subtle`
- `shadows.lg` → `shadows.elevated`
- `shadows.xl` → `shadows.elevated`
- Update `getThemeShadows()` callers to use the new return shape

Apply these changes across ALL files that reference the old shadow tokens. This includes UI components, screen files, feature components, and any other consumers.

- [ ] **Step 8: Global Manrope font string migration**

Replace all direct Manrope font name string references across the codebase:

```bash
grep -rn "Manrope" --include="*.tsx" --include="*.ts" .
```

Known files beyond `_layout.tsx` and `Theme.ts` that reference Manrope directly:
- `app/notification-settings.tsx`
- `components/ui/MapView.tsx`
- `components/ui/NotificationBadge.tsx`
- `components/ui/NotificationItem.tsx`
- `components/ui/SwipeableNotificationItem.tsx`
- `app/notifications.tsx`
- `components/TechnicalDifficultiesScreen.tsx`

For each: replace `fontFamily: 'Manrope_*'` with `fontFamily: 'System'` and add the appropriate `fontWeight` ('400', '500', '600', '700'). Map Manrope weights: Regular→400, Medium→500, SemiBold→600, Bold→700.

Note: On iOS, you can also omit `fontFamily` entirely and just set `fontWeight` — this will use SF Pro automatically. Either approach works.

- [ ] **Step 9: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

The build should now compile cleanly with the new shadow and font references.

- [ ] **Step 10: Commit**

```bash
git add constants/Colors.ts constants/Theme.ts hooks/useThemeColors.ts
git add -A  # include all files touched by global migration
git commit -m "feat: update theme foundation for liquid glass — colors, SF Pro, simplified shadows, global migration"
```

---

## Task 3: Root Layout — Remove Manrope Font Loading

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `package.json` (uninstall Manrope)

Note: The global Manrope string reference migration was already done in Task 2 Step 8. This task removes the font package and loading infrastructure.

- [ ] **Step 1: Remove Manrope imports and font loading from _layout.tsx**

Remove lines 1-9 (Manrope imports) and lines 12, 42-51 (useFonts with Manrope).

The `useFonts` call should only load FontAwesome if it's still needed:
```typescript
const [loaded, error] = useFonts({
  ...FontAwesome.font,
});
```

If FontAwesome icons are used nowhere (check — the app uses Ionicons from `@expo/vector-icons`), remove the entire `useFonts` block and the `expo-font` import. In that case, call `SplashScreen.hideAsync()` directly in a useEffect on mount.

- [ ] **Step 2: Uninstall Manrope package**

```bash
npm uninstall @expo-google-fonts/manrope
```

- [ ] **Step 3: Verify the app still loads**

Have the user run `npm start`. Text should now render in SF Pro (the iOS system font). Verify there are no "font not found" warnings.

- [ ] **Step 4: Commit**

```bash
git add app/_layout.tsx package.json package-lock.json
git commit -m "feat: remove Manrope font, switch to SF Pro system font"
```

---

## Task 4: GlassView Wrapper Component

**Files:**
- Create: `components/ui/GlassView.tsx`
- Modify: `components/ui/index.ts`

Create a reusable glass wrapper that abstracts the glass package. This gives us a single place to swap implementations later.

- [ ] **Step 1: Create GlassView.tsx**

If `expo-glass-effect` is installed:
```typescript
import { GlassView as ExpoGlassView } from 'expo-glass-effect';
import React from 'react';
import { Platform, StyleProp, View, ViewStyle } from 'react-native';

interface GlassViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Glass intensity: 'light' for subtle, 'regular' for standard, 'prominent' for heavy */
  intensity?: 'light' | 'regular' | 'prominent';
  /** Optional tint color applied to the glass */
  tintColor?: string;
}

export function GlassView({ children, style, intensity = 'regular', tintColor }: GlassViewProps) {
  if (Platform.OS !== 'ios') {
    return <View style={style}>{children}</View>;
  }

  return (
    <ExpoGlassView
      style={style}
      glassEffect={intensity}
      tintColor={tintColor}
    >
      {children}
    </ExpoGlassView>
  );
}
```

If `expo-glass-effect` is NOT available, use `expo-blur` as a temporary stand-in:
```typescript
import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleProp, View, ViewStyle } from 'react-native';

interface GlassViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: 'light' | 'regular' | 'prominent';
  tintColor?: string;
}

const INTENSITY_MAP = {
  light: 40,
  regular: 60,
  prominent: 80,
};

export function GlassView({ children, style, intensity = 'regular', tintColor }: GlassViewProps) {
  if (Platform.OS !== 'ios') {
    return <View style={style}>{children}</View>;
  }

  return (
    <BlurView
      intensity={INTENSITY_MAP[intensity]}
      tint="default"
      style={[{ overflow: 'hidden' }, style]}
    >
      {tintColor ? (
        <View style={{ flex: 1, backgroundColor: tintColor }}>
          {children}
        </View>
      ) : (
        children
      )}
    </BlurView>
  );
}
```

Adapt the exact API to match whichever package was installed in Task 1. The key contract is: `GlassView` accepts `children`, `style`, `intensity`, and optional `tintColor`. On Android, it renders a plain `View`.

Also create a `GlassContainer` wrapper in the same file (or as a separate export). If `expo-glass-effect` provides `GlassContainer` natively, wrap it. Otherwise, implement it as a `GlassView` with grouped children and hairline dividers:

```typescript
interface GlassContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Show hairline dividers between children */
  dividers?: boolean;
}

export function GlassContainer({ children, style, dividers = true }: GlassContainerProps) {
  const childArray = React.Children.toArray(children);
  return (
    <GlassView style={style} intensity="regular">
      {childArray.map((child, index) => (
        <React.Fragment key={index}>
          {child}
          {dividers && index < childArray.length - 1 ? (
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,0,0,0.1)' }} />
          ) : null}
        </React.Fragment>
      ))}
    </GlassView>
  );
}
```

- [ ] **Step 2: Export from index.ts**

Add to `components/ui/index.ts`:
```typescript
export { GlassView, GlassContainer } from './GlassView';
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/GlassView.tsx components/ui/index.ts
git commit -m "feat: add GlassView wrapper component"
```

---

## Task 5: Card Component — Glass Treatment

**Files:**
- Modify: `components/ui/Card.tsx`

- [ ] **Step 1: Read the current Card.tsx**

Read `components/ui/Card.tsx` to understand the current variant system, props interface, and styling.

- [ ] **Step 2: Update Card to use GlassView**

Replace the Card implementation:
- **Elevated variant** (default): Wrap content in `GlassView` with `intensity="regular"`. Remove the box shadow.
- **Filled variant**: Use `GlassView` with `intensity="prominent"` for more opacity. For data-heavy sections.
- **Remove outlined variant**: Delete the variant option from the type. Any TypeScript errors from consumers will be caught later — they migrate to `"elevated"`.
- **Gradient variant**: Use `GlassView` with `tintColor` set to the gradient color at low opacity. Remove the `LinearGradient` wrapper.

Update border radius to `Theme.borderRadius.xl` (now 20px).

Remove all shadow application from the card. Glass surfaces don't need shadows.

- [ ] **Step 3: Update the Card props type**

```typescript
type CardVariant = 'elevated' | 'filled' | 'gradient';
```

Remove `'outlined'` from the union type.

- [ ] **Step 4: Fix any TypeScript errors**

```bash
npx tsc --noEmit
```

Search for `variant="outlined"` or `variant='outlined'` across the codebase and replace with `variant="elevated"`:
```bash
grep -rn "outlined" --include="*.tsx" --include="*.ts" components/ app/
```

- [ ] **Step 5: Commit**

```bash
git add components/ui/Card.tsx
git commit -m "feat: Card component — glass treatment with GlassView, remove outlined variant"
```

---

## Task 6: Button Component — Evolved 3D

**Files:**
- Modify: `components/ui/Button.tsx`

- [ ] **Step 1: Read the current Button.tsx**

Read `components/ui/Button.tsx` to understand the lip effect implementation, animation setup, and variant system.

- [ ] **Step 2: Reduce lip height from 4px to 2px**

Find the lip height constant (likely `4` in the style calculations) and change to `2`. Update all related calculations: the translateY animation on press should move 2px instead of 4px, and the lip View height should be 2px.

- [ ] **Step 3: Make primary button face translucent**

Change the primary button `backgroundColor` from solid `Theme.colors.primary` to `Theme.colors.primary` with alpha:
```typescript
// Primary face: TMA orange at ~85% opacity
backgroundColor: 'rgba(255, 129, 51, 0.85)',
```

The lip color stays solid (`Theme.colors.primaryDark`).

- [ ] **Step 4: Make secondary button face a light glass surface**

```typescript
// Secondary face: frosted light gray
backgroundColor: Platform.OS === 'ios'
  ? 'rgba(245, 245, 245, 0.7)'  // translucent on iOS
  : palette.backgroundSecondary,  // solid fallback on Android
```

- [ ] **Step 5: Adjust spring physics**

Update the spring config:
```typescript
// Was: damping: 10, stiffness: 200, mass: 0.5
const springConfig = {
  damping: 15,
  stiffness: 180,
  mass: 0.5,
};
```

- [ ] **Step 6: Update font family references**

Replace any `fontFamily: Theme.typography.fonts.bold` or similar Manrope references with:
```typescript
fontFamily: 'System',
fontWeight: '700',  // for bold
```

Do this for all button text styles.

- [ ] **Step 7: Commit**

```bash
git add components/ui/Button.tsx
git commit -m "feat: Button — evolved 3D with 2px lip, translucent face, softer springs"
```

---

## Task 7: Input Component — Glass Treatment

**Files:**
- Modify: `components/ui/Input.tsx`

- [ ] **Step 1: Read the current Input.tsx**

Read `components/ui/Input.tsx` fully.

- [ ] **Step 2: Update border and background**

- Border width: 2px → 1px
- Background: solid white → `rgba(255, 255, 255, 0.9)` in light mode (use palette to derive)
- Border radius stays at `Theme.borderRadius.md` (12px)

- [ ] **Step 3: Add focus glow effect**

Wrap the input container in an outer View. When focused, apply a shadow to the outer View:
```typescript
const focusGlowStyle = isFocused ? {
  shadowColor: Theme.colors.primary,
  shadowOpacity: 0.25,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 0 },
} : {};
```

Apply this to the wrapper View, not the input itself.

- [ ] **Step 4: Update font family**

Replace Manrope references with `'System'` and appropriate `fontWeight`.

- [ ] **Step 5: Commit**

```bash
git add components/ui/Input.tsx
git commit -m "feat: Input — thinner border, translucent bg, focus glow"
```

---

## Task 8: Toast, Badge, Chip, IconBox — Glass Treatment

**Files:**
- Modify: `components/ui/Toast.tsx`
- Modify: `components/ui/Badge.tsx`
- Modify: `components/ui/Chip.tsx`
- Modify: `components/ui/IconBox.tsx`

- [ ] **Step 1: Read all four files**

Read Toast.tsx, Badge.tsx, Chip.tsx, IconBox.tsx.

- [ ] **Step 2: Update Toast.tsx**

- Replace the solid background container with `GlassView`:
  ```typescript
  <GlassView style={styles.container} intensity="regular">
    {/* existing content */}
  </GlassView>
  ```
- Keep the 4px left border with status color
- Remove the icon container's solid background, replace with glass-tinted circle:
  ```typescript
  backgroundColor: statusColor + '20',  // keep the tint, it works on glass
  ```
- Remove the shadow from the toast container (glass provides separation)
- Update font family references to `'System'`

- [ ] **Step 3: Update Badge.tsx**

- Wrap badge content in `GlassView` with `tintColor` matching the status color at low opacity:
  ```typescript
  <GlassView style={styles.badge} intensity="light" tintColor={badgeColor + '30'}>
  ```
- Keep pill shape (`borderRadius: full`)
- Text color: for status badges (success/warning/error/info), keep white/inverse text

- [ ] **Step 4: Update Chip.tsx**

- Selected state: instead of solid primary background, use `GlassView` with orange tint:
  ```typescript
  {selected ? (
    <GlassView style={styles.chip} intensity="light" tintColor={palette.tint + '40'}>
      {content}
    </GlassView>
  ) : (
    <View style={[styles.chip, styles.chipUnselected]}>
      {content}
    </View>
  )}
  ```
- Unselected: keep thin border, no glass (lightweight)

- [ ] **Step 5: Update IconBox.tsx**

- "Glow" variant becomes the default
- "Filled" variant: wrap in `GlassView` with `tintColor`:
  ```typescript
  <GlassView intensity="light" tintColor={color + '20'} style={styles.box}>
  ```
- "Outline" variant: unchanged

- [ ] **Step 6: Update font families in all files**

Replace any Manrope font references with `'System'` and numeric `fontWeight`.

- [ ] **Step 7: Commit**

```bash
git add components/ui/Toast.tsx components/ui/Badge.tsx components/ui/Chip.tsx components/ui/IconBox.tsx
git commit -m "feat: Toast, Badge, Chip, IconBox — glass treatments"
```

---

## Task 9: Fix Theme Violations — Skeleton & Dropdown

**Files:**
- Modify: `components/ui/Skeleton.tsx`
- Modify: `components/ui/Dropdown.tsx`

- [ ] **Step 1: Read both files**

Read Skeleton.tsx and Dropdown.tsx.

- [ ] **Step 2: Fix Skeleton.tsx — replace ColorPalette with useThemeColors**

Replace the direct `ColorPalette` usage with the `useThemeColors()` hook. Update shimmer colors for glass context:
```typescript
// Glass-aware shimmer: subtle white pulse
const shimmerStart = 'rgba(255, 255, 255, 0.15)';
const shimmerEnd = 'rgba(255, 255, 255, 0.3)';
```

Use the palette's border colors as the base background color instead of hardcoded values.

- [ ] **Step 3: Fix Dropdown.tsx — replace ColorPalette with useThemeColors**

Replace all `ColorPalette[colorScheme]` usages with the `palette` from `useThemeColors()`. Update styling to match the glass input treatment from Task 7 (1px border, translucent bg, focus glow).

- [ ] **Step 4: Commit**

```bash
git add components/ui/Skeleton.tsx components/ui/Dropdown.tsx
git commit -m "fix: Skeleton & Dropdown — replace ColorPalette with useThemeColors, glass styling"
```

---

## Task 10: Tab Bar — Native Glass

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

This is a large file (~396 lines) with a custom tab bar. The goal is to replace the custom `BlurView`-based tab bar with SDK 55's native glass tab bar where possible, or update the custom implementation to use the glass design language.

- [ ] **Step 1: Read the current tab layout**

Read `app/(tabs)/_layout.tsx` fully to understand the custom tab bar, center elevated tab, notification badge, and animation setup.

- [ ] **Step 2: Evaluate SDK 55 native tab bar**

Check if Expo Router in SDK 55 supports a native tab bar with automatic glass. If it does, the custom `CustomTabBar` component can be significantly simplified or removed.

If SDK 55 native tabs with glass are available:
- Remove the custom `CustomTabBar` component
- Configure the native tab bar in the `<Tabs>` screenOptions
- The elevated center "Home" tab may need custom styling — check if Expo Router supports per-tab customization

If native glass tabs are NOT yet available in Expo Router:
- Keep the custom tab bar but replace the `BlurView` usage with `GlassView`
- Apply glass styling to both iOS and Android (GlassView handles the platform fallback)

- [ ] **Step 3: Update the tab bar implementation**

Whichever approach from Step 2:
- Replace hardcoded `'#FFFFFF'` (line ~107) with `palette.textInverse`
- Replace direct `ColorPalette` usage with `useThemeColors()`
- Update the center tab's elevated style: glass pill with orange accent when focused
- Remove shadow animations on tab focus (glass doesn't need them)
- Update spring physics to new defaults (damping: 20, stiffness: 150)

- [ ] **Step 4: Update font families**

Replace Manrope references with `'System'`.

- [ ] **Step 5: Verify tab switching works**

Have the user test tab navigation, haptic feedback, and the center tab animation.

- [ ] **Step 6: Commit**

```bash
git add app/(tabs)/_layout.tsx
git commit -m "feat: tab bar — glass treatment, updated springs, fix theme violations"
```

---

## Task 11: Dashboard — Glass Layout

**Files:**
- Modify: `components/dashboard/AdminDashboard.tsx`
- Modify: `components/dashboard/admin/DashboardHeader.tsx`
- Modify: `components/dashboard/admin/StatCard.tsx`
- Modify: `components/dashboard/admin/StatsGrid.tsx`

- [ ] **Step 1: Read all four files**

Read AdminDashboard.tsx, DashboardHeader.tsx, StatCard.tsx, StatsGrid.tsx.

- [ ] **Step 2: Update AdminDashboard.tsx — warm gradient background**

Replace the current `LinearGradient` colors with the palette's gradient tokens:
```typescript
<LinearGradient
  colors={[palette.backgroundGradientStart, palette.backgroundGradientEnd]}
  style={styles.container}
>
```

- [ ] **Step 3: Update DashboardHeader.tsx — glass integration**

- Replace the header's `LinearGradient` background with a `GlassView`
- Sync badge: use `GlassView` with `intensity="light"` instead of the tinted solid background
- Remove explicit shadows from the sync badge
- Update the greeting text and timestamp to use `'System'` font

- [ ] **Step 4: Update StatCard.tsx — glass panels**

- Replace `LinearGradient` with `GlassView`:
  ```typescript
  <GlassView style={styles.card} intensity="regular" tintColor={color + '15'}>
  ```
- Remove the explicit shadow from the card
- Keep the value text (32px bold) at high contrast
- Keep the trend indicator styling as-is
- Update font family references

- [ ] **Step 5: Update StatsGrid.tsx — GlassContainer grouping**

If `expo-glass-effect` provides `GlassContainer`:
- Wrap the stat card grid in `GlassContainer` so adjacent cards share a single glass background with hairline dividers
- This replaces individual glass cards with a unified panel

If `GlassContainer` is not available:
- Keep individual `GlassView` cards but ensure they have consistent spacing (8px gap)
- Add hairline dividers between cards using `borderBottomWidth: StyleSheet.hairlineWidth`

- [ ] **Step 6: Update entrance animations**

Replace `FadeInDown` / `FadeInRight` animations with:
```typescript
// Gentler entrance
opacity: withTiming(1, { duration: 300 }),
transform: [{ translateY: withTiming(0, { duration: 300 }) }],
// Starting from:
opacity: 0,
transform: [{ translateY: 8 }],
```

Reduce stagger delay from 100ms to 60ms.

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/AdminDashboard.tsx components/dashboard/admin/DashboardHeader.tsx components/dashboard/admin/StatCard.tsx components/dashboard/admin/StatsGrid.tsx
git commit -m "feat: dashboard — glass layout with GlassView stat cards and warm gradient"
```

---

## Task 12: More Screen — Grouped Glass Panels

**Files:**
- Modify: `app/(tabs)/more.tsx`

This is the biggest structural change — individual floating cards per menu item become grouped glass panels (like iOS Settings).

- [ ] **Step 1: Read the current more.tsx**

Read `app/(tabs)/more.tsx` fully. Understand the menu structure, sections, and current card-per-item layout.

- [ ] **Step 2: Restructure into grouped glass panels**

Group menu items by section. Each section becomes one `GlassView` panel:

```typescript
<GlassView style={styles.sectionPanel} intensity="regular">
  {sectionItems.map((item, index) => (
    <React.Fragment key={item.key}>
      <TouchableOpacity style={styles.menuRow} onPress={item.onPress}>
        <IconBox icon={item.icon} color={item.color} size="sm" />
        <Text style={styles.menuLabel}>{item.label}</Text>
        <Ionicons name="chevron-forward" size={16} color={palette.textTertiary} />
      </TouchableOpacity>
      {index < sectionItems.length - 1 ? (
        <View style={styles.divider} />
      ) : null}
    </React.Fragment>
  ))}
</GlassView>
```

Section headers sit outside the glass panels as small caption text:
```typescript
<Text style={styles.sectionHeader}>SECTION TITLE</Text>
```

- [ ] **Step 3: Update the screen background**

Add the warm gradient background:
```typescript
<LinearGradient
  colors={[palette.backgroundGradientStart, palette.backgroundGradientEnd]}
  style={styles.container}
>
```

- [ ] **Step 4: Update entrance animations**

Replace individual FadeInRight per item with a simpler fade + translateY per section panel:
- Stagger: 60ms per section (not per item)
- Animation: opacity 0→1, translateY 8→0

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/more.tsx"
git commit -m "feat: More screen — grouped glass panels with section headers"
```

---

## Task 13: Remaining Tab Screens — Glass & Gradient

**Files:**
- Modify: `app/(tabs)/clubs.tsx`
- Modify: `app/(tabs)/trials.tsx`
- Modify: `app/(tabs)/reminders.tsx`
- Modify: `app/(tabs)/dashboard.tsx`

- [ ] **Step 1: Read all four files**

Read clubs.tsx, trials.tsx, reminders.tsx, dashboard.tsx.

- [ ] **Step 2: Add warm gradient backgrounds to each screen**

Each screen gets the warm gradient background:
```typescript
<LinearGradient
  colors={[palette.backgroundGradientStart, palette.backgroundGradientEnd]}
  style={{ flex: 1 }}
>
  {/* existing ScrollView / FlatList content */}
</LinearGradient>
```

- [ ] **Step 3: Update clubs.tsx entrance animations**

Replace FadeInDown with gentler fade + slide:
- Stagger: 60ms per card
- translateY: 8px (not 20px)
- Duration: 300ms

- [ ] **Step 4: Update font family references across all four files**

Replace Manrope references with `'System'` and numeric `fontWeight`.

- [ ] **Step 5: Fix any remaining hardcoded colors**

Search each file for hardcoded hex values (#FFFFFF, #000000, etc.) and replace with palette tokens.

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/clubs.tsx" "app/(tabs)/trials.tsx" "app/(tabs)/reminders.tsx" "app/(tabs)/dashboard.tsx"
git commit -m "feat: tab screens — warm gradient backgrounds, updated animations and fonts"
```

---

## Task 14: Detail & Form Screens — Glass Panels

**Files:**
- Modify: All detail/form screens in `app/` (club-detail, booking-detail, event-detail, facebook-ad-detail, holiday-requests, kit-orders, notification-settings, security-settings, etc.)

This task covers all remaining screens that aren't tab screens.

- [ ] **Step 1: List all remaining screen files**

```bash
ls app/*.tsx | grep -v _layout | grep -v login | grep -v two-factor
```

- [ ] **Step 2: For each screen, apply the standard glass treatment**

For each file:
1. Add warm gradient background (LinearGradient with palette gradient tokens)
2. Replace any hardcoded colors with palette tokens
3. Replace Manrope font references with `'System'`
4. Cards are already glass-ified from Task 5, so most screens just need the background

For modal-style screens (if using custom modal presentation):
- Check if SDK 55 native form sheets can replace custom implementations
- If so, update the Stack.Screen options in `app/_layout.tsx`:
  ```typescript
  <Stack.Screen name="screen-name" options={{ presentation: 'formSheet' }} />
  ```

- [ ] **Step 3: Update ScreenHeader.tsx**

Read `components/ui/ScreenHeader.tsx`. If SDK 55 provides native glass nav bars that can replace this:
- Remove the custom header and use native stack headers with `headerShown: true` and glass styling
- Configure in `app/_layout.tsx` screen options

If native headers can't replace it:
- Add a `GlassView` background to the header
- Update font family to `'System'`

- [ ] **Step 4: Commit**

```bash
git add app/*.tsx components/ui/ScreenHeader.tsx
git commit -m "feat: detail & form screens — glass panels, gradient backgrounds, native headers"
```

---

## Task 15: EOD Wizard — Glass Treatment

**Files:**
- Modify: `components/eod-wizard/SelectClubStep.tsx`
- Modify: `components/eod-wizard/ReviewStep.tsx`
- Modify: `components/eod-wizard/HelperCheckupsStep.tsx`
- Modify: `components/eod-wizard/AdditionalInfoStep.tsx`
- Modify: `components/eod-wizard/AttendanceStep.tsx`
- Modify: `components/eod-wizard/FinancialStep.tsx`
- Modify: `components/eod-wizard/NewSignupsStep.tsx`
- Modify: `components/eod-wizard/ReturningSignupsStep.tsx`
- Modify: `components/eod-wizard/TrialsStep.tsx`
- Modify: `components/eod-wizard/NumberInput.tsx`
- Modify: `components/eod-wizard/WizardProgress.tsx` (structural change — move into glass nav bar area)
- Modify: `app/eod-wizard.tsx` (if exists)

- [ ] **Step 1: Read the wizard host and all step files**

Read the main wizard screen and each step component.

- [ ] **Step 2: Update the wizard host**

- Add warm gradient background
- Back/Next buttons: these are already updated from Task 6 (Button glass treatment)

- [ ] **Step 2b: Update WizardProgress.tsx — structural change**

Per the spec, the step progress bar should sit in the glass nav bar area rather than in the content area. Read `WizardProgress.tsx` and restructure:
- Move the progress indicator into the navigation header area (either as part of a glass nav bar or overlaid on it)
- If using native navigation headers, consider placing the progress bar as a `headerTitle` custom component
- The progress bar itself should be slim (4px height) and sit cleanly within the glass chrome

- [ ] **Step 3: Update step components**

For each step component:
- Form sections that use `Card` are already glass-ified from Task 5
- Replace any direct color references with palette tokens
- Replace Manrope font references with `'System'`
- Any `LinearGradient` usage for tinted sections → use `GlassView` with `tintColor`

- [ ] **Step 4: Commit**

```bash
git add components/eod-wizard/*.tsx app/eod-wizard.tsx
git commit -m "feat: EOD wizard — glass panels for form sections"
```

---

## Task 16: Remaining Components — Coach Dashboard, Calendar, Club Health

**Files:**
- Modify: `components/dashboard/CoachDashboard.tsx`
- Modify: `components/dashboard/coach/*.tsx` (CoachHeader, ClassCard, CoachClassesList, DashboardLoading)
- Modify: `components/calendar/*.tsx`
- Modify: `components/club-health/*.tsx`
- Modify: `components/coaches/*.tsx`

- [ ] **Step 1: Read and audit all remaining component directories**

For each component directory, read the files and note what needs updating.

- [ ] **Step 2: Apply the standard glass treatment to each component**

For each file:
1. Replace `LinearGradient` backgrounds with `GlassView` or palette gradient tokens
2. Cards already inherit glass from Task 5
3. Replace hardcoded colors with palette tokens
4. Replace Manrope fonts with `'System'`
5. Remove explicit shadows where glass provides depth
6. Update any remaining `ColorPalette` direct usage to `useThemeColors()`

- [ ] **Step 3: Update DashboardLoading components**

Both admin and coach loading screens use Skeleton components. Ensure skeletons render correctly inside glass panels (updated in Task 9).

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/ components/calendar/ components/club-health/ components/coaches/
git commit -m "feat: remaining components — glass treatment across coach dashboard, calendar, club health"
```

---

## Task 17: LoadingScreen & Auth Components

**Files:**
- Modify: `components/LoadingScreen.tsx`
- Modify: `components/auth/BiometricPrompt.tsx` (if exists)
- Modify: `components/auth/OTPInput.tsx` (if exists)
- Modify: `app/login.tsx`

- [ ] **Step 1: Read all files**

- [ ] **Step 2: Update LoadingScreen.tsx**

Replace static colors with `useThemeColors()`:
```typescript
const palette = useThemeColors();
// Use palette.background, palette.tint for ActivityIndicator
```

- [ ] **Step 3: Update login.tsx**

- Add warm gradient background
- Form inputs are already glass-ified from Task 7
- Buttons are already updated from Task 6
- Update font families to `'System'`

- [ ] **Step 4: Update auth components**

For BiometricPrompt and OTPInput (if they exist):
- Replace any hardcoded colors
- Replace Manrope fonts
- Ensure they use `useThemeColors()`

- [ ] **Step 5: Commit**

```bash
git add components/LoadingScreen.tsx components/auth/ app/login.tsx
git commit -m "feat: loading screen & auth — glass treatment, theme compliance"
```

---

## Task 18: Loading, Empty, and Error States

**Files:**
- Modify: Any screen/component that renders loading, empty, or error states

Per the spec's dedicated section on these states:

- [ ] **Step 1: Audit loading states**

Search for Skeleton usage, ActivityIndicator usage, and loading conditionals:
```bash
grep -rn "Skeleton\|ActivityIndicator\|loading\|isLoading" --include="*.tsx" app/ components/
```

- [ ] **Step 2: Update loading states**

Loading screens should render skeleton placeholders inside glass panels. The glass panel itself appears immediately; only the content shimmers. Ensure all Skeleton components use the updated glass-aware shimmer from Task 9.

- [ ] **Step 3: Update empty states**

Search for empty state renders (e.g., "No data", "No results", empty list messages):
```bash
grep -rn "no.*found\|empty\|no.*available\|no.*data" -i --include="*.tsx" app/ components/
```

Each empty state should be a centered message with icon inside a glass panel (`GlassView`). Use secondary text color, minimal design.

- [ ] **Step 4: Update error states**

Search for error renders:
```bash
grep -rn "error\|Error\|failed\|failure" --include="*.tsx" app/ components/
```

Error states should use a glass panel with error icon, message, and retry button. No special treatment beyond the standard glass card style.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: loading, empty, and error states — glass panel treatments"
```

---

## Task 19: Micro-interactions & Scroll Behavior

**Files:**
- Modify: `components/ui/Chip.tsx` (transition timing)
- Modify: Any switch/toggle components
- Modify: Screen files with large titles

- [ ] **Step 1: Chip selection transition**

In Chip.tsx, add a 200ms ease color tint transition on selection change. Use Reanimated `withTiming` to animate the background color rather than instant swap:
```typescript
const animatedBgColor = useAnimatedStyle(() => ({
  backgroundColor: withTiming(selected ? tintColor : 'transparent', { duration: 200 }),
}));
```

- [ ] **Step 2: Toggle/switch transitions**

Find any toggle or switch components and ensure state transitions use 250ms ease timing.

- [ ] **Step 3: Large title scroll behavior**

For main screens (dashboard, clubs, more), configure native navigation headers with large title support if using SDK 55 native headers:
```typescript
options={{
  headerLargeTitle: true,
  headerTransparent: true,
  // Glass nav bar blurs content scrolling underneath — automatic with SDK 55
}}
```

If using custom ScreenHeader, verify that content scrolls beneath the header to create the glass parallax effect.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: micro-interactions — chip transitions, scroll behavior, large titles"
```

---

## Task 20: CLAUDE.md & Documentation Update

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the design system documentation in CLAUDE.md**

Update the following sections:
- **Typography**: Replace Manrope references with SF Pro / system font
- **Color palette**: Update background colors, add gradient tokens
- **Component patterns**: Update Button (2px lip, translucent), Card (glass variants), Input (glow focus)
- **Animation guidelines**: Update spring defaults (damping 20, stiffness 150)
- **Shadow system**: Update to subtle/elevated two-tier system
- **Add glass section**: Document `GlassView` usage, intensity options, performance budget (~6-8 glass surfaces per screen)
- **Border radius**: Update xl from 24 to 20

Remove all Manrope font loading examples. Replace with system font usage.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for liquid glass design system"
```

---

## Task 21: Final Verification & Cleanup

- [ ] **Step 1: TypeScript compilation check**

```bash
npx tsc --noEmit
```

Fix any remaining type errors.

- [ ] **Step 2: Search for stale references**

```bash
# Manrope references
grep -rn "Manrope" --include="*.tsx" --include="*.ts" .

# Old shadow scale references (sm, md, lg, xl)
grep -rn "shadows\.sm\|shadows\.md\|shadows\.lg\|shadows\.xl" --include="*.tsx" --include="*.ts" .

# Direct ColorPalette usage (should be useThemeColors)
grep -rn "ColorPalette\[" --include="*.tsx" --include="*.ts" components/ app/

# Hardcoded white/black
grep -rn "'#FFFFFF'\|'#000000'" --include="*.tsx" --include="*.ts" components/ app/

# Old outlined card variant
grep -rn "outlined" --include="*.tsx" --include="*.ts" components/ app/
```

Fix any findings.

- [ ] **Step 3: Visual QA checklist**

Have the user verify on iOS 26 simulator:
- [ ] Tab bar has liquid glass effect
- [ ] Dashboard stat cards are translucent glass panels
- [ ] Cards across all screens use glass treatment
- [ ] Buttons have subtle 2px lip with translucent face
- [ ] Input focus shows orange glow
- [ ] Text renders in SF Pro
- [ ] Warm gradient backgrounds on all screens
- [ ] Dark mode: glass adapts correctly, warm dark backgrounds
- [ ] More screen shows grouped glass panels
- [ ] Toasts appear with glass backing
- [ ] Animations feel smooth and fluid (60fps)
- [ ] No "Reduce Transparency" accessibility issues
- [ ] Android: app launches, all glass components fall back to plain View without crashes

- [ ] **Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "fix: final cleanup — remove stale references, fix type errors"
```
