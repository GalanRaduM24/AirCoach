import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pg from 'pg';

dotenv.config();

const router = express.Router();
const { Pool } = pg;

// Database connection (reuse from aiSql.js logic)
const dbPort = (() => {
    if (process.env.PGPORT) return Number(process.env.PGPORT);
    if (process.env.PORT) return 5432; // ignore server port
    if (process.env.port) return Number(process.env.port) || 5432;
    return 5432;
})();

const pool = new Pool({
    user: process.env.PGUSER || process.env.user,
    password: process.env.PGPASSWORD || process.env.password,
    host: process.env.PGHOST || process.env.host,
    port: dbPort,
    database: process.env.PGDATABASE || process.env.dbname,
    max: 5,
    idleTimeoutMillis: 10_000,
    ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
});

// Initialize Gemini
const genAI = process.env.GOOGLE_GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
    : null;

const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';

// Database schema context for the agent
const DATABASE_SCHEMA = `
Available Tables and Schema:

1. **pollution_locations** - Air pollution monitoring locations
   Columns: location_id (INTEGER PRIMARY KEY), latitude, longitude, elevation, timezone, timezone_abbreviation, created_at, updated_at

2. **pollution_data** - Air quality measurements
   Columns: id (BIGSERIAL PRIMARY KEY), location_id (references pollution_locations), measured_at (TIMESTAMPTZ)
   - Particulate Matter: pm10, pm2_5, pm1, dust, aerosol_optical_depth
   - Gases: carbon_monoxide, carbon_dioxide, nitrogen_dioxide, sulphur_dioxide, ozone, ammonia, methane
   - Pollen: ragweed_pollen, olive_pollen, alder_pollen, birch_pollen, grass_pollen, mugwort_pollen
   - UV: uv_index, uv_index_clear_sky
   - Air Quality Indices: european_aqi (0-500), us_aqi (0-500)
   - created_at, updated_at

3. **road_segments** - Road segment geometries
   Columns: id (BIGSERIAL PRIMARY KEY), segment_id (TEXT UNIQUE), geometry (JSONB), road_name, functional_road_class, created_at, updated_at

4. **traffic_data** - Traffic measurements
   Columns: id (BIGSERIAL PRIMARY KEY), segment_id (TEXT), current_speed (INTEGER), free_flow_speed (INTEGER), confidence, congestion_level (TEXT), collected_at (TIMESTAMPTZ), created_at
   **IMPORTANT**: Use "collected_at" NOT "measured_at" for timestamps

5. **environmental_events** - Environmental news and events
   Columns: id (BIGSERIAL PRIMARY KEY), title, content, url, source_type, source_name, author
   - Location: location_text, latitude, longitude, sector (INTEGER), neighborhood, address
   - Classification: event_type (TEXT[]), severity (TEXT: 'low'|'medium'|'high'|'critical')
   - Temporal: published_at (TIMESTAMPTZ), scraped_at, expires_at
   - Other: embedding (vector), language, verified, view_count, created_at, updated_at

Views:
- latest_pollution_data: Most recent air quality for each location
- latest_traffic: Most recent traffic data for all segments
- recent_high_priority_events: Last 48h high/critical severity events

Functions:
- get_aqi_category(aqi_value) → 'Good'|'Fair'|'Moderate'|'Poor'|'Very Poor'|'Severe'
- get_pollution_at_time(location_id, target_time) → air quality at specific time
- get_traffic_at_time(target_time) → traffic data at timestamp
- get_events_by_sector(sector, hours_ago, limit) → recent events for sector
- get_events_near_location(lat, lon, radius_km, hours_ago, limit) → events within radius

Notes:
- Bucharest has 6 sectors (1-6). Location IDs 0-5 correspond to sectors 1-6
- Traffic uses "collected_at", pollution uses "measured_at"
- Congestion levels: 'free_flow', 'moderate', 'slow', 'congested', 'closed'
- Event severity: 'low', 'medium', 'high', 'critical'
`;

// System prompt for the agent
const AGENT_SYSTEM_PROMPT = `You are AirCoach, an intelligent environmental assistant for Bucharest, Romania.

Your role is to help users understand air quality, traffic conditions, and environmental events in their area.

You have access to a PostgreSQL database with real-time data:
${DATABASE_SCHEMA}

TRAFFIC & ROUTING INTELLIGENCE:
- Current time matters: Rush hours (7-9 AM, 5-7 PM) are busier
- December weather: cold, rain clears traffic, fog may increase caution
- Alternative routes: Magheru Boulevard, Calea Victoriei, Splaiul Independenței (quieter alternatives)
- Seasonal patterns: weekends less congested, weekday mornings/evenings busy

When a user asks about routing:
1. Check current time - suggest waiting if asking during peak hours
2. Query latest traffic data for actual congestion
3. Compare alternatives and recommend the clearest route
4. Consider weather: rain = less traffic, fog = safer route
5. Be specific: road names, speeds, timing advice (e.g., "Wait 30 min" or "Go now")

When a user asks a question:
1. Determine what data they need (air quality, traffic, events, or combination)
2. Generate appropriate SQL queries to fetch the data
3. Analyze the results and provide helpful, conversational responses
4. Include health recommendations when discussing air quality
5. Be specific about locations (sectors, neighborhoods)
6. Format numbers clearly (e.g., "PM2.5: 15.3 μg/m³")

AGENTIC CAPABILITIES - When users ask about travel/navigation:
- If they mention a destination or route: Query traffic data to find congested areas
- Analyze congestion_level (free_flow, moderate, slow, congested) on different roads
- Recommend alternative routes avoiding congested areas
- Provide specific road names and current congestion status
- Suggest timing (e.g., "Wait 15 minutes for traffic to clear" or "Go now, traffic is light")
- Include air quality factors if relevant to their health
- Check environmental events that might affect travel (fires, accidents, closures)
- Always provide actionable advice with specific locations and reasons

IMPORTANT RULES:
- Only generate SELECT queries (no INSERT/UPDATE/DELETE)
- Always use LIMIT to prevent huge result sets
- When querying recent data, use appropriate time filters
- Prefer views and functions when available (e.g., latest_pollution_data, latest_traffic)
- Be conversational and helpful, not robotic
- When giving route recommendations, be specific about which roads to use or avoid

Example queries you might generate:
- "SELECT * FROM latest_pollution_data WHERE location_id = 2 LIMIT 1"
- "SELECT * FROM get_events_by_sector(3, 24, 10)"
- "SELECT road_name, congestion_level, current_speed, free_flow_speed FROM latest_traffic WHERE congestion_level IN ('congested', 'slow') ORDER BY road_name LIMIT 20"
- "SELECT road_name, congestion_level FROM latest_traffic ORDER BY congestion_level DESC LIMIT 15"
`;

/**
 * Generate SQL query from natural language
 */
async function generateSQL(userQuestion) {
    if (!genAI) throw new Error('Gemini API not configured');

    const model = genAI.getGenerativeModel({ model: geminiModel });

    const prompt = `${AGENT_SYSTEM_PROMPT}

User question: "${userQuestion}"

Generate a safe, read-only SQL query to answer this question. Return ONLY the SQL query, no explanations or markdown.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const sql = text.replace(/```sql|```/g, '').trim();

    return sql;
}

/**
 * Check if SQL is a valid SELECT query
 */
function isValidSelectQuery(sql) {
    const lowered = sql.toLowerCase().trim();
    
    // Must start with SELECT
    if (!lowered.startsWith('select')) {
        return false;
    }
    
    // Must not contain forbidden operations
    const forbidden = ['insert', 'update', 'delete', 'drop', 'alter', 'truncate', 'create', 'grant', 'revoke'];
    if (forbidden.some(word => lowered.includes(word))) {
        return false;
    }
    
    return true;
}

/**
 * Execute SQL query safely
 */
async function executeQuery(sql) {
    // Safety check
    const lowered = sql.toLowerCase();
    const forbidden = ['insert', 'update', 'delete', 'drop', 'alter', 'truncate', 'create', 'grant', 'revoke'];

    if (!lowered.startsWith('select')) {
        throw new Error('Only SELECT queries are allowed');
    }

    if (forbidden.some(word => lowered.includes(word))) {
        throw new Error('Query contains forbidden operations');
    }

    const client = await pool.connect();
    try {
        // Add LIMIT if not present and query doesn't end with semicolon (likely a simple SELECT)
        const trimmed = sql.trim();
        const needsLimit = !lowered.includes('limit') && 
                          !trimmed.endsWith(';') && 
                          lowered.includes('from');
        const limitedSql = needsLimit ? `${sql} LIMIT 100` : sql;
        const { rows } = await client.query(limitedSql);
        return rows;
    } finally {
        client.release();
    }
}

/**
 * Generate a Google Maps link based on destination
 */
function generateMapsLink(destination, origin = "Bucharest, Romania", travelMode = "walking") {
    // Encode the destination for URL
    const encodedOrigin = encodeURIComponent(origin);
    const encodedDestination = encodeURIComponent(destination);
    
    // Create Google Maps directions URL with walking mode
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodedOrigin}&destination=${encodedDestination}&travelmode=${travelMode}`;
    
    return mapsUrl;
}

/**
 * Validate and filter traffic results for sensible recommendations
 * Removes outliers and weird suggestions
 */
function validateAndFilterTrafficResults(rows, userQuestion) {
    if (!rows || rows.length === 0) return rows;
    
    // Check if this is a routing question
    const isRouting = /^(how|where|which|best|route|way|avoid|get to|going to|go to|travel|navigate)/i.test(userQuestion);
    if (!isRouting) return rows; // Don't filter non-routing questions
    
    // For routing: filter to roads that are actually relevant
    // Keep roads with meaningful speed differences or clear congestion levels
    const filtered = rows.filter(row => {
        // If road has name and speed data, likely legitimate
        if (row.road_name && (row.current_speed !== undefined || row.congestion_level)) {
            return true;
        }
        return false;
    });
    
    // Sort by congestion level to prioritize clear recommendations
    // Order: free_flow > moderate > slow > congested
    const congestionOrder = { 'free_flow': 0, 'moderate': 1, 'slow': 2, 'congested': 3 };
    filtered.sort((a, b) => {
        const aLevel = congestionOrder[a.congestion_level] ?? 99;
        const bLevel = congestionOrder[b.congestion_level] ?? 99;
        return aLevel - bLevel;
    });
    
    return filtered.length > 0 ? filtered : rows;
}

/**
 * Generate natural language response from query results
 */
async function generateResponse(userQuestion, sql, rows, executionError = null) {
    if (!genAI) throw new Error('Gemini API not configured');

    const model = genAI.getGenerativeModel({ model: geminiModel });
    
    // Filter results for routing questions
    const filteredRows = validateAndFilterTrafficResults(rows, userQuestion);
    const limitedRows = filteredRows.slice(0, 10);
    const hasData = filteredRows.length > 0;
    
    // Get current time context
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0=Sunday, 6=Saturday
    const isDayTime = hour >= 7 && hour < 21;
    const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
    const isWeekend = day === 0 || day === 6;
    
    const timeContext = `Current time: ${hour}:${String(now.getMinutes()).padStart(2, '0')} (${isPeakHour ? 'PEAK HOUR' : isWeekend ? 'Weekend' : 'Regular time'})`;
    
    const isOffTopic = executionError === 'off-topic';
    
    // Determine question type to focus response
    const isRoutingQuestion = /^(how|where|which|best|route|way|avoid|get to|going to|go to|travel|navigate)/i.test(userQuestion);
    const isAirQualityQuestion = /air quality|pollution|pm2|pm10|aqi|particulate|pollutants/i.test(userQuestion);
    const isPollenQuestion = /pollen|allerg/i.test(userQuestion);
    const isTrafficQuestion = /traffic|congestion|congested|slow|speed/i.test(userQuestion);
    const isWeatherQuestion = /weather|rain|wind|temperature|condition|forecast/i.test(userQuestion);

    let dataContext = '';
    if (isOffTopic) {
        dataContext = 'Non-environmental topic. Politely decline and suggest air quality, traffic, weather, or events questions.';
    } else if (hasData) {
        dataContext = `Data found (${filteredRows.length} results):\n${JSON.stringify(limitedRows, null, 2)}`;
    } else {
        dataContext = 'No data. Use general knowledge about Bucharest.';
    }

    // Build a focused prompt based on question type
    let focusInstructions = '';
    if (isRoutingQuestion) {
        focusInstructions = `ROUTING QUESTION - Address route/navigation with TIME-AWARE suggestions.
${timeContext}
${isPeakHour ? `⚠️ PEAK HOUR! Consider suggesting: "Wait 30 minutes" or "Take Magheru/quieter alternatives"` : `Good time to travel.`}
Analyze traffic: recommend roads to AVOID and GOOD alternatives with speeds.
Format: "Avoid [Road] ([speed] km/h). Take [Road] instead ([speed] km/h)." 
${isPeakHour ? 'Add timing suggestion if traffic very congested.' : ''}
2-3 sentences max. Use only road names, no coordinates.`;
    } else if (isAirQualityQuestion) {
        focusInstructions = `AIR QUALITY QUESTION - Only address air quality.
Brief verdict (good/moderate/poor/bad), 1 practical tip. 1-2 sentences max.`;
    } else if (isPollenQuestion) {
        focusInstructions = `POLLEN QUESTION - Only address pollen levels.
Status and which types are active/inactive. 1 sentence max.`;
    } else if (isTrafficQuestion) {
        focusInstructions = `TRAFFIC QUESTION - Only address traffic conditions.
${timeContext}
List top congested roads and speeds. 2 sentences max.
${isPeakHour ? 'Mention it is peak hour.' : ''}`;
    } else if (isWeatherQuestion) {
        focusInstructions = `WEATHER QUESTION - Only address weather.
Current/expected conditions for December. 1-2 sentences max.`;
    }

    const prompt = `You are AirCoach, focused environmental assistant for Bucharest.

User asked: "${userQuestion}"

${focusInstructions}

Data: ${dataContext}

${hasData ? 'Validate data: only recommend roads/conditions that make sense. Use current time, traffic patterns, and weather knowledge.' : 'Use time-aware general knowledge about Bucharest traffic patterns.'}

Keep response SHORT (2-3 sentences maximum). Be conversational. Focus ONLY on what was asked.
${isPeakHour && isRoutingQuestion ? 'Consider suggesting wait time or alternative timing if traffic is very congested.' : ''}

Response:`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
}

/**
 * Main agent endpoint
 */
router.post('/chat', async (req, res) => {
    const { message, conversationHistory = [], userLocation, travelMode = 'walking' } = req.body || {};

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'message is required' });
    }

    try {
        // Step 1: Generate SQL query
        const sql = await generateSQL(message);
        console.log('[agent] Generated SQL:', sql);

        let rows = [];
        let executionError = null;

        // Step 2: Check if SQL is valid before executing
        if (!isValidSelectQuery(sql)) {
            console.log('[agent] Invalid SQL (not a SELECT query), skipping execution');
            executionError = 'off-topic';
        } else {
            try {
                // Execute query
                rows = await executeQuery(sql);
                console.log('[agent] Query returned', rows.length, 'rows');
                
                // Validate and filter results based on question type
                rows = validateAndFilterTrafficResults(rows, message);
                console.log('[agent] After validation:', rows.length, 'rows');
            } catch (error) {
                console.log('[agent] Query execution error:', error.message);
                executionError = error.message;
                rows = [];
            }
        }

        // Step 3: Generate natural language response
        const response = await generateResponse(message, sql, rows, executionError);

        // Step 4: Generate Google Maps link if relevant (destination mentioned)
        let mapsLink = null;
        const destinationPatterns = [
            /(?:to|going to|visit|head to|get to|go to)\s+([A-Za-z\s,]+?)(?:\?|$|but|and|though)/i,
            /(?:mall|mall\s+named|store|restaurant|location)\s+([A-Za-z\s,]+?)(?:\?|$|but|and)/i,
            /(AFI|Afi|MALL|mall|[A-Z][a-z]+\s+(?:mall|mall))/i,
        ];

        for (const pattern of destinationPatterns) {
            const match = message.match(pattern);
            if (match) {
                const destination = match[1]?.trim() || match[0];
                if (destination && destination.length > 2) {
                    // Use user location if available, otherwise use Bucharest center
                    const origin = userLocation 
                        ? `${userLocation.latitude},${userLocation.longitude}` 
                        : "Bucharest, Romania";
                    mapsLink = generateMapsLink(destination + ", Bucharest, Romania", origin, travelMode);
                    break;
                }
            }
        }

        return res.json({
            response,
            sql,
            rowCount: rows.length,
            data: rows.slice(0, 10), // Return first 10 rows for reference
            mapsLink, // Include Google Maps link if detected
        });

    } catch (error) {
        console.error('[agent] Error:', error);
        return res.status(500).json({
            error: 'Agent failed to process request',
            detail: error.message,
        });
    }
});

/**
 * Quick data endpoint - get latest air quality for a sector
 */
router.get('/air-quality/:sector', async (req, res) => {
    const sector = parseInt(req.params.sector);

    if (isNaN(sector) || sector < 1 || sector > 6) {
        return res.status(400).json({ error: 'Sector must be 1-6' });
    }

    const client = await pool.connect();
    try {
        const locationId = sector - 1; // location_id 0-5 maps to sectors 1-6
        const { rows } = await client.query(
            'SELECT * FROM latest_pollution_data WHERE location_id = $1',
            [locationId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'No data found for this sector' });
        }

        return res.json(rows[0]);
    } catch (error) {
        console.error('[agent] Error fetching air quality:', error);
        return res.status(500).json({ error: 'Failed to fetch air quality data' });
    } finally {
        client.release();
    }
});

/**
 * Get recent environmental events for a sector
 */
router.get('/events/:sector', async (req, res) => {
    const sector = parseInt(req.params.sector);
    const hoursAgo = parseInt(req.query.hours) || 48;

    if (isNaN(sector) || sector < 1 || sector > 6) {
        return res.status(400).json({ error: 'Sector must be 1-6' });
    }

    const client = await pool.connect();
    try {
        const { rows } = await client.query(
            'SELECT * FROM get_events_by_sector($1, $2, 20)',
            [sector, hoursAgo]
        );

        return res.json({
            sector,
            hoursAgo,
            eventCount: rows.length,
            events: rows,
        });
    } catch (error) {
        console.error('[agent] Error fetching events:', error);
        return res.status(500).json({ error: 'Failed to fetch events' });
    } finally {
        client.release();
    }
});

/**
 * Get current traffic conditions
 */
router.get('/traffic/congested', async (req, res) => {
    const client = await pool.connect();
    try {
        const { rows } = await client.query(`
      SELECT 
        rs.road_name,
        rs.road_classification,
        td.current_speed,
        td.free_flow_speed,
        td.congestion_level,
        td.measured_at
      FROM traffic_data td
      JOIN road_segments rs ON td.segment_id = rs.segment_id
      WHERE td.congestion_level IN ('congested', 'slow')
        AND td.measured_at >= NOW() - INTERVAL '2 hours'
      ORDER BY td.measured_at DESC
      LIMIT 20
    `);

        return res.json({
            congestedRoads: rows.length,
            roads: rows,
        });
    } catch (error) {
        console.error('[agent] Error fetching traffic:', error);
        return res.status(500).json({ error: 'Failed to fetch traffic data' });
    } finally {
        client.release();
    }
});

/**
 * Health check
 */
router.get('/health', async (req, res) => {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();

        return res.json({
            status: 'ok',
            database: 'connected',
            gemini: genAI ? 'configured' : 'not configured',
        });
    } catch (error) {
        return res.status(500).json({
            status: 'error',
            database: 'disconnected',
            error: error.message,
        });
    }
});

export default router;
