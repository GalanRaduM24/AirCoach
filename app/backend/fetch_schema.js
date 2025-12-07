import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  user: process.env.user,
  password: process.env.password,
  host: process.env.host,
  port: Number(process.env.port) || 5432,
  database: process.env.dbname,
  ssl: { rejectUnauthorized: false },
});

async function fetchSchema() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('traffic_data', 'road_segments', 'pollution_data', 'pollution_locations', 'environmental_events')
      ORDER BY table_name, ordinal_position
    `);
    
    const grouped = {};
    rows.forEach(r => {
      if (!grouped[r.table_name]) grouped[r.table_name] = [];
      grouped[r.table_name].push(`${r.column_name} (${r.data_type})`);
    });
    
    console.log('\n=== DATABASE SCHEMA ===\n');
    Object.entries(grouped).forEach(([table, cols]) => {
      console.log(`${table}:`);
      console.log(`  ${cols.join(', ')}`);
      console.log('');
    });
  } finally {
    client.release();
    pool.end();
  }
}

fetchSchema().catch(console.error);
