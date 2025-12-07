-- Supabase Database Schema for Air Pollution Data
-- Run this in your Supabase SQL Editor

-- Table to store pollution monitoring locations
CREATE TABLE IF NOT EXISTS pollution_locations (
  location_id INTEGER PRIMARY KEY,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  elevation REAL,
  timezone TEXT,
  timezone_abbreviation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for location lookups
CREATE INDEX IF NOT EXISTS idx_pollution_location_id ON pollution_locations(location_id);

-- Table to store air quality measurements
CREATE TABLE IF NOT EXISTS pollution_data (
  id BIGSERIAL PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES pollution_locations(location_id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL,
  
  -- Particulate Matter
  pm10 REAL,                          -- PM10 (μg/m³)
  pm2_5 REAL,                         -- PM2.5 (μg/m³)
  pm1 REAL,                           -- PM1 (μg/m³)
  dust REAL,                          -- Dust (μg/m³)
  aerosol_optical_depth REAL,         -- Aerosol Optical Depth
  
  -- Gaseous Pollutants
  carbon_monoxide REAL,               -- CO (μg/m³)
  carbon_dioxide REAL,                -- CO2 (ppm)
  nitrogen_dioxide REAL,              -- NO2 (μg/m³)
  sulphur_dioxide REAL,               -- SO2 (μg/m³)
  ozone REAL,                         -- O3 (μg/m³)
  ammonia REAL,                       -- NH3 (μg/m³)
  methane REAL,                       -- CH4 (μg/m³)
  
  -- Pollen Concentrations (grains/m³)
  ragweed_pollen REAL,
  olive_pollen REAL,
  alder_pollen REAL,
  birch_pollen REAL,
  grass_pollen REAL,
  mugwort_pollen REAL,
  
  -- UV Indices
  uv_index REAL,                      -- UV Index
  uv_index_clear_sky REAL,            -- UV Index Clear Sky
  
  -- Air Quality Indices
  european_aqi INTEGER,               -- European AQI (0-500)
  us_aqi INTEGER,                     -- US AQI (0-500)
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_pollution_location_time ON pollution_data(location_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_pollution_time ON pollution_data(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_pollution_aqi ON pollution_data(location_id, european_aqi);

-- Create a view for the latest air quality readings
CREATE OR REPLACE VIEW latest_pollution_data AS
SELECT 
  pl.location_id,
  pl.latitude,
  pl.longitude,
  pl.elevation,
  pl.timezone,
  pd.measured_at,
  pd.pm10,
  pd.pm2_5,
  pd.pm1,
  pd.carbon_monoxide,
  pd.carbon_dioxide,
  pd.nitrogen_dioxide,
  pd.sulphur_dioxide,
  pd.ozone,
  pd.ammonia,
  pd.methane,
  pd.dust,
  pd.aerosol_optical_depth,
  pd.uv_index,
  pd.uv_index_clear_sky,
  pd.ragweed_pollen,
  pd.olive_pollen,
  pd.alder_pollen,
  pd.birch_pollen,
  pd.grass_pollen,
  pd.mugwort_pollen,
  pd.european_aqi,
  pd.us_aqi
FROM pollution_locations pl
LEFT JOIN LATERAL (
  SELECT *
  FROM pollution_data
  WHERE location_id = pl.location_id
  ORDER BY measured_at DESC
  LIMIT 1
) pd ON true;

-- Create a function to get AQI category
CREATE OR REPLACE FUNCTION get_aqi_category(aqi_value INTEGER)
RETURNS TEXT AS $$
BEGIN
  CASE 
    WHEN aqi_value <= 50 THEN RETURN 'Good';
    WHEN aqi_value <= 100 THEN RETURN 'Fair';
    WHEN aqi_value <= 150 THEN RETURN 'Moderate';
    WHEN aqi_value <= 200 THEN RETURN 'Poor';
    WHEN aqi_value <= 300 THEN RETURN 'Very Poor';
    ELSE RETURN 'Severe';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a function to get air quality for a location at a specific time
CREATE OR REPLACE FUNCTION get_pollution_at_time(
  p_location_id INTEGER,
  p_target_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  location_id INTEGER,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  measured_at TIMESTAMPTZ,
  pm10 REAL,
  pm2_5 REAL,
  pm1 REAL,
  european_aqi INTEGER,
  us_aqi INTEGER,
  aqi_category_eu TEXT,
  aqi_category_us TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pl.location_id,
    pl.latitude,
    pl.longitude,
    pd.measured_at,
    pd.pm10,
    pd.pm2_5,
    pd.pm1,
    pd.european_aqi,
    pd.us_aqi,
    get_aqi_category(pd.european_aqi),
    get_aqi_category(pd.us_aqi)
  FROM pollution_locations pl
  LEFT JOIN LATERAL (
    SELECT *
    FROM pollution_data
    WHERE location_id = pl.location_id
      AND measured_at <= p_target_time
    ORDER BY measured_at DESC
    LIMIT 1
  ) pd ON true
  WHERE pl.location_id = p_location_id;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies if using Supabase Auth
-- Uncomment and modify based on your auth setup:
/*
ALTER TABLE pollution_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pollution_data ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public can read pollution locations" 
ON pollution_locations FOR SELECT USING (true);

CREATE POLICY "Public can read pollution data" 
ON pollution_data FOR SELECT USING (true);

-- Admin insert/update access (adjust based on your auth setup)
CREATE POLICY "Authenticated users can insert pollution data" 
ON pollution_data FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');
*/

-- Comments
COMMENT ON TABLE pollution_locations IS 'Stores air pollution monitoring station locations and metadata';
COMMENT ON TABLE pollution_data IS 'Stores hourly air quality measurements including particulates, gases, pollen, and AQI indices';
COMMENT ON VIEW latest_pollution_data IS 'Shows the most recent air quality reading for each location';
COMMENT ON FUNCTION get_aqi_category IS 'Converts numeric AQI to categorical description (Good, Fair, Moderate, etc.)';
COMMENT ON FUNCTION get_pollution_at_time IS 'Retrieves air quality data for a location at or before a specified time';
