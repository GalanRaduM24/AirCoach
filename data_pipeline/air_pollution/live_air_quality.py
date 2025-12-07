"""
Live Air Quality Data Fetcher using Google Air Quality API
Fetches real-time pollution, pollen, and weather data for Bucharest locations
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional

import requests
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Import 1000 locations from generated file
sys.path.insert(0, str(Path(__file__).parent / 'database'))
try:
    from locations_1000 import BUCHAREST_LOCATIONS
except ImportError:
    # Fallback if import fails
    BUCHAREST_LOCATIONS = []

# Database configuration
DB_CONFIG = {
    'host': os.getenv('host'),
    'port': int(os.getenv('port', 5432)),
    'database': os.getenv('dbname'),
    'user': os.getenv('user'),
    'password': os.getenv('password'),
}

# Google Air Quality API
GOOGLE_AQ_API_KEY = os.getenv('GOOGLE_AIR_QUALITY_API_KEY')
GOOGLE_AQ_BASE_URL = "https://airquality.googleapis.com/v1"

# Note: 1000 monitoring locations loaded from database/locations_1000.py


def fetch_current_air_quality(lat: float, lon: float) -> Optional[Dict]:
    """
    Fetch current air quality data from Google Air Quality API
    
    Returns:
    {
        "dateTime": "2025-12-07T10:00:00Z",
        "indexes": [{"aqi": 45, "category": "Good", "dominantPollutant": "pm25"}],
        "pollutants": [
            {"code": "pm25", "displayName": "PM2.5", "concentration": 12.5, "units": "μg/m³"},
            {"code": "pm10", "displayName": "PM10", "concentration": 25.0, "units": "μg/m³"},
            {"code": "no2", "displayName": "NO2", "concentration": 15.3, "units": "μg/m³"},
            {"code": "o3", "displayName": "O3", "concentration": 45.8, "units": "μg/m³"},
            {"code": "so2", "displayName": "SO2", "concentration": 2.1, "units": "μg/m³"},
            {"code": "co", "displayName": "CO", "concentration": 250.0, "units": "μg/m³"}
        ],
        "healthRecommendations": {...}
    }
    """
    if not GOOGLE_AQ_API_KEY:
        print("[ERROR] GOOGLE_AIR_QUALITY_API_KEY not set")
        return None
    
    url = f"{GOOGLE_AQ_BASE_URL}/currentConditions:lookup"
    
    payload = {
        "location": {
            "latitude": lat,
            "longitude": lon
        },
        "extraComputations": [
            "HEALTH_RECOMMENDATIONS",
            "DOMINANT_POLLUTANT_CONCENTRATION",
            "POLLUTANT_CONCENTRATION",
            "LOCAL_AQI"
        ]
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    params = {
        "key": GOOGLE_AQ_API_KEY
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] API request failed: {e}")
        return None


def fetch_pollen_data(lat: float, lon: float, days: int = 1) -> Optional[Dict]:
    """
    Fetch pollen forecast data from Google Air Quality API
    
    Returns:
    {
        "dailyInfo": [
            {
                "date": "2025-12-07",
                "plantInfo": [
                    {"code": "GRASS", "displayName": "Grass", "indexInfo": {"value": 2, "category": "Low"}},
                    {"code": "TREE", "displayName": "Tree", "indexInfo": {"value": 1, "category": "None"}},
                    {"code": "WEED", "displayName": "Weed", "indexInfo": {"value": 3, "category": "Moderate"}}
                ]
            }
        ]
    }
    """
    if not GOOGLE_AQ_API_KEY:
        return None
    
    # Use Pollen API endpoint (different from Air Quality API)
    url = "https://pollen.googleapis.com/v1/forecast:lookup"
    
    payload = {
        "location": {
            "latitude": lat,
            "longitude": lon
        },
        "days": days,
        "languageCode": "en"
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    params = {
        "key": GOOGLE_AQ_API_KEY
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    
    except requests.exceptions.RequestException as e:
        # Pollen API requires separate enablement in Google Cloud Console
        # Silently fail and continue without pollen data
        return None


def save_to_database(location: Dict, aq_data: Dict, pollen_data: Optional[Dict] = None):
    """Save live air quality data to database"""
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    # Extract pollutants from API response
    pollutants = {}
    if 'pollutants' in aq_data:
        for pollutant in aq_data['pollutants']:
            code = pollutant.get('code', '').lower()
            # The concentration is a dict with value and units
            conc_data = pollutant.get('concentration', {})
            if isinstance(conc_data, dict):
                concentration = conc_data.get('value')
            else:
                concentration = conc_data
            
            if code == 'pm10':
                pollutants['pm10'] = concentration
            elif code == 'pm2_5' or code == 'pm25':
                pollutants['pm2_5'] = concentration
            elif code == 'pm1':
                pollutants['pm1'] = concentration
            elif code == 'co':
                pollutants['carbon_monoxide'] = concentration
            elif code == 'no2':
                pollutants['nitrogen_dioxide'] = concentration
            elif code == 'o3':
                pollutants['ozone'] = concentration
            elif code == 'so2':
                pollutants['sulphur_dioxide'] = concentration
            elif code == 'nh3':
                pollutants['ammonia'] = concentration
            elif code == 'ch4':
                pollutants['methane'] = concentration
    
    # Extract AQI
    aqi_value = None
    if 'indexes' in aq_data and len(aq_data['indexes']) > 0:
        aqi_value = aq_data['indexes'][0].get('aqi')
    
    # Insert air quality data
    cursor.execute("""
        INSERT INTO pollution_data 
        (location_id, measured_at, pm10, pm2_5, pm1, carbon_monoxide, nitrogen_dioxide, ozone, sulphur_dioxide, ammonia, methane, european_aqi, us_aqi)
        VALUES (%s, NOW(), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        location['id'],
        pollutants.get('pm10'),
        pollutants.get('pm2_5'),
        pollutants.get('pm1'),
        pollutants.get('carbon_monoxide'),
        pollutants.get('nitrogen_dioxide'),
        pollutants.get('ozone'),
        pollutants.get('sulphur_dioxide'),
        pollutants.get('ammonia'),
        pollutants.get('methane'),
        aqi_value,
        aqi_value
    ))
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print(f"[OK] Saved data for {location['name']} - AQI: {aqi_value}")


def fetch_all_locations():
    """Fetch current air quality for all Bucharest sectors"""
    print("[*] Fetching live air quality data for Bucharest...\n")
    
    for location in BUCHAREST_LOCATIONS:
        print(f"[*] {location['name']}")
        
        # Fetch air quality
        aq_data = fetch_current_air_quality(location['lat'], location['lon'])
        if not aq_data:
            print(f"   [!] Failed to fetch air quality")
            continue
        
        # Fetch pollen data
        pollen_data = fetch_pollen_data(location['lat'], location['lon'])
        if pollen_data:
            print(f"   [OK] Pollen data retrieved")
        
        # Display summary
        if 'indexes' in aq_data and aq_data['indexes']:
            idx = aq_data['indexes'][0]
            print(f"   AQI: {idx.get('aqi')} - {idx.get('category')} ({idx.get('dominantPollutant')})")
        
        if 'pollutants' in aq_data:
            for p in aq_data['pollutants']:
                conc = p.get('concentration', {})
                if conc:
                    print(f"   {p['displayName']}: {conc.get('value')} {conc.get('units')}")
        
        # Save to database
        save_to_database(location, aq_data, pollen_data)
        print()
    
    print("[*] Fetch complete!")


def get_latest_reading(sector: int) -> Optional[Dict]:
    """Get the most recent air quality reading for a sector"""
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT 
            measured_at, pm10, pm2_5, carbon_monoxide,
            nitrogen_dioxide, sulphur_dioxide, ozone,
            grass_pollen, ragweed_pollen, european_aqi
        FROM pollution_data
        WHERE location_id = %s
        ORDER BY measured_at DESC
        LIMIT 1
    """, (sector,))
    
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if result:
        return {
            'measured_at': result[0],
            'pm10': result[1],
            'pm2_5': result[2],
            'co': result[3],
            'no2': result[4],
            'so2': result[5],
            'o3': result[6],
            'grass_pollen': result[7],
            'weed_pollen': result[8],
            'aqi': result[9]
        }
    
    return None


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'fetch':
            fetch_all_locations()
        
        elif command == 'latest' and len(sys.argv) > 2:
            sector = int(sys.argv[2])
            data = get_latest_reading(sector)
            if data:
                print(json.dumps(data, indent=2, default=str))
            else:
                print(f"No data found for sector {sector}")
        
        else:
            print("Unknown command")
    
    else:
        print("Usage:")
        print("  python live_air_quality.py fetch          # Fetch current data for all locations")
        print("  python live_air_quality.py latest <sector> # Get latest reading for sector 1-6")
