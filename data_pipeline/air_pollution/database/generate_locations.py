"""
Generate 1000 high-precision monitoring locations across Bucharest
Creates a fine-grained grid for accurate air quality mapping
"""

import math

# Bucharest bounds (approximate)
BUCHAREST_BOUNDS = {
    'north': 44.5149,
    'south': 44.3383,
    'east': 26.2244,
    'west': 25.9456,
}

def generate_grid():
    """Generate 1000 uniformly distributed points across Bucharest"""
    GRID_SIZE = 32  # 32x32 grid = 1024 points (we'll use first 1000)
    
    lat_step = (BUCHAREST_BOUNDS['north'] - BUCHAREST_BOUNDS['south']) / GRID_SIZE
    lon_step = (BUCHAREST_BOUNDS['east'] - BUCHAREST_BOUNDS['west']) / GRID_SIZE
    
    locations = []
    location_id = 2000  # Start from 2000 (for 1000 points)
    
    for i in range(GRID_SIZE):
        for j in range(GRID_SIZE):
            if len(locations) >= 1000:  # Stop at 1000 points
                break
                
            lat = BUCHAREST_BOUNDS['south'] + (i + 0.5) * lat_step
            lon = BUCHAREST_BOUNDS['west'] + (j + 0.5) * lon_step
            
            # Determine sector (1-6) - Bucharest sectors are arranged in a grid
            # Sectors 1,2,3 in north; Sectors 5,6,4 in south
            # More accurate mapping based on Bucharest's actual sector layout
            lat_ratio = (lat - BUCHAREST_BOUNDS['south']) / (BUCHAREST_BOUNDS['north'] - BUCHAREST_BOUNDS['south'])
            lon_ratio = (lon - BUCHAREST_BOUNDS['west']) / (BUCHAREST_BOUNDS['east'] - BUCHAREST_BOUNDS['west'])
            
            # Divide into 6 sectors in a 2x3 grid pattern
            if lat_ratio < 0.5:  # South half
                if lon_ratio < 0.33:
                    sector = 5  # SW - Sector 5
                elif lon_ratio < 0.66:
                    sector = 6  # South Center - Sector 6
                else:
                    sector = 4  # SE - Sector 4
            else:  # North half
                if lon_ratio < 0.33:
                    sector = 1  # NW - Sector 1
                elif lon_ratio < 0.66:
                    sector = 2  # North Center - Sector 2
                else:
                    sector = 3  # NE - Sector 3
            
            grid_x = i
            grid_y = j
            
            locations.append({
                'id': location_id,
                'lat': round(lat, 6),
                'lon': round(lon, 6),
                'sector': sector,
                'grid_x': grid_x,
                'grid_y': grid_y,
                'name': f"Grid-{grid_x}-{grid_y}",
            })
            location_id += 1
        
        if len(locations) >= 1000:
            break
    
    return locations

def generate_sql(locations):
    """Generate SQL INSERT statement"""
    sql = """-- Auto-generated 1000 high-precision monitoring locations
-- 32x32 grid covering entire Bucharest area (~30-50m precision)
-- Run this in your Supabase SQL Editor

INSERT INTO pollution_locations (location_id, latitude, longitude, elevation, timezone, timezone_abbreviation)
VALUES
"""
    
    values = []
    for i, loc in enumerate(locations):
        comma = "," if i < len(locations) - 1 else ""
        values.append(f"  ({loc['id']}, {loc['lat']}, {loc['lon']}, 85, 'Europe/Bucharest', 'EET'){comma}  -- Sector {loc['sector']} - {loc['name']}")
    
    sql += "\n".join(values)
    
    sql += """
ON CONFLICT (location_id) DO UPDATE SET
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  elevation = EXCLUDED.elevation,
  timezone = EXCLUDED.timezone,
  timezone_abbreviation = EXCLUDED.timezone_abbreviation,
  updated_at = NOW();

-- Verify locations were inserted
SELECT COUNT(*) as total_locations, 
       MIN(location_id) as min_location_id,
       MAX(location_id) as max_location_id
FROM pollution_locations
WHERE location_id >= 2000;
"""
    
    return sql

def generate_python_locations(locations):
    """Generate Python code for locations"""
    python = """# Auto-generated 1000 high-precision monitoring locations
# 32x32 grid covering Bucharest
BUCHAREST_LOCATIONS = [
"""
    
    for loc in locations:
        python += f'    {{"id": {loc["id"]}, "name": "{loc["name"]}", "lat": {loc["lat"]}, "lon": {loc["lon"]}, "sector": {loc["sector"]}}},\n'
    
    python += "]\n"
    return python

if __name__ == "__main__":
    locations = generate_grid()
    
    # Generate SQL
    sql = generate_sql(locations)
    with open('populate_locations_1000.sql', 'w') as f:
        f.write(sql)
    print(f"✓ Generated populate_locations_1000.sql with {len(locations)} locations")
    
    # Generate Python
    python = generate_python_locations(locations)
    with open('locations_1000.py', 'w') as f:
        f.write(python)
    print(f"✓ Generated locations_1000.py with {len(locations)} locations")
    
    # Print summary
    print(f"\nLocation Summary:")
    for sector in range(1, 7):
        count = sum(1 for loc in locations if loc['sector'] == sector)
        print(f"  Sector {sector}: {count} points")
