"""
Import air pollution data from CSV files into Supabase database
"""

import csv
import psycopg2
from psycopg2.extras import execute_batch
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

# Database connection parameters
DB_CONFIG = {
    'host': os.getenv('host'),
    'port': int(os.getenv('port', 6543)),
    'database': os.getenv('dbname'),
    'user': os.getenv('user'),
    'password': os.getenv('password'),
}

def create_pollution_tables():
    """Create tables for air pollution data if they don't exist"""
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    # Create locations table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pollution_locations (
            location_id INTEGER PRIMARY KEY,
            latitude DOUBLE PRECISION NOT NULL,
            longitude DOUBLE PRECISION NOT NULL,
            elevation REAL,
            timezone TEXT,
            timezone_abbreviation TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    """)
    
    # Create pollution data table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pollution_data (
            id BIGSERIAL PRIMARY KEY,
            location_id INTEGER NOT NULL REFERENCES pollution_locations(location_id),
            measured_at TIMESTAMPTZ NOT NULL,
            pm10 REAL,
            pm2_5 REAL,
            pm1 REAL,
            carbon_monoxide REAL,
            carbon_dioxide REAL,
            nitrogen_dioxide REAL,
            sulphur_dioxide REAL,
            ozone REAL,
            ammonia REAL,
            methane REAL,
            dust REAL,
            aerosol_optical_depth REAL,
            uv_index REAL,
            uv_index_clear_sky REAL,
            ragweed_pollen REAL,
            olive_pollen REAL,
            alder_pollen REAL,
            birch_pollen REAL,
            grass_pollen REAL,
            mugwort_pollen REAL,
            european_aqi INTEGER,
            us_aqi INTEGER,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    """)
    
    # Create indexes
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_pollution_location_time 
        ON pollution_data(location_id, measured_at DESC);
    """)
    
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_pollution_time 
        ON pollution_data(measured_at DESC);
    """)
    
    conn.commit()
    cursor.close()
    conn.close()
    print("✓ Tables created successfully")

def load_locations(csv_file):
    """Load location data from CSV header"""
    locations = {}
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get('location_id'):
                location_id = int(row['location_id'])
                if location_id not in locations:
                    locations[location_id] = {
                        'latitude': float(row['latitude']),
                        'longitude': float(row['longitude']),
                        'elevation': float(row.get('elevation', 0)),
                        'timezone': row.get('timezone'),
                        'timezone_abbreviation': row.get('timezone_abbreviation')
                    }
    return locations

def insert_locations(locations):
    """Insert locations into database"""
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    for location_id, data in locations.items():
        cursor.execute("""
            INSERT INTO pollution_locations 
            (location_id, latitude, longitude, elevation, timezone, timezone_abbreviation)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (location_id) DO NOTHING;
        """, (location_id, data['latitude'], data['longitude'], 
              data['elevation'], data['timezone'], data['timezone_abbreviation']))
    
    conn.commit()
    cursor.close()
    conn.close()
    print(f"✓ Inserted {len(locations)} locations")

def parse_value(value):
    """Parse CSV value to float or None"""
    if not value or value.strip() == '':
        return None
    try:
        return float(value)
    except ValueError:
        return None

def import_pollution_data(csv_file):
    """Import pollution data from CSV file"""
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    rows = []
    column_map = {}
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        # Map CSV columns to database columns
        if reader.fieldnames:
            for i, col in enumerate(reader.fieldnames):
                column_map[col] = i
        
        for row in reader:
            if not row.get('time'):  # Skip location header rows
                continue
            
            try:
                data = (
                    int(row['location_id']),
                    row['time'],
                    parse_value(row.get('pm10 (μg/m³)')),
                    parse_value(row.get('pm2_5 (μg/m³)')),
                    parse_value(row.get('pm1 (μg/m³)')),
                    parse_value(row.get('carbon_monoxide (μg/m³)')),
                    parse_value(row.get('carbon_dioxide (ppm)')),
                    parse_value(row.get('nitrogen_dioxide (μg/m³)')),
                    parse_value(row.get('sulphur_dioxide (μg/m³)')),
                    parse_value(row.get('ozone (μg/m³)')),
                    parse_value(row.get('ammonia (μg/m³)')),
                    parse_value(row.get('methane (μg/m³)')),
                    parse_value(row.get('dust (μg/m³)')),
                    parse_value(row.get('aerosol_optical_depth ()')),
                    parse_value(row.get('uv_index ()')),
                    parse_value(row.get('uv_index_clear_sky ()')),
                    parse_value(row.get('ragweed_pollen (grains/m³)')),
                    parse_value(row.get('olive_pollen (grains/m³)')),
                    parse_value(row.get('alder_pollen (grains/m³)')),
                    parse_value(row.get('birch_pollen (grains/m³)')),
                    parse_value(row.get('grass_pollen (grains/m³)')),
                    parse_value(row.get('mugwort_pollen (grains/m³)')),
                    parse_value(row.get('european_aqi (EAQI)')),
                    parse_value(row.get('us_aqi (USAQI)'))
                )
                rows.append(data)
            except (ValueError, KeyError) as e:
                print(f"⚠ Skipped row: {e}")
    
    # Batch insert
    if rows:
        execute_batch(cursor, """
            INSERT INTO pollution_data 
            (location_id, measured_at, pm10, pm2_5, pm1, carbon_monoxide, carbon_dioxide,
             nitrogen_dioxide, sulphur_dioxide, ozone, ammonia, methane, dust,
             aerosol_optical_depth, uv_index, uv_index_clear_sky, 
             ragweed_pollen, olive_pollen, alder_pollen, birch_pollen, grass_pollen,
             mugwort_pollen, european_aqi, us_aqi)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING;
        """, rows, page_size=100)
        
        conn.commit()
        print(f"✓ Imported {len(rows)} records from {csv_file}")
    
    cursor.close()
    conn.close()

def main():
    print("🔄 Starting air pollution data import...\n")
    
    # Create tables
    create_pollution_tables()
    
    # Data directory
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    
    # Load and insert locations from first file
    first_file = os.path.join(data_dir, 'full_data_pollution.csv')
    if os.path.exists(first_file):
        locations = load_locations(first_file)
        insert_locations(locations)
    
    # Import data from all CSV files
    csv_files = [
        'full_data_pollution.csv',
        'pollution_one_year.csv',
        'open-meteo.csv'
    ]
    
    for csv_file in csv_files:
        file_path = os.path.join(data_dir, csv_file)
        if os.path.exists(file_path):
            print(f"\n📥 Importing {csv_file}...")
            import_pollution_data(file_path)
        else:
            print(f"⚠ File not found: {csv_file}")
    
    print("\n✨ Import complete!")
    
    # Show summary
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM pollution_locations;")
    location_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM pollution_data;")
    data_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT MIN(measured_at), MAX(measured_at) FROM pollution_data;")
    min_time, max_time = cursor.fetchone()
    
    cursor.close()
    conn.close()
    
    print(f"\n📊 Database Summary:")
    print(f"   Locations: {location_count}")
    print(f"   Data records: {data_count}")
    print(f"   Date range: {min_time} to {max_time}")

if __name__ == '__main__':
    main()
