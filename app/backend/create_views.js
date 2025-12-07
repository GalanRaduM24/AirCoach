import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Resolve DB port correctly (avoid picking up server PORT)
const dbPort = (() => {
  if (process.env.PGPORT) return Number(process.env.PGPORT);
  if (process.env.PORT) return 5432; // Ignore server port if set
  if (process.env.port) return Number(process.env.port) || 5432;
  return 5432;
})();

const pool = new Pool({
  user: process.env.user || process.env.PGUSER,
  password: process.env.password || process.env.PGPASSWORD,
  host: process.env.host || process.env.PGHOST,
  port: dbPort,
  database: process.env.dbname || process.env.PGDATABASE,
  ssl: { rejectUnauthorized: false },
});

async function createViews() {
  const client = await pool.connect();
  try {
    console.log('Testing connection...');
    const versionResult = await client.query('SELECT version();');
    console.log('✓ Connected to PostgreSQL:', versionResult.rows[0].version.substring(0, 50) + '...\n');

    console.log('Creating database views...\n');

    // Create latest_pollution_data view
    console.log('Creating latest_pollution_data view...');
    await client.query(`
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
    `);
    console.log('✓ latest_pollution_data view created\n');

    // Create latest_traffic view
    console.log('Creating latest_traffic view...');
    await client.query(`
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
    `);
    console.log('✓ latest_traffic view created\n');

    // Create recent_high_priority_events view
    console.log('Creating recent_high_priority_events view...');
    await client.query(`
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
    `);
    console.log('✓ recent_high_priority_events view created\n');

    console.log('✅ All views created successfully!');
  } catch (error) {
    console.error('❌ Error creating views:', error.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

createViews();
