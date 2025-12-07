# Air Pollution Data Pipeline

Real-time air quality data fetcher using **Google Air Quality API** for Bucharest.

## Overview

This pipeline fetches live air quality data from Google's Air Quality API for 6 monitoring locations (one per sector) in Bucharest. Data includes:
- **Pollutants**: PM2.5, PM10, NO2, O3, SO2, CO
- **Pollen/Allergens**: Grass, Tree, Weed pollen indices
- **AQI**: Air Quality Index with health categories
- **Health Recommendations**: Activity guidance based on air quality

## Monitoring Locations

6 locations covering all Bucharest sectors:

| Sector | Location | Coordinates |
|--------|----------|-------------|
| 1 | Piața Victoriei | 44.4517°N, 26.0830°E |
| 2 | Piața Obor | 44.4481°N, 26.1253°E |
| 3 | Titan | 44.4286°N, 26.1636°E |
| 4 | Berceni | 44.3817°N, 26.1206°E |
| 5 | Rahova | 44.4053°N, 26.0685°E |
| 6 | Drumul Taberei | 44.4242°N, 26.0175°E |

### Measured Parameters

**Particulate Matter:**
- PM10 (μg/m³)
- PM2.5 (μg/m³)
- PM1 (μg/m³)
- Dust (μg/m³)
- Aerosol Optical Depth

**Gases:**
- Carbon Monoxide (CO) - μg/m³
- Carbon Dioxide (CO2) - ppm
- Nitrogen Dioxide (NO2) - μg/m³
- Sulphur Dioxide (SO2) - μg/m³
- Ozone (O3) - μg/m³
- Ammonia (NH3) - μg/m³
- Methane (CH4) - μg/m³

**Pollen (grains/m³):**
- Ragweed
- Olive
- Alder
- Birch
- Grass
- Mugwort

**UV & AQI:**
- UV Index
- UV Index Clear Sky
- European AQI (EAQI) - 0-500 scale
- US AQI (USAQI) - 0-500 scale

## Database Schema

Run `database/pollution_schema.sql` in Supabase SQL Editor to create:

### Tables

**`pollution_locations`**
- `location_id` (PRIMARY KEY)
- `latitude`, `longitude`, `elevation`
- `timezone`, `timezone_abbreviation`

**`pollution_data`**
- `id` (BIGSERIAL PRIMARY KEY)
- `location_id` (FOREIGN KEY)
- `measured_at` (TIMESTAMPTZ) - Measurement timestamp
- 24 pollution metric columns
- Indexes on location + time for fast queries

### Views & Functions

- **`latest_pollution_data`** - Most recent reading per location
- **`get_aqi_category(aqi_value)`** - Convert AQI to text (Good/Fair/Moderate/Poor/Very Poor/Severe)
- **`get_pollution_at_time(location_id, target_time)`** - Historical data lookup

## Setup

### 1. Get Google Air Quality API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Air Quality API**
4. Create API credentials (API Key)
5. Add to `.env`:

```env
GOOGLE_AIR_QUALITY_API_KEY=your_google_api_key
```

### 2. Create Database Tables

```sql
-- Run in Supabase SQL Editor
-- Copy/paste contents from database/pollution_schema.sql
```

### 3. Populate Locations

```sql
-- Run in Supabase SQL Editor
-- Copy/paste contents from database/populate_locations.sql
```

This inserts the 6 Bucharest sector monitoring locations into the database.

### 4. Configure Database

Update `.env` with Supabase credentials:

```env
user=postgres.your_project_id
password=your_password
host=aws-1-eu-west-1.pooler.supabase.com
port=5432
dbname=postgres
```

### 5. Install Dependencies

```bash
pip install requests psycopg2-binary python-dotenv
```

## Usage

### Fetch Live Data

Fetch current air quality for all 6 sectors:

```bash
python live_air_quality.py fetch
```

Output:
```
🔄 Fetching live air quality data for Bucharest...

📍 Sector 1 - Piata Victoriei
   AQI: 42 - Good (pm25)
   PM2.5: 10.5 μg/m³
   PM10: 18.2 μg/m³
   NO2: 12.3 μg/m³
   O3: 45.6 μg/m³
   ✓ Saved data for Sector 1 - Piata Victoriei - AQI: 42
...
```

### Get Latest Reading

```bash
python live_air_quality.py latest 3
```

Output (JSON):
```json
{
  "measured_at": "2025-12-07T10:00:00+00:00",
  "pm10": 18.2,
  "pm2_5": 10.5,
  "co": 250.0,
  "no2": 12.3,
  "so2": 2.1,
  "o3": 45.6,
  "grass_pollen": 2,
  "weed_pollen": 1,
  "aqi": 42
}
```

### Schedule with Cron

Run every hour to keep data fresh:

```bash
# Crontab entry
0 * * * * cd /path/to/project && python live_air_quality.py fetch
```

### Query Data

```sql
-- Get latest readings for all locations
SELECT * FROM latest_pollution_data;

-- Get data for a specific location and time
SELECT * FROM get_pollution_at_time(0, '2025-12-07 10:00:00+00');

-- Find high pollution events
SELECT location_id, measured_at, pm2_5, pm10, european_aqi
FROM pollution_data
WHERE european_aqi > 100
ORDER BY measured_at DESC
LIMIT 20;

-- Average pollution by location
SELECT 
    location_id,
    AVG(pm2_5) as avg_pm25,
    AVG(pm10) as avg_pm10,
    AVG(european_aqi) as avg_aqi
FROM pollution_data
GROUP BY location_id;
```

## Google Air Quality API

### Endpoints Used

1. **Current Conditions** (`/v1/currentConditions:lookup`)
   - Real-time pollutant concentrations
   - AQI calculation
   - Dominant pollutant
   - Health recommendations

2. **Pollen Forecast** (`/v1/forecast:lookup`)
   - Grass, tree, weed pollen indices
   - 1-5 day forecast
   - Category labels (None/Low/Moderate/High/Very High)

### API Response Example

```json
{
  "dateTime": "2025-12-07T10:00:00Z",
  "indexes": [{
    "aqi": 42,
    "category": "Good",
    "dominantPollutant": "pm25"
  }],
  "pollutants": [
    {"code": "pm25", "concentration": {"value": 10.5, "units": "μg/m³"}},
    {"code": "pm10", "concentration": {"value": 18.2, "units": "μg/m³"}},
    {"code": "no2", "concentration": {"value": 12.3, "units": "μg/m³"}},
    {"code": "o3", "concentration": {"value": 45.6, "units": "μg/m³"}}
  ],
  "healthRecommendations": {
    "generalPopulation": "Air quality is good. Enjoy outdoor activities.",
    "sensitiveGroups": "Air quality is acceptable."
  }
}
```

### Pricing

- **Free tier**: 1,000 requests/day
- **Beyond**: ~$0.50 per 1,000 requests
- 6 locations × 24 hours = 144 requests/day (well within free tier)

## AQI Categories

| AQI Range | Category | Description |
|-----------|----------|-------------|
| 0-50 | Good | Air quality is satisfactory |
| 51-100 | Fair | Acceptable for most people |
| 101-150 | Moderate | Sensitive groups may experience effects |
| 151-200 | Poor | Everyone may begin to experience health effects |
| 201-300 | Very Poor | Health warnings of emergency conditions |
| 301+ | Severe | Health alert: everyone may experience serious effects |

## Integration with App

Once data is imported, your React Native app can:

1. **Query latest readings**
   ```typescript
   const response = await fetch('/api/pollution/latest');
   const data = await response.json();
   ```

2. **Get historical trends**
   ```typescript
   const response = await fetch('/api/pollution/history?location=0&hours=24');
   ```

3. **Check AQI for recommendations**
   ```typescript
   if (aqi > 150) {
     // Show warning: "Poor air quality. Avoid outdoor activities."
   }
   ```

## Data Sources

CSV files were generated from air quality monitoring APIs (Open-Meteo or similar services). They contain:
- Real measurements from monitoring stations
- Hourly granularity
- Multiple locations for spatial coverage
- Both current (2025) and historical (2024) data

## Future Enhancements

- [ ] Fix CSV import script
- [ ] Add data validation and cleaning
- [ ] Implement incremental updates (append new data only)
- [ ] Add data quality checks (missing values, outliers)
- [ ] Create aggregation tables (daily/weekly averages)
- [ ] Add spatial interpolation for unmeasured locations
- [ ] Connect to live API for real-time updates
- [ ] Add data visualization endpoints

## Files

- **`live_air_quality.py`** - Main script to fetch live data from Google API
- **`database/pollution_schema.sql`** - Database schema
- **`AIR_POLLUTION.md`** - This documentation
- ~~`import_to_db.py`~~ - Old CSV importer (deprecated)
- ~~`data/*.csv`~~ - Static files (removed, use live API instead)

## License

MIT
