# Bucharest Traffic Data Collection - Backend

This folder contains all the scripts and configuration for collecting traffic data from TomTom API and storing it in Supabase.

## Files

### Main Scripts
- **`traffic_collector_db.py`** - Main data collector
  - Collects traffic from TomTom Flow Segment Data API
  - Stores data in Supabase PostgreSQL
  - Supports both 25-road and 480-grid sampling

- **`generate_grid.py`** - Grid generator
  - Creates 480 sampling points across Bucharest
  - ~1km spacing for comprehensive coverage

- **`clear_database.py`** - Database utility
  - Clears all traffic data from database
  - Use before re-collecting with updated code

### Configuration Files
- **`bucharest_roads.json`** - 25 major roads with street names
- **`bucharest_roads_grid.json`** - 480 grid points (auto-generated)
- **`supabase_schema.sql`** - Database schema
- **`requirements.txt`** - Python dependencies
- **`.env.example`** - Environment variables template

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment:**
   - Copy `.env.example` to `.env`
   - Add your TomTom API key
   - Add your Supabase credentials

3. **Create database tables:**
   - Run `supabase_schema.sql` in Supabase SQL Editor

## Usage

### Collect from 25 Main Roads
```bash
python traffic_collector_db.py --collect-once
```
- Fast: ~15 seconds
- 25 API calls
- Named streets

### Collect from 480 Grid Points
```bash
python traffic_collector_db.py --grid --collect-once
```
- Comprehensive: ~4 minutes
- 480 API calls
- Full city coverage
- Road classifications (Motorway, Major Road, etc.)

### Test Connection
```bash
python traffic_collector_db.py --test
```

### Clear Database
```bash
python clear_database.py
```

## API Usage

**TomTom Free Tier:** 2,500 calls/day

**Recommended Schedule:**
- 480-grid collection 4x per day = 1,920 calls ✅
- Times: 8 AM, 12 PM, 6 PM, 12 AM

## Database Schema

### `road_segments` Table
- Stores road geometries and names
- One row per unique road segment

### `traffic_data` Table
- Stores hourly traffic measurements
- Links to road_segments via segment_id
- Includes speed, congestion level, timestamp

## Output

Data is saved to Supabase with:
- Road name/classification
- Current speed
- Free-flow speed
- Congestion level (free_flow, moderate, slow, congested, closed)
- Coordinates
- Timestamp

View data in Supabase Table Editor or query via SQL.
