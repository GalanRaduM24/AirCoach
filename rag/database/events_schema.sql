-- Database schema for RAG environmental events
-- Run this in your Supabase SQL Editor

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Table to store scraped environmental events/news
CREATE TABLE IF NOT EXISTS environmental_events (
  id BIGSERIAL PRIMARY KEY,
  
  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT,
  
  -- Source metadata
  source_type TEXT NOT NULL, -- 'news', 'social', 'web_search', 'official'
  source_name TEXT,          -- 'HotNews', 'Digi24', 'Instagram', etc.
  author TEXT,
  
  -- Location data
  location_text TEXT,        -- Raw location mentions (e.g., "Sector 3, Bucuresti")
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  sector INTEGER,
  neighborhood TEXT,
  address TEXT,
  
  -- Event classification
  event_type TEXT[],         -- ['fire', 'traffic', 'pollution', 'construction', 'festival', 'road_closure']
  severity TEXT,             -- 'low', 'medium', 'high', 'critical'
  
  -- Temporal data
  published_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,    -- Auto-cleanup old events
  
  -- Embeddings for semantic search
  embedding vector(1536),    -- OpenAI ada-002 embeddings
  
  -- Metadata
  language TEXT DEFAULT 'ro',
  verified BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_events_published_at ON environmental_events(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_location ON environmental_events(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_sector ON environmental_events(sector) WHERE sector IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_event_type ON environmental_events USING GIN(event_type);
CREATE INDEX IF NOT EXISTS idx_events_source_type ON environmental_events(source_type);
CREATE INDEX IF NOT EXISTS idx_events_expires_at ON environmental_events(expires_at) WHERE expires_at IS NOT NULL;

-- Vector similarity search index (requires pgvector extension)
CREATE INDEX IF NOT EXISTS idx_events_embedding ON environmental_events 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Function to find events near a location
CREATE OR REPLACE FUNCTION get_events_near_location(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION DEFAULT 5.0,
  p_hours_ago INTEGER DEFAULT 168, -- 7 days default
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  content TEXT,
  url TEXT,
  source_name TEXT,
  event_type TEXT[],
  severity TEXT,
  published_at TIMESTAMPTZ,
  distance_km DOUBLE PRECISION,
  location_text TEXT,
  neighborhood TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.content,
    e.url,
    e.source_name,
    e.event_type,
    e.severity,
    e.published_at,
    -- Haversine distance calculation
    (
      6371 * acos(
        cos(radians(p_latitude)) * 
        cos(radians(e.latitude)) * 
        cos(radians(e.longitude) - radians(p_longitude)) + 
        sin(radians(p_latitude)) * 
        sin(radians(e.latitude))
      )
    ) AS distance_km,
    e.location_text,
    e.neighborhood
  FROM environmental_events e
  WHERE 
    e.latitude IS NOT NULL 
    AND e.longitude IS NOT NULL
    AND e.published_at >= NOW() - (p_hours_ago || ' hours')::INTERVAL
    AND (
      6371 * acos(
        cos(radians(p_latitude)) * 
        cos(radians(e.latitude)) * 
        cos(radians(e.longitude) - radians(p_longitude)) + 
        sin(radians(p_latitude)) * 
        sin(radians(e.latitude))
      )
    ) <= p_radius_km
  ORDER BY published_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to search events by semantic similarity
CREATE OR REPLACE FUNCTION search_events_by_embedding(
  query_embedding vector(1536),
  p_hours_ago INTEGER DEFAULT 168,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  content TEXT,
  url TEXT,
  source_name TEXT,
  event_type TEXT[],
  published_at TIMESTAMPTZ,
  similarity DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.content,
    e.url,
    e.source_name,
    e.event_type,
    e.published_at,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM environmental_events e
  WHERE 
    e.published_at >= NOW() - (p_hours_ago || ' hours')::INTERVAL
    AND e.embedding IS NOT NULL
  ORDER BY e.embedding <=> query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get recent events by sector
CREATE OR REPLACE FUNCTION get_events_by_sector(
  p_sector INTEGER,
  p_hours_ago INTEGER DEFAULT 168,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  content TEXT,
  url TEXT,
  source_name TEXT,
  event_type TEXT[],
  severity TEXT,
  published_at TIMESTAMPTZ,
  neighborhood TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.content,
    e.url,
    e.source_name,
    e.event_type,
    e.severity,
    e.published_at,
    e.neighborhood
  FROM environmental_events e
  WHERE 
    e.sector = p_sector
    AND e.published_at >= NOW() - (p_hours_ago || ' hours')::INTERVAL
  ORDER BY published_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Cleanup function for old events
CREATE OR REPLACE FUNCTION cleanup_old_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM environmental_events
  WHERE 
    (expires_at IS NOT NULL AND expires_at < NOW())
    OR (published_at < NOW() - INTERVAL '90 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Auto-cleanup job (run daily)
-- Note: You'll need to set up a cron job or use Supabase Edge Functions for this
-- Example: SELECT cron.schedule('cleanup-old-events', '0 2 * * *', 'SELECT cleanup_old_events();');

-- View for recent high-priority events
CREATE OR REPLACE VIEW recent_high_priority_events AS
SELECT 
  id,
  title,
  content,
  url,
  source_name,
  event_type,
  severity,
  sector,
  neighborhood,
  published_at,
  location_text
FROM environmental_events
WHERE 
  published_at >= NOW() - INTERVAL '48 hours'
  AND severity IN ('high', 'critical')
ORDER BY published_at DESC;

-- Comments
COMMENT ON TABLE environmental_events IS 'Stores scraped environmental events, news, and social media posts with location tagging';
COMMENT ON COLUMN environmental_events.event_type IS 'Array of event categories: fire, traffic, pollution, construction, festival, road_closure, etc.';
COMMENT ON COLUMN environmental_events.embedding IS 'OpenAI text-embedding-ada-002 vector for semantic search';
COMMENT ON FUNCTION get_events_near_location IS 'Find events within a radius of a geographic point';
COMMENT ON FUNCTION search_events_by_embedding IS 'Semantic search using vector similarity';
COMMENT ON FUNCTION get_events_by_sector IS 'Get recent events for a specific Bucharest sector';
