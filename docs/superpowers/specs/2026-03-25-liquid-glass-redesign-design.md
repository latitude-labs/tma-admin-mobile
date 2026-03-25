# TMA Admin Mobile: Liquid Glass Redesign

## Overview

A comprehensive visual redesign of the TMA Admin Mobile app to adopt Apple's iOS 26 liquid glass design language. The approach is "Translucent Layers" — glass chrome on all system elements plus translucent card surfaces that let background gradients breathe through, creating an airy, premium feel while keeping data-heavy admin screens readable.

### Key Decisions

- **iOS 26+ only** — no fallback paths needed
- **Expo SDK 55 upgrade** — automatic glass on native tabs, nav bars, form sheets, toolbars
- **Glass package** — `expo-glass-effect` (Expo official) or `@callstack/liquid-glass` as fallback. If neither is available at implementation time, build a minimal native module wrapping `UIVisualEffectView` + `UIGlassEffect` via Expo Modules API.
- **TMA Orange (`#FF8133`) retained** as brand accent
- **SF Pro replaces Manrope** — system font, native feel, eliminates font loading
- **3D buttons evolved** — lighter lip (2px), semi-translucent face, same spring animation DNA
- **Unified visual language** — admin section shares the same glass treatment, just with denser layouts
- **iOS-first, Android deferred** — this spec targets iOS 26. Android will continue to use the current design until a separate Android spec is created. No Android code should be broken — glass components must render as plain `View` on Android.

## Section 1: Foundation — SDK, Font, and Theme Overhaul

### SDK 55 Upgrade

Upgrade from Expo SDK 54 to SDK 55 with React Native 0.82+. Compile against Xcode 26 / iOS 26 SDK. This gives us:

- Automatic liquid glass on native tab bars
- Automatic liquid glass on form sheets
- Glass-aware native navigation headers
- Native toolbar API with glass
- `expo-glass-effect` package for custom glass surfaces (`GlassView`, `GlassContainer`)

### Typography — SF Pro Migration

- Remove Manrope entirely — uninstall `@expo-google-fonts/manrope` npm package, remove `expo-font` plugin config for Manrope, and delete any font loading logic from `app/_layout.tsx`
- Switch to system font (`System` / `-apple-system`) which resolves to SF Pro on iOS 26
- Simplify weight scale to four: Regular (400), Medium (500), Semibold (600), Bold (700)
- Some sizes may need +/-1px adjustment due to SF Pro's different metrics vs Manrope
- Eliminates the font loading step from app startup

### Color Palette Refinement

**Retained:**
- Primary brand: `#FF8133` (TMA Orange)
- Primary dark: `#CC6728` (button lip)
- Status colors: keep existing per-theme values (light: `#4CAF50`/`#FFC107`/`#F44336`/`#2196F3`; dark: `#66BB6A`/`#FFD54F`/`#EF5350`/`#42A5F5` as currently defined in Colors.ts)

**Changed:**
- Light backgrounds: secondary shifts from `#F5F5F5` to `#FAFAFA` (cleaner canvas for glass)
- Borders: reduced reliance — glass surfaces define their own edges through refraction
- Shadows: lighter, more diffused. Glass elements get depth from the material itself; non-glass elements get softer, wider shadows (larger blur radius, lower opacity)

### Spacing & Radius

- Cards currently use `Theme.borderRadius.lg` (16px). After redesign, cards use a new `xl` token at 20px. The existing `xl` token (24px) is reduced to 20px — this is intentional; 24px felt too rounded for glass panels.
- Base padding (16px) and gap spacing (12px) unchanged
- Button radius stays at 12px

## Section 2: Component Redesign

### Buttons — Evolved 3D

| Property | Before | After |
|----------|--------|-------|
| Lip height | 4px | 2px |
| Primary face | Solid `#FF8133` | TMA orange at ~85% opacity over glass backing |
| Secondary face | Solid `#F5F5F5` | Light glass surface (frosted white/gray) |
| Border radius | 12px | 12px (unchanged) |
| Spring damping | 10 | 15 |
| Spring stiffness | 200 | 180 |

- Outline and text variants stay flat — already lightweight
- Haptics unchanged (Light impact)

### Cards — Translucent Panels

| Variant | Before | After |
|---------|--------|-------|
| Elevated (default) | White bg + box shadow | `GlassView` with light frosted treatment, no shadow |
| Filled | Solid `#F5F5F5` | Slightly more opaque glass — for data tables, form sections |
| Outlined | 1px border, white bg | **Removed** — glass edges replace explicit borders. Existing `variant="outlined"` usages migrate to `"elevated"` (now glass-backed). |
| Gradient | Tinted gradient | Tinted gradient behind glass — coloured frosted panel |

- Padding stays at 16px, radius increases to 20px

### Inputs

- Border: 2px to 1px
- Background: solid white to white at ~90% opacity (slightly translucent)
- Focus state: border transitions to primary color + an additional wrapping `View` with a soft shadow (`shadowColor: '#FF8133', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: {0, 0}`) to create a glow effect. This avoids CSS box-shadow spread which React Native doesn't support.
- Error state: unchanged (red border + red helper text — no ambiguity)
- Radius stays at 12px

### Tab Bar

- Replaced by SDK 55's native tab bar with automatic liquid glass
- Elevated center "Home" tab stays — rendered as glass pill with orange accent when focused
- Remove manual BlurView implementation

### Navigation Headers

- Native navigation bar with liquid glass via SDK 55
- SF Pro Semibold title
- Large title mode on main screens (dashboard, clubs, etc.)
- Glass nav bar blurs content as it scrolls beneath

### Toast Notifications

- Body becomes `GlassView` surface
- Status-colored left border retained (4px)
- Icon container: glass-tinted circle instead of solid tint
- Shadow removed — glass provides visual separation
- Animations unchanged (SlideInUp/SlideOutUp)

### Stat Cards (Admin Dashboard)

- Glass panels with subtle color tint instead of gradient background (color at 12% to 5%)
- Value text (32px bold) stays prominent — high contrast against glass
- `GlassContainer` groups the stat grid — this renders a single glass background behind all stat cards with hairline dividers between cells (like iOS Settings grouped rows), not individual glass cards whose borders overlap
- Trend indicators unchanged

### IconBox

- "Glow" variant becomes default — soft halo fits the glass world
- "Filled" variant: glass backing instead of solid tint
- "Outline" variant: unchanged

### Badges & Chips

- Badges: glass backing with status color tint, pill-shaped
- Chips selected: glass pill with orange tint instead of solid orange fill
- Chips unselected: unchanged (thin border, lightweight)

### Avatar

- No change — solid orange circle with initials/image provides good contrast against glass

## Section 3: Screen Layouts & Backgrounds

### Background Strategy

Backgrounds become a first-class design element — glass surfaces sample from what's behind them.

**Light mode:**
- Subtle warm gradient: `#FFFFFF` to `#FFF8F2` (a whisper of TMA orange warmth)
- Radial or linear, screen-dependent
- No busy patterns or images — clean gradients only

**Dark mode:**
- `#141210` to `#1A1510` — warm near-black gradient
- Glass picks up subtle amber quality, pairs naturally with TMA orange

### Dashboard Screen

- Full-screen warm gradient background
- Glass nav bar with greeting text
- Sync badge: small glass pill grouped with nav bar via `GlassContainer`
- Stats grid: `GlassContainer` wrapping stat cards — merged edges, subtle dividers between cells
- Content scrolls beneath glass nav bar (iOS 26 parallax-through-glass)

### Clubs Screen

- Glass nav bar with title
- Club cards: individual `GlassView` panels
- Expanded state: card grows with layout animation, class items separated by hairline dividers (not nested cards)
- Entrance: gentle fade + slide (not FadeInDown bounce)

### More Screen (Settings/Menu)

**Biggest structural change:** individual floating cards per menu item become grouped glass panels (like iOS Settings).

- Glass nav bar with user avatar and name
- Each section: one `GlassView` panel containing grouped menu rows
- Section headers: small SF Pro caption text outside glass panels
- Individual menu items: rows within the glass panel, not individual cards

### EOD Wizard

- Step progress bar sits in the glass nav bar area
- Form sections rendered as glass panels on warm gradient background
- Back/Next buttons in a glass toolbar at bottom

### Modal Sheets & Overlays

- All modals use SDK 55 native form sheet presentation — automatic liquid glass header and drag indicator
- No custom overlay dimming

### Admin Data Screens

- Same glass treatment, denser layouts (tighter padding, smaller text for tabular data)
- Charts/graphs on slightly more opaque glass panels for contrast
- Filter chips in horizontal scroll with glass backing

## Section 4: Animation & Interaction Model

### Spring Physics Refinement

| Context | Before | After |
|---------|--------|-------|
| General UI (new default) | varies | damping 20, stiffness 150 |
| Button press | damping 10, stiffness 200, mass 0.5 | damping 15, stiffness 180 |
| Tab press-in | damping 15, stiffness 200 | damping 20, stiffness 150 |
| Tab release | damping 10, stiffness 150 | damping 20, stiffness 150 |

Smoother, more fluid — matches the "liquid" in liquid glass.

### Entrance Animations

- Replace `FadeInDown` / `FadeInRight` with `FadeIn` + subtle `translateY` (8-10px)
- Stagger delay: 100ms to 60ms per item
- Glass surfaces: fade in with slight scale (0.97 to 1.0) — "materializing" feel

### Scroll Interactions

- Glass nav bar gains content scrolling underneath (automatic with SDK 55 native navigation)
- Large titles collapse to inline on scroll (standard iOS 26 behavior)
- Scroll edge effects: if SDK 55 exposes `UIScrollEdgeEffect` configuration, enable it. Otherwise, this is an iOS-level automatic behavior that may just work with native scroll views. Verify during implementation — not a blocker if unavailable.

### Transitions

- Native stack transitions (push/pop) — SDK 55 provides glass-aware transitions
- Drawer/tab transitions: native handling
- Modal presentations: native sheet spring

### Micro-interactions

- Tab press: keep scale spring (0.9 to 1.0), remove shadow animation
- Chip selection: 200ms ease color tint transition (not instant swap)
- Toggle/switch states: 250ms ease transitions
- Sync badge rotation: unchanged (functional, not decorative)

### Removed

- Heavy shadow animations (glass replaces shadow-based depth)
- Opacity-based press states on flat buttons (replaced with subtle scale 0.98)
- FadeInDown/FadeInRight layout animation presets (replaced with simpler custom springs)

## Section 5: Dark Mode & Theming

### Dark Mode Philosophy

Glass auto-adapts — `UIGlassEffect` reads `userInterfaceStyle` and adjusts automatically. Our job is backgrounds and text.

### Dark Backgrounds

- Primary: `#141210` (warm near-black, not pure `#000000`)
- Gradient: `#141210` to `#1A1510`
- Glass surfaces pick up subtle amber quality in dark mode

### Dark Text

- Primary: `#F5F5F5` (not pure white)
- Secondary: `#A0A0A0`
- Tertiary: `#707070`

### Dark Borders

- Mostly eliminated — glass defines its own edges
- Where needed (inputs, dividers): `rgba(255, 255, 255, 0.08)`

### Accent in Dark Mode

- TMA orange stays as-is — vibrant enough against dark glass
- Glass-tinted buttons: orange at ~80% opacity over dark glass creates a glowing effect
- Status colors: keep existing per-theme dark mode variants (already defined in Colors.ts)

### Theme System Changes

**`useThemeColors` hook refactored:**
- Add `palette.backgroundGradientStart` / `palette.backgroundGradientEnd`
- Remove per-level shadow tokens
- Keep single `palette.softShadow` for non-glass elements
- Remove `palette.glass` flag (unnecessary — iOS 26 only, glass is always available)

**`Theme.shadows` simplified:**
- Drop `sm`/`md`/`lg`/`xl`
- Replace with `subtle` and `elevated` only

**`Theme.borderRadius` updated:**
- `xl` changes from 24px to 20px (glass cards)

**Unchanged:**
- Color scheme detection mechanism
- Status colors
- `useThemeColors` hook pattern (components still call it the same way)
- Primary brand color

## Package Dependencies

### Added
- `expo-glass-effect` — GlassView, GlassContainer components

### Upgraded
- Expo SDK 54 to 55
- React Native 0.81.4 to 0.82+
- All Expo packages to SDK 55 compatible versions

### Removed
- `@expo-google-fonts/manrope` (or however Manrope is currently installed)
- Manual BlurView usage in tab bar (replaced by native glass)

## Files Impacted

### Theme & Constants
- `constants/Colors.ts` — background colors, dark mode palette, remove some border tokens
- `constants/Theme.ts` — typography (SF Pro), shadows (simplified), border radius (xl: 20)
- `hooks/useThemeColors.ts` — new glass-era tokens, gradient colors, simplified shadows

### UI Components
- `components/ui/Button.tsx` — 2px lip, translucent face, adjusted springs
- `components/ui/Card.tsx` — GlassView integration, remove outlined variant
- `components/ui/Input.tsx` — 1px border, translucent bg, focus glow
- `components/ui/Toast.tsx` — GlassView body, remove shadow
- `components/ui/Badge.tsx` — glass backing
- `components/ui/Chip.tsx` — glass selected state
- `components/ui/IconBox.tsx` — glow default, glass filled variant
- `components/ui/ScreenHeader.tsx` — may be replaced by native nav bar
- `components/ui/Skeleton.tsx` — adjust shimmer colors for glass context; also fix existing theme violation (uses `useColorScheme` + `ColorPalette` directly instead of `useThemeColors`)

### Feature Components
- `components/dashboard/AdminDashboard.tsx` — gradient background, glass layout
- `components/dashboard/admin/DashboardHeader.tsx` — glass nav integration
- `components/dashboard/admin/StatCard.tsx` — GlassView + GlassContainer
- `components/dashboard/admin/StatsGrid.tsx` — GlassContainer grouping
- `components/eod-wizard/*.tsx` — glass panels, glass toolbar

### Screens
- `app/_layout.tsx` — SDK 55 navigation setup
- `app/(tabs)/_layout.tsx` — native tab bar, remove custom BlurView tab bar
- `app/(tabs)/*.tsx` — gradient backgrounds, updated card usage
- `app/(tabs)/more.tsx` — grouped glass panels (structural change)
- All modal/detail screens — native sheet presentation

### Configuration
- `app.json` — SDK 55 config
- `package.json` — dependency upgrades

## Accessibility

- **Reduce Transparency:** When the iOS "Reduce Transparency" accessibility setting is enabled, `UIGlassEffect` automatically falls back to a more opaque material. No custom handling needed, but verify during implementation that text remains readable in this mode.
- **Contrast ratios:** All text over glass surfaces must meet WCAG 2.1 AA minimum contrast (4.5:1 for body text, 3:1 for large text). Test with both light and dark backgrounds showing through glass. If contrast is insufficient, increase the glass material opacity or add a subtle solid backing.
- **Touch targets:** Unchanged — existing 44px+ minimum touch targets are retained.

## Performance

- **Glass surface budget:** Limit to ~6-8 simultaneous glass surfaces visible on screen. For scrollable lists (clubs, admin tables), individual list items should NOT each be a `GlassView`. Instead, use a single `GlassContainer` or `GlassView` as the list background, with items rendered as rows within it.
- **FlatList optimization:** Items in FlatList/FlashList should use simple `View` backgrounds, not individual glass effects. Glass is for the containing panel, not each cell.
- **Skeleton/Shimmer on glass:** Keep the shimmer animation but tint it to match glass material color — `rgba(255, 255, 255, 0.15)` pulsing to `rgba(255, 255, 255, 0.3)` in light mode.

## Loading, Empty, and Error States

- **Loading screens:** Skeleton placeholders render inside glass panels. The glass panel itself appears immediately; only the content shimmers.
- **Empty states:** A centered message with icon inside a glass panel. Use secondary text color, keep it minimal.
- **API error screens:** Glass panel with error icon, message, and a retry button. No special treatment beyond using the standard glass card style.
- **Connection lost:** Toast notification (glass-backed) with error styling. No full-screen overlay.
