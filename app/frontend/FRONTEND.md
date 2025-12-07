# Frontend Guide

## Overview
- Expo Router app (React Native / TypeScript) with platform-specific map (`MapComponent.web.tsx` uses OSM iframe; `MapComponent.tsx` native uses react-native-maps).
- Screens: Home (map + metrics), Agent (chat UI), Devices (smart device cards). Swipe navigation is enabled between tabs; on Home, swipe is limited to the metrics area so map panning is unaffected.
- Theming: light content with dark safe-area edges and dark tab bar; purple accent (#8B5CF6/#A78BFA) and contextual metric colors.

## Structure
- `app/(tabs)/index.tsx` – Home: map top, metrics grid bottom; safe-area padding with rounded inner container.
- `app/(tabs)/agent.tsx` – Chat with speech bubbles, keyboard avoiding, and swipe navigation.
- `app/(tabs)/devices.tsx` – Device cards with gradients, battery bar fill, and swipe navigation.
- `components/MapComponent.tsx` – Native map; `MapComponent.web.tsx` – Web map.
- `components/MetricsComponent.tsx` – Metric cards with value-based icon colors.
- `components/SwipeNavigator.tsx` – Horizontal swipe handler between `index`, `agent`, `devices` routes.

## Install & Run
```bash
cd app/frontend
npm install

# Run native (Expo Go / simulator)
npm run start

# Run web
npm run web
```

## Notes & Behaviors
- Home swipe is scoped to the metrics section only; map remains draggable.
- Agent/Devices swipe left/right to change tabs.
- Safe areas use dark backgrounds to avoid white-on-white with device chrome.
- Tabs: `index`, `agent`, `devices`; home route is `/(tabs)` (handled in `SwipeNavigator`).

## Troubleshooting
- If TypeScript cannot find `@/components/MapComponent`, ensure `components/MapComponent.tsx` exists (native) and `components/MapComponent.web.tsx` (web). Expo will pick the platform file automatically.
- For map issues on native, confirm `react-native-maps` is installed via Expo (managed workflow supported).
