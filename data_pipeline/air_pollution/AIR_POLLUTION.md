# Air Pollution Data Pipeline

Import historical air quality data for Bucharest into Supabase database.

## Overview

This pipeline imports CSV files containing hourly air pollution measurements from 3 monitoring stations in Bucharest. Data includes particulate matter (PM2.5, PM10), gases (CO, NO2, O3, SO2), pollen counts, UV index, and air quality indices (European AQI, US AQI).

## Data Files

Located in `data/`:

| File | Size | Records | Time Range | Metrics |
|------|------|---------|------------|---------|
| `full_data_pollution.csv` | 4.23 MB | ~26,000 | Dec 2025 (current) | 20 metrics + AQI indices |
| `pollution_one_year.csv` | 2.69 MB | ~26,000 | Dec 2024 (historical) | 20 metrics (no AQI) |
| `open-meteo.csv` | 1.29 MB | ~26,000 | Dec 2024 (historical) | 8 basic metrics |

### Monitoring Locations

3 stations in Bucharest area:
- **Location 0**: 44.4°N, 26.1°E (elevation 85m)
- **Location 1**: 44.4°N, 25.9°E (elevation 79m)  
- **Location 2**: 44.5°N, 26.1°E (elevation 89m)

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

### 1. Create Database Tables

```sql
-- Run in Supabase SQL Editor
-- Copy/paste contents from database/pollution_schema.sql
```

### 2. Configure Environment

Update `.env` with valid Supabase credentials:

```env
user=postgres.your_project_id
password=your_password
host=aws-0-eu-west-1.pooler.supabase.com
port=5432
dbname=postgres
```

### 3. Install Dependencies

```bash
pip install psycopg2-binary python-dotenv
```

## Usage

### Import Data

```bash
python import_to_db.py
```

**Note:** Import currently has issues with the CSV structure (two-header format). The script needs debugging to properly parse the data section after the location header.

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

## Known Issues

⚠️ **Import Script Not Working**

The CSV files have a two-header structure:
- Lines 1-4: Location metadata header
- Line 5+: Data header + measurements

Current issue: Script finds the location headers but doesn't parse the data rows correctly. The `time` column is not being detected.

**Workaround needed:**
1. Manually split CSV files into location.csv and data.csv
2. Or fix the CSV parser to handle the dual-header format
3. Or use a different CSV reading approach (pandas)

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

- `import_to_db.py` - Import script (needs debugging)
- `database/pollution_schema.sql` - Database schema
- `data/*.csv` - Source data files (3 CSV files, ~7MB total)
- `AIR_POLLUTION.md` - This documentation

## License

MIT
