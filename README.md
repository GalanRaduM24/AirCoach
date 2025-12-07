# AirCoach

AirCoach is a full-stack air-quality companion that combines live AQI data, nearby sensor readings, and household device automations.

## Highlights
- Live AQI and pollutant metrics with sensor fallback when APIs fail
- Personalized health onboarding and risk-aware alerts
- Device automation flows (windows, purifiers, UV lamp) driven by context
- Agent chat that can trigger automations (e.g., “clean my house”)

## Quick Start
1. Copy `.env.example` to `.env` in root, `app/frontend`, and `app/backend` and fill in keys.
2. Frontend: `cd app/frontend && npm install && npm run web`
3. Backend: `cd app/backend && npm install && npm start`

## Authors
Radu Gălan, Denis Mitică, Răzvan Timofte
