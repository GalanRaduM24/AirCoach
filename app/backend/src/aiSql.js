import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pg from 'pg';

dotenv.config();

const router = express.Router();
const { Pool } = pg;

const requiredEnv = ['GOOGLE_GEMINI_API_KEY'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.warn(`[ai-sql] Missing env ${key}`);
  }
}

const genAI = process.env.GOOGLE_GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
  : null;

const dbPort = (() => {
  if (process.env.PGPORT) return Number(process.env.PGPORT);
  if (process.env.PORT) return 5432; // avoid picking up server port on Windows
  if (process.env.port) return Number(process.env.port) || 5432;
  return 5432;
})();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || buildConnectionString(dbPort),
  user: process.env.PGUSER || process.env.user,
  password: process.env.PGPASSWORD || process.env.password,
  host: process.env.PGHOST || process.env.host,
  port: dbPort,
  database: process.env.PGDATABASE || process.env.dbname,
  max: 5,
  idleTimeoutMillis: 10_000,
  ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
});

function buildConnectionString(portOverride) {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/^https?:\/\//, '');
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseKey) {
    return `postgresql://postgres:${encodeURIComponent(supabaseKey)}@${supabaseUrl}:5432/postgres`;
  }
  const u = process.env.PGUSER || process.env.user;
  const p = process.env.PGPASSWORD || process.env.password;
  const h = process.env.PGHOST || process.env.host;
  const db = process.env.PGDATABASE || process.env.dbname;
  if (u && p && h && db) {
    const pt = portOverride || process.env.PGPORT || process.env.port || 5432;
    return `postgresql://${encodeURIComponent(u)}:${encodeURIComponent(p)}@${h}:${pt}/${db}`;
  }
  return undefined;
}

const systemGuardrails = `
You are an assistant that writes a single safe, read-only SQL query for PostgreSQL.
Rules:
- Only SELECT. Never INSERT/UPDATE/DELETE/ALTER/DROP/TRUNCATE/CREATE.
- Use only tables/columns from the provided schema snapshot.
- Prefer LIMIT 100 when unspecified.
- Return a single SQL statement, no explanations.
`;

async function fetchSchemaSnapshot(client) {
  const sql = `
    SELECT table_schema, table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema NOT IN ('information_schema','pg_catalog')
    ORDER BY table_schema, table_name, ordinal_position;
  `;
  const { rows } = await client.query(sql);
  return rows;
}

function formatSchema(schemaRows) {
  const grouped = {};
  for (const r of schemaRows) {
    const key = `${r.table_schema}.${r.table_name}`;
    grouped[key] = grouped[key] || [];
    grouped[key].push(`${r.column_name} (${r.data_type})`);
  }
  return Object.entries(grouped)
    .map(([tbl, cols]) => `${tbl}: ${cols.join(', ')}`)
    .join('\n');
}

function isSafeSelect(sql) {
  const lowered = sql.toLowerCase();
  const forbidden = ['insert', 'update', 'delete', 'drop', 'alter', 'truncate', 'create', 'grant', 'revoke'];
  if (!lowered.startsWith('select')) return false;
  return !forbidden.some((w) => lowered.includes(w));
}

const geminiModelName = process.env.GEMINI_MODEL || 'gemini-2.5-pro';

async function generateSql(question, schemaText) {
  if (!genAI) throw new Error('Gemini not configured');
  const model = genAI.getGenerativeModel({ model: geminiModelName });
  const prompt = `${systemGuardrails}\nSchema:\n${schemaText}\nUser question: ${question}\nReturn only SQL:`;
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const sql = text.replace(/```sql|```/g, '').trim();
  return sql;
}

router.post('/', async (req, res) => {
  const { question } = req.body || {};
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question is required' });
  }

  const client = await pool.connect();
  try {
    const schemaRows = await fetchSchemaSnapshot(client);
    const schemaText = formatSchema(schemaRows);
    const sql = await generateSql(question, schemaText);

    if (!isSafeSelect(sql)) {
      return res.status(400).json({ error: 'Generated SQL failed safety check', sql });
    }

    const limitedSql = sql.toLowerCase().includes('limit') ? sql : `${sql} LIMIT 100`;
    const { rows } = await client.query(limitedSql);
    return res.json({ sql: limitedSql, rows });
  } catch (err) {
    console.error('[ai-sql] error', err);
    return res.status(500).json({ error: 'AI SQL failed', detail: err.message });
  } finally {
    client.release();
  }
});

export default router;
