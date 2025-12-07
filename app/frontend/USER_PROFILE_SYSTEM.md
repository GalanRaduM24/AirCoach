# User Profile & Personalized Alerts System

## Overview
Implemented a comprehensive user health profile system that generates personalized air quality alerts based on the user's health conditions, age, and environmental factors.

## Features

### 1. **Onboarding Flow** (`app/onboarding.tsx`)
- Appears on first app launch
- Collects:
  - Age
  - Asthma status
  - Allergies (pollen, dust, pollution)
  - Health conditions (COPD, bronchitis, heart disease)
- Data persisted using AsyncStorage
- Profile required before accessing main app

### 2. **Personalized Alert Component** (`components/PersonalizedAlertComponent.tsx`)
- Displays on home screen at top
- Calculates personalized risk level based on:
  - User health profile
  - Current AQI, PM2.5, PM10 levels
  - Temperature, humidity, UV index
  - Age and respiratory conditions
  - Allergies and environmental factors

#### Alert Levels:
- **✅ Safe** (Green): Good for outdoor activities
- **⚠️ Take Caution** (Yellow): Monitor symptoms, some restrictions
- **⚠️ Warning** (Orange): Avoid strenuous activity, limit outdoor time
- **⛔ Danger** (Red): Stay indoors if possible

#### Risk Calculation:
- **Age factors**: Children (<5) and elderly (>65) have higher baseline risk
- **Respiratory conditions**: Asthma/COPD multiply risk score significantly
  - PM2.5 > 35 triggers warning
  - AQI > 100 triggers elevated alert
- **Pollen allergies**: Detected during optimal pollen season (20-25°C)
- **Dust allergies**: Triggered by PM10 > 50, low humidity (<30%)
- **Pollution sensitivity**: Direct correlation with AQI/PM2.5
- **Heart disease**: Adds 2 points, sensitive to AQI > 75
- **UV index**: Combined with respiratory conditions

### 3. **User Profile Store** (`store/userProfileStore.ts`)
- Zustand store for state management
- Persistent storage via AsyncStorage
- Methods:
  - `initializeProfile()` - Load on app startup
  - `updateProfile()` - Save profile changes
  - `completeOnboarding()` - Mark onboarding complete

### 4. **Profile Management** (`app/(tabs)/profile.tsx`)
- Accessible from bottom tab navigation
- View and edit health information
- Shows last update timestamp
- Edit/Cancel/Save workflow

### 5. **Root Layout Integration** (`app/_layout.tsx`)
- Conditional routing based on onboarding status
- Splash screen handling
- Profile initialization on app load

## UI/UX

### Home Screen Alert Placement
```
┌─────────────────────────────────┐
│ ✅ Safe / ⚠️ Warning / ⛔ Danger │ ← Personalized Alert
├─────────────────────────────────┤
│                                 │
│          Map Component          │
│                                 │
├─────────────────────────────────┤
│                                 │
│      Metrics & Details          │
│                                 │
└─────────────────────────────────┘
```

### Colors
- **Safe**: #E8F5E9 (Green)
- **Caution**: #FFFDE7 (Yellow)
- **Warning**: #FFF3E0 (Orange)
- **Danger**: #FFEBEE (Red)

## Data Flow

### On App Launch:
1. App initializes
2. Load or create user profile
3. If no profile, show onboarding screen
4. On completion, store profile and navigate to main app

### On Home Screen:
1. Get current air quality data (from store)
2. Get user profile
3. PersonalizedAlertComponent calculates risk score
4. Display appropriate alert level with message

## Example Scenarios

### Asthmatic during high pollution:
- User age: 35, has asthma, dust allergy
- Current: AQI 150, PM2.5 45, PM10 80
- Risk score: 3 (asthma) + 2 (PM2.5) + 2 (dust PM10) = 7
- **Result: DANGER - Stay indoors**

### Young person, no conditions:
- User age: 25, no conditions
- Current: AQI 65, PM2.5 20, PM10 30
- Risk score: 0
- **Result: SAFE - Good for outdoor activities**

### Elderly with pollution sensitivity:
- User age: 72, pollution sensitivity
- Current: AQI 110, PM2.5 38
- Risk score: 2 (age) + 2 (pollution) = 4
- **Result: WARNING - Avoid strenuous activity**

## Files Modified
- `app/_layout.tsx` - Added profile initialization and conditional routing
- `app/(tabs)/_layout.tsx` - Added profile tab
- `app/(tabs)/index.tsx` - Added PersonalizedAlertComponent
- `store/userProfileStore.ts` - New user profile store
- `components/PersonalizedAlertComponent.tsx` - New alert component
- `app/onboarding.tsx` - New onboarding screen
- `app/(tabs)/profile.tsx` - New profile management screen

## Dependencies
- `zustand` (state management)
- `@react-native-async-storage/async-storage` (persistent storage)
- `expo-splash-screen` (splash screen handling)

## Future Enhancements
- [ ] Weather API integration for pollen forecasts
- [ ] Medication tracking and alerts
- [ ] Historical data and trends
- [ ] Location-specific alert customization
- [ ] Integration with wearable devices
- [ ] Health app integration (Apple Health, Google Fit)
