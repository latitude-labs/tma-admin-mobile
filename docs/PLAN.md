# TMA Admin Mobile App - Development Plan

## Project Overview
The TMA Admin mobile app is a React Native application built with Expo, designed for Temple Martial Arts coaches to manage their classes, students, trial bookings, and lesson plans. The app must work offline and maintain the TMA brand identity.

## Core Requirements
- **Offline-first architecture** - All content must be available without internet connection
- **Modular design** - Easy to add new features with minimal friction
- **Brand consistency** - Match TMA website styling with primary color #FF8133
- **Simple and intuitive** - Built for coaches to use during classes
- **Design System** - Comprehensive component showcase for consistency

## Technology Stack (Updated for 2025)
- **Framework**: React Native 0.81.4 with Expo SDK 54
- **Navigation**: Expo Router v6 (file-based routing)
- **State Management**: Zustand 5.x (lightweight, TypeScript-friendly)
- **Offline Storage**: 
  - AsyncStorage for simple key-value data
  - WatermelonDB for complex relational data (with Expo plugin)
- **UI Components**: Custom components library
- **Styling**: StyleSheet with theme system
- **Forms**: React Hook Form
- **Date/Time**: date-fns

## App Architecture (Expo Router Structure)

### Directory Structure
```
app/                  # Expo Router screens
├── (auth)/          # Authentication flow
│   ├── login.tsx
│   └── _layout.tsx
├── (tabs)/          # Main app with tab navigation
│   ├── _layout.tsx
│   ├── index.tsx    # Dashboard
│   ├── clubs.tsx
│   ├── students.tsx
│   ├── classes.tsx
│   └── trials.tsx
├── design-system.tsx # Component showcase
├── _layout.tsx      # Root layout
└── +not-found.tsx   # 404 screen

components/          # Reusable UI components
├── ui/             # Base UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Badge.tsx
│   └── Avatar.tsx
├── forms/          # Form components
├── layout/         # Layout components
└── themed/         # Theme-aware components

constants/          # App constants
├── Colors.ts       # Brand colors
├── Layout.ts       # Layout constants
└── Theme.ts        # Theme configuration

hooks/              # Custom React hooks
├── useOffline.ts
├── useSync.ts
└── useTheme.ts

services/           # External services
├── api/
├── storage/
└── sync/

store/              # Zustand stores
├── authStore.ts
├── studentStore.ts
├── classStore.ts
└── syncStore.ts

utils/              # Utility functions
└── helpers.ts
```

## Design System

### Component Library
All components will be showcased in a dedicated Design System screen accessible from the app for easy inspection and testing.

#### Core Components
- **Button** - Primary, Secondary, Outline, Text variants
- **Card** - Container with shadow and padding
- **Input** - Text input with label and error states
- **Select** - Dropdown selector
- **Badge** - Status indicators
- **Avatar** - User/student profile images
- **Chip** - Tags and filters
- **FAB** - Floating Action Button
- **TabBar** - Custom tab navigation
- **Header** - App header with logo
- **ListItem** - Consistent list rows
- **EmptyState** - No data illustrations
- **LoadingState** - Skeleton screens
- **ErrorState** - Error messages
- **ProgressBar** - Sync and loading progress
- **Modal** - Overlays and dialogs
- **Toast** - Notifications

### Branding & Theme
- **Primary Color**: #FF8133 (TMA Orange)
- **Secondary Colors**: 
  - Dark: #2C2C2C (headers, text)
  - Light: #F5F5F5 (backgrounds)
  - Success: #4CAF50
  - Warning: #FFC107
  - Error: #F44336
  - Info: #2196F3
- **Typography**: 
  - Headings: System bold
  - Body: System regular
  - Sizes: xs(12), sm(14), md(16), lg(18), xl(24), 2xl(32)
- **Spacing**: 4, 8, 12, 16, 24, 32, 48
- **Border Radius**: sm(4), md(8), lg(12), xl(16), full(999)
- **Shadows**: Elevation levels 1-5

### Logo Placement
The TMA logo should be placed in the **center of the main navigation header** at the top of the app, maintaining consistent visibility across all screens.

## Key Features (Phase 1)

### 1. Design System Screen
- Visual showcase of all components
- Interactive component states
- Color palette display
- Typography samples
- Spacing guide
- Icon library

### 2. Authentication & Profile
- Coach login/logout
- Profile management
- Offline session persistence
- Biometric authentication support

### 3. Dashboard
- Today's classes overview
- Quick stats (students, trials, attendance)
- Quick actions menu
- Upcoming events

### 4. Club Management
- View assigned clubs
- Club details and schedules
- Location information with maps
- Contact details

### 5. Student Management
- Student roster with search
- Filter by belt level, age, club
- Student profiles
- Attendance history
- Progress tracking

### 6. Class Management
- Daily/weekly schedule view
- Class rosters
- Quick attendance marking
- Class notes
- Lesson plan integration

### 7. Trial Bookings
- Upcoming trials list
- Trial student details
- Quick conversion to student
- Trial feedback forms

### 8. Offline Sync
- Automatic background sync
- Manual sync option
- Sync status indicators
- Conflict resolution
- Queue management

## Offline Strategy (Updated)

### Storage Solutions

#### AsyncStorage (for simple data)
- User preferences
- App settings
- Authentication tokens
- Small cached data
- Last sync timestamps

#### WatermelonDB (for complex data)
- Students database
- Classes and schedules
- Clubs information
- Attendance records
- Trial bookings
- Lesson plans

### Implementation Approach
```javascript
// For simple key-value storage
import AsyncStorage from '@react-native-async-storage/async-storage';

// For complex relational data
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
```

### Sync Mechanism
1. Queue all local changes
2. Detect network availability
3. Push local changes
4. Pull remote updates
5. Resolve conflicts
6. Update UI optimistically

## Implementation Phases

### Phase 1: Foundation (Current)
1. ✅ Project planning
2. ⏳ Dependency installation
3. ⏳ Theme system setup
4. ⏳ Component library creation
5. ⏳ Design system screen
6. ⏳ Navigation structure
7. ⏳ Skeleton screens

### Phase 2: Core Features
1. Authentication flow
2. Dashboard implementation
3. Student management
4. Class scheduling
5. Basic offline storage

### Phase 3: Advanced Features
1. Trial booking system
2. Attendance tracking
3. Lesson plans
4. Reports and analytics
5. Push notifications

### Phase 4: Polish & Optimization
1. Performance optimization
2. Advanced sync features
3. Data export
4. Accessibility
5. Testing suite

## Development Guidelines

### Code Quality
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Husky pre-commit hooks
- Component testing
- E2E testing with Detox

### Performance Targets
- App launch: < 2 seconds
- Screen transitions: < 300ms
- List scrolling: 60 FPS
- Offline detection: < 500ms
- Data sync: < 5 seconds

### Accessibility
- VoiceOver/TalkBack support
- Minimum touch targets: 44x44
- Color contrast ratios: WCAG AA
- Font scaling support
- Screen reader labels

## Next Steps
1. Install required dependencies
2. Set up theme configuration
3. Create base component library
4. Build design system showcase
5. Implement navigation structure
6. Create skeleton screens
7. Set up offline storage
8. Begin feature development

## Success Metrics
- App loads in < 2 seconds
- Offline mode works seamlessly
- Data syncs within 5 seconds when online
- Coaches complete tasks 50% faster
- 90%+ user satisfaction
- Zero data loss in offline mode
- < 0.1% crash rate