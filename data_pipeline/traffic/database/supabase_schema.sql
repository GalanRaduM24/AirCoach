-- Supabase Database Schema for Traffic Data Collection
-- Run this in your Supabase SQL Editor

-- Table to store road segment geometries
CREATE TABLE IF NOT EXISTS road_segments (
  id BIGSERIAL PRIMARY KEY,
  segment_id TEXT UNIQUE NOT NULL,
  geometry JSONB NOT NULL, -- Array of [lat, lon] coordinates
  road_name TEXT,
  functional_road_class TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast segment lookups
CREATE INDEX IF NOT EXISTS idx_segment_id ON road_segments(segment_id);

-- Table to store hourly traffic data
CREATE TABLE IF NOT EXISTS traffic_data (
  id BIGSERIAL PRIMARY KEY,
  segment_id TEXT NOT NULL,
  current_speed INTEGER NOT NULL,
  free_flow_speed INTEGER NOT NULL,
  confidence DOUBLE PRECISION,
  congestion_level TEXT NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_traffic_collected_at ON traffic_data(collected_at);
CREATE INDEX IF NOT EXISTS idx_traffic_segment_id ON traffic_data(segment_id);
CREATE INDEX IF NOT EXISTS idx_traffic_segment_time ON traffic_data(segment_id, collected_at);

-- Add foreign key constraint (optional, for data integrity)
-- Note: We use TEXT instead of REFERENCES to avoid issues if segments are added dynamically
-- ALTER TABLE traffic_data ADD CONSTRAINT fk_segment 
--   FOREIGN KEY (segment_id) REFERENCES road_segments(segment_id);

-- Create a view for easy querying of latest traffic
CREATE OR REPLACE VIEW latest_traffic AS
SELECT 
  rs.segment_id,
  rs.geometry,
  rs.road_name,
  rs.functional_road_class,
  td.current_speed,
  td.free_flow_speed,
  td.confidence,
  td.congestion_level,
  td.collected_at
FROM road_segments rs
LEFT JOIN LATERAL (
  SELECT *
  FROM traffic_data
  WHERE segment_id = rs.segment_id
  ORDER BY collected_at DESC
  LIMIT 1
) td ON true;

-- Create a function to get traffic at a specific time
CREATE OR REPLACE FUNCTION get_traffic_at_time(target_time TIMESTAMPTZ)
RETURNS TABLE (
  segment_id TEXT,
  geometry JSONB,
  road_name TEXT,
  current_speed INTEGER,
  free_flow_speed INTEGER,
  congestion_level TEXT,
  collected_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rs.segment_id,
    rs.geometry,
    rs.road_name,
    td.current_speed,
    td.free_flow_speed,
    td.congestion_level,
    td.collected_at
  FROM road_segments rs
  LEFT JOIN LATERAL (
    SELECT *
    FROM traffic_data
    WHERE traffic_data.segment_id = rs.segment_id
      AND collected_at <= target_time
    ORDER BY collected_at DESC
    LIMIT 1
  ) td ON true
  WHERE td.current_speed IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE road_segments IS 'Stores road segment geometries for Bucharest';
COMMENT ON TABLE traffic_data IS 'Stores hourly traffic measurements for each road segment';
COMMENT ON VIEW latest_traffic IS 'Shows the most recent traffic data for all segments';
COMMENT ON FUNCTION get_traffic_at_time IS 'Retrieves traffic data at or before a specific timestamp';
