# Backend API Documentation

## Overview

Node.js + Express backend with AI-powered environmental intelligence for Bucharest.

**Features:**
- 🤖 Natural language chat agent (Gemini AI)
- 📊 Text-to-SQL query generation
- 🌍 Air quality, traffic, and environmental events data
- 🔒 Read-only database access with safety guardrails

---

## Architecture

```
┌─────────────────┐
│  Mobile App     │
│  (React Native) │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  Express API    │
│  Port 4000      │
├─────────────────┤
│ /agent/chat     │ ← Natural language queries
│ /agent/...      │ ← Quick data endpoints
│ /ai/sql         │ ← Direct SQL generation
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Gemini 2.0     │      │  Supabase        │
│  Flash Exp      │      │  PostgreSQL      │
└─────────────────┘      └──────────────────┘
```

---

## Environment Variables

Required in `.env`:

```env
# AI Service
GOOGLE_GEMINI_API_KEY=your_gemini_api_key

# Database (Supabase PostgreSQL)
user=postgres.xxxxx
password=your_password
host=aws-1-eu-west-1.pooler.supabase.com
port=5432
dbname=postgres

# Server
PORT=4000

# Optional
GEMINI_MODEL=gemini-2.0-flash-exp  # default model
```

---

## API Endpoints

### 🤖 Agent Endpoints

#### `POST /agent/chat`
Natural language chat with the agent.

**Request:**
```json
{
  "message": "What's the air quality in Sector 3?",
  "conversationHistory": []  // optional, for future use
}
```

**Response:**
```json
{
  "response": "The air quality in Sector 3 is currently Good with an AQI of 42. PM2.5 levels are at 10.5 μg/m³, which is well within safe limits. Great conditions for outdoor activities!",
  "sql": "SELECT * FROM latest_pollution_data WHERE location_id = 2 LIMIT 1",
  "rowCount": 1,
  "data": [{ /* first 10 rows */ }]
}
```

**Example Questions:**
- "What's the air quality in Sector 3?"
- "Show me congested roads right now"
- "Any environmental events in the last 24 hours?"
- "What's the PM2.5 level in Sector 1?"
- "Are there any fires or emergencies reported?"

---

#### `GET /agent/air-quality/:sector`
Get latest air quality for a specific sector (1-6).

**Response:**
```json
{
  "location_id": 2,
  "latitude": 44.4481,
  "longitude": 26.1253,
  "measured_at": "2025-12-07T10:00:00Z",
  "pm10": 18.2,
  "pm2_5": 10.5,
  "nitrogen_dioxide": 12.3,
  "ozone": 45.6,
  "european_aqi": 42,
  "us_aqi": 38
}
```

---

#### `GET /agent/events/:sector?hours=48`
Get recent environmental events for a sector.

**Query Parameters:**
- `hours` (optional): How many hours back to search (default: 48)

**Response:**
```json
{
  "sector": 3,
  "hoursAgo": 48,
  "eventCount": 5,
  "events": [
    {
      "id": 123,
      "title": "Incendiu în Sectorul 3",
      "content": "...",
      "event_type": ["fire"],
      "severity": "high",
      "published_at": "2025-12-07T08:00:00Z",
      "url": "https://...",
      "neighborhood": "Titan"
    }
  ]
}
```

---

#### `GET /agent/traffic/congested`
Get currently congested roads.

**Response:**
```json
{
  "congestedRoads": 8,
  "roads": [
    {
      "road_name": "Șoseaua Colentina",
      "road_classification": "Major Road",
      "current_speed": 15,
      "free_flow_speed": 50,
      "congestion_level": "congested",
      "measured_at": "2025-12-07T10:00:00Z"
    }
  ]
}
```

---

#### `GET /agent/health`
Health check for agent service.

**Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "gemini": "configured"
}
```

---

### 🔧 AI SQL Endpoints

#### `POST /ai/sql`
Direct text-to-SQL query generation (legacy endpoint).

**Request:**
```json
{
  "question": "Show me all pollution data from the last hour"
}
```

**Response:**
```json
{
  "sql": "SELECT * FROM pollution_data WHERE measured_at >= NOW() - INTERVAL '1 hour' LIMIT 100",
  "rows": [{ /* query results */ }]
}
```

---

## Database Schema

The agent has access to these tables:

### Air Pollution
- `pollution_data` - Hourly measurements (PM2.5, PM10, NO2, O3, CO, AQI, etc.)
- `pollution_locations` - 6 monitoring locations (sectors 1-6)
- `latest_pollution_data` - View of most recent readings

### Traffic
- `road_segments` - Road geometries and names
- `traffic_data` - Hourly traffic measurements (speed, congestion)

### Environmental Events
- `environmental_events` - News events with location tags
  - Event types: fire, traffic, pollution, construction, festival, road_closure, weather, health
  - Severity: low, medium, high, critical

### Functions
- `get_aqi_category(aqi)` - Convert AQI to text (Good/Fair/Moderate/Poor/Very Poor/Severe)
- `get_events_by_sector(sector, hours_ago, limit)` - Get events for a sector
- `get_events_near_location(lat, lon, radius_km, hours_ago, limit)` - Spatial search
- `get_pollution_at_time(location_id, timestamp)` - Historical air quality

---

## Agent Capabilities

The agent can answer questions about:

### Air Quality 🌫️
- Current AQI and pollutant levels
- Health recommendations
- Sector-specific readings
- Historical trends
- Pollen levels

### Traffic 🚗
- Congested roads
- Average speeds
- Road classifications
- Real-time conditions

### Environmental Events 🔥
- Fires and emergencies
- Road closures
- Construction work
- Public events
- Weather impacts
- Health alerts

---

## Safety Features

1. **Read-Only Queries**: Only SELECT statements allowed
2. **Forbidden Operations**: Blocks INSERT, UPDATE, DELETE, DROP, ALTER, etc.
3. **Automatic LIMIT**: Adds LIMIT 100 if not specified
4. **Input Validation**: Checks for malicious SQL patterns
5. **Connection Pooling**: Max 5 concurrent connections
6. **Error Handling**: Graceful error responses

---

## Example Usage

### From Frontend (React Native)

```typescript
// Natural language chat
const response = await fetch('http://localhost:4000/agent/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "What's the air quality in Sector 3?"
  })
});

const data = await response.json();
console.log(data.response); // Natural language answer
```

### From cURL

```bash
# Chat with agent
curl -X POST http://localhost:4000/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me congested roads"}'

# Get air quality
curl http://localhost:4000/agent/air-quality/3

# Get events
curl http://localhost:4000/agent/events/3?hours=24

# Get traffic
curl http://localhost:4000/agent/traffic/congested
```

---

## Running the Server

### Development
```bash
cd app/backend
npm install
npm run dev
```

### Production
```bash
npm start
```

Server runs on `http://localhost:4000` (or PORT env variable).

---

## Troubleshooting

### "Gemini not configured"
- Check `GOOGLE_GEMINI_API_KEY` in `.env`
- Verify API key is valid

### "Database connection failed"
- Check PostgreSQL credentials in `.env`
- Verify Supabase connection pooler is accessible
- Test with: `curl http://localhost:4000/agent/health`

### "Query contains forbidden operations"
- Agent only allows SELECT queries
- Check if Gemini generated unsafe SQL (rare)

### "No data found"
- Ensure data pipelines have run
- Check if tables exist in Supabase
- Verify location_id mapping (0-5 = sectors 1-6)

---

## Performance

- **Response Time**: ~1-3 seconds (includes AI generation + DB query)
- **Concurrent Requests**: Up to 5 (connection pool limit)
- **Token Usage**: ~500-1000 tokens per chat request
- **Database Queries**: Optimized with indexes

---

## Future Enhancements

- [ ] Conversation history and context
- [ ] Multi-turn conversations
- [ ] Voice input/output
- [ ] Push notifications for critical events
- [ ] Caching for common queries
- [ ] Rate limiting
- [ ] User authentication
- [ ] Query result visualization
- [ ] Export data to CSV/JSON

---

## Files

- `src/server.js` - Express server setup
- `src/agent.js` - Agent endpoints (chat, air quality, events, traffic)
- `src/aiSql.js` - Direct SQL generation endpoint
- `.env` - Environment configuration
- `package.json` - Dependencies

---

## Dependencies

```json
{
  "@google/generative-ai": "^0.8.0",
  "express": "^4.19.2",
  "pg": "^8.11.5",
  "cors": "^2.8.5",
  "dotenv": "^16.4.5"
}
```

---

## License

MIT
