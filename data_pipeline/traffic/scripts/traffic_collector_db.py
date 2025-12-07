#!/usr/bin/env python3
"""
Traffic Data Collector for Bucharest
Collects hourly traffic data from TomTom Flow Segment Data API and stores in Supabase PostgreSQL
"""

import os
import sys
import json
import requests
import argparse
import psycopg2
from datetime import datetime
from pathlib import Path
from typing import List, Dict
from dotenv import load_dotenv
import schedule
import time

# Load environment variables
load_dotenv()

# Configuration
TOMTOM_API_KEY = os.getenv('TOMTOM_API_KEY')
DB_USER = os.getenv('user')
DB_PASSWORD = os.getenv('password')
DB_HOST = os.getenv('host')
DB_PORT = os.getenv('port')
DB_NAME = os.getenv('dbname')

ROADS_CONFIG_FILE = "../config/bucharest_roads.json"
ROADS_GRID_FILE = "../config/bucharest_roads_grid.json"
BASE_URL = "https://api.tomtom.com/traffic/services/4/flowSegmentData"


class TrafficCollector:
    """Collects traffic data from TomTom API and stores in PostgreSQL"""
    
    def __init__(self, use_grid=False):
        if not TOMTOM_API_KEY:
            raise ValueError("TOMTOM_API_KEY not set in .env")
        if not all([DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME]):
            raise ValueError("Database credentials not set in .env")
        
        self.api_key = TOMTOM_API_KEY
        self.use_grid = use_grid
        self.roads = self._load_roads_config()
        self.db_connection = None
    
    def _load_roads_config(self) -> List[Dict]:
        """Load road segments configuration from JSON file"""
        config_file = ROADS_GRID_FILE if self.use_grid else ROADS_CONFIG_FILE
        
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
                roads = config.get('roads', [])
                print(f"✓ Loaded {len(roads)} sampling points from {config_file}")
                return roads
        except FileNotFoundError:
            print(f"Error: {config_file} not found")
            return []
        except json.JSONDecodeError as e:
            print(f"Error parsing {config_file}: {e}")
            return []
    
    def connect_db(self):
        """Connect to PostgreSQL database"""
        try:
            self.db_connection = psycopg2.connect(
                user=DB_USER,
                password=DB_PASSWORD,
                host=DB_HOST,
                port=DB_PORT,
                dbname=DB_NAME
            )
            print("✓ Database connected")
            return True
        except Exception as e:
            print(f"✗ Database connection failed: {e}")
            return False
    
    def close_db(self):
        """Close database connection"""
        if self.db_connection:
            self.db_connection.close()
            print("✓ Database connection closed")
    
    def fetch_traffic_for_point(self, lat: float, lon: float, road_name: str) -> Dict:
        """
        Fetch traffic data for a specific point using TomTom Flow Segment Data API
        
        Args:
            lat: Latitude
            lon: Longitude
            road_name: Name of the road
        
        Returns:
            Dictionary with traffic data or None if request fails
        """
        url = f"{BASE_URL}/absolute/10/json"
        
        params = {
            'key': self.api_key,
            'point': f"{lat},{lon}",
            'unit': 'KMPH'
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            flow_data = data.get('flowSegmentData', {})
            
            if not flow_data:
                print(f"  ⚠️  No flow data for {road_name}")
                return None
            
            # Extract traffic data
            current_speed = flow_data.get('currentSpeed', 0)
            free_flow_speed = flow_data.get('freeFlowSpeed', 0)
            confidence = flow_data.get('confidence', 0)
            road_closure = flow_data.get('roadClosure', False)
            
            # Extract actual street name from API response
            actual_street_name = road_name  # Default to passed name
            
            # Try to get street name from coordinates data if available
            coordinates_data = flow_data.get('coordinates', {})
            if coordinates_data and 'coordinate' in coordinates_data:
                coords = coordinates_data['coordinate']
                if coords and len(coords) > 0:
                    first_coord = coords[0]
                    if isinstance(first_coord, dict) and 'street' in first_coord:
                        actual_street_name = first_coord['street']
            
            # If still no street name and we have frc, use a descriptive name
            frc = flow_data.get('frc', 'FRC7')  # Functional Road Class
            if actual_street_name == road_name and road_name.startswith('Grid Point'):
                # Use FRC to give a better description
                frc_names = {
                    'FRC0': 'Motorway',
                    'FRC1': 'Major Road',
                    'FRC2': 'Important Road',
                    'FRC3': 'Secondary Road',
                    'FRC4': 'Local Road',
                    'FRC5': 'Minor Road',
                    'FRC6': 'Small Road',
                    'FRC7': 'Local Street'
                }
                road_type = frc_names.get(frc, 'Road')
                actual_street_name = f"{road_type} at {lat:.4f},{lon:.4f}"
            
            # Calculate congestion level
            if free_flow_speed > 0:
                speed_ratio = current_speed / free_flow_speed
                if speed_ratio >= 0.9:
                    congestion = "free_flow"
                elif speed_ratio >= 0.6:
                    congestion = "moderate"
                elif speed_ratio >= 0.3:
                    congestion = "slow"
                else:
                    congestion = "congested"
            else:
                congestion = "unknown"
            
            if road_closure:
                congestion = "closed"
            
            # Create segment_id from coordinates
            segment_id = f"seg_{lat}_{lon}".replace('.', '_')
            
            traffic_info = {
                'segment_id': segment_id,
                'road_name': actual_street_name,  # Use extracted street name
                'lat': lat,
                'lon': lon,
                'current_speed': current_speed,
                'free_flow_speed': free_flow_speed,
                'confidence': confidence,
                'road_closure': road_closure,
                'congestion_level': congestion,
                'frc': frc  # Save road class for reference
            }
            
            print(f"  ✓ {actual_street_name}: {current_speed} km/h ({congestion})")
            return traffic_info
            
        except requests.exceptions.RequestException as e:
            print(f"  ✗ Error fetching data for {road_name}: {e}")
            return None
        except Exception as e:
            print(f"  ✗ Unexpected error for {road_name}: {e}")
            return None
    
    def save_road_segment(self, segment_data: Dict):
        """Save or update road segment in database"""
        try:
            cursor = self.db_connection.cursor()
            
            # Insert or update road segment
            cursor.execute("""
                INSERT INTO road_segments (segment_id, geometry, road_name, functional_road_class)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (segment_id) DO UPDATE
                SET road_name = EXCLUDED.road_name,
                    updated_at = NOW()
            """, (
                segment_data['segment_id'],
                json.dumps([[segment_data['lat'], segment_data['lon']]]),  # Simple point geometry
                segment_data['road_name'],
                'primary'  # Default road class
            ))
            
            self.db_connection.commit()
            cursor.close()
            
        except Exception as e:
            print(f"  ✗ Error saving road segment: {e}")
            self.db_connection.rollback()
    
    def save_traffic_data(self, traffic_data: Dict, collected_at: datetime):
        """Save traffic data to database"""
        try:
            cursor = self.db_connection.cursor()
            
            cursor.execute("""
                INSERT INTO traffic_data 
                (segment_id, current_speed, free_flow_speed, confidence, congestion_level, collected_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                traffic_data['segment_id'],
                traffic_data['current_speed'],
                traffic_data['free_flow_speed'],
                traffic_data['confidence'],
                traffic_data['congestion_level'],
                collected_at
            ))
            
            self.db_connection.commit()
            cursor.close()
            
        except Exception as e:
            print(f"  ✗ Error saving traffic data: {e}")
            self.db_connection.rollback()
    
    def collect_all_roads(self):
        """Collect traffic data for all configured roads"""
        print(f"\n{'='*60}")
        print(f"Starting traffic data collection at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}\n")
        
        collected_at = datetime.now()
        roads_collected = 0
        
        for i, road in enumerate(self.roads, 1):
            print(f"[{i}/{len(self.roads)}] Collecting: {road['name']}")
            
            traffic_info = self.fetch_traffic_for_point(
                road['lat'],
                road['lon'],
                road['name']
            )
            
            if traffic_info:
                # Save road segment (if not exists)
                self.save_road_segment(traffic_info)
                
                # Save traffic data
                self.save_traffic_data(traffic_info, collected_at)
                
                roads_collected += 1
            
            # Small delay to avoid rate limiting
            if i < len(self.roads):
                time.sleep(0.5)
        
        print(f"\n{'='*60}")
        print(f"✓ Collection complete: {roads_collected}/{len(self.roads)} roads")
        print(f"✓ Data saved to database at {collected_at.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}\n")
    
    def test_connection(self):
        """Test API and database connections"""
        print("\n" + "="*60)
        print("Testing Connections")
        print("="*60 + "\n")
        
        # Test database
        print("1. Testing PostgreSQL connection...")
        if not self.connect_db():
            return False
        
        try:
            cursor = self.db_connection.cursor()
            cursor.execute("SELECT NOW();")
            result = cursor.fetchone()
            print(f"  ✓ Database connected (Current time: {result[0]})")
            
            # Check if tables exist
            cursor.execute("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name IN ('road_segments', 'traffic_data')
            """)
            tables = cursor.fetchall()
            print(f"  ✓ Found tables: {[t[0] for t in tables]}")
            
            if len(tables) < 2:
                print("  ⚠️  Warning: Not all tables exist. Run supabase_schema.sql first!")
            
            cursor.close()
        except Exception as e:
            print(f"  ✗ Database error: {e}")
            return False
        
        # Test TomTom API
        print("\n2. Testing TomTom API...")
        if not self.roads:
            print("  ✗ No roads configured in bucharest_roads.json")
            return False
        
        test_road = self.roads[0]
        print(f"  Testing with: {test_road['name']}")
        
        result = self.fetch_traffic_for_point(
            test_road['lat'],
            test_road['lon'],
            test_road['name']
        )
        
        if result:
            print("\n" + "="*60)
            print("✓ All connections successful!")
            print("="*60)
            return True
        else:
            print("\n" + "="*60)
            print("✗ TomTom API test failed")
            print("="*60)
            return False


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Collect traffic data from TomTom API and store in PostgreSQL'
    )
    parser.add_argument(
        '--grid',
        action='store_true',
        help='Use grid-based sampling (500 points) instead of 25 main roads'
    )
    parser.add_argument(
        '--test',
        action='store_true',
        help='Test API and database connections'
    )
    parser.add_argument(
        '--collect-once',
        action='store_true',
        help='Collect traffic data once for all roads'
    )
    parser.add_argument(
        '--continuous',
        action='store_true',
        help='Collect traffic data every hour (runs indefinitely)'
    )
    
    args = parser.parse_args()
    
    try:
        collector = TrafficCollector(use_grid=args.grid)
        
        if args.test:
            success = collector.test_connection()
            collector.close_db()
            sys.exit(0 if success else 1)
        
        elif args.collect_once:
            if collector.connect_db():
                collector.collect_all_roads()
                collector.close_db()
        
        elif args.continuous:
            print("\n" + "="*60)
            print("Starting Continuous Hourly Collection")
            print("Press Ctrl+C to stop")
            print("="*60 + "\n")
            
            if not collector.connect_db():
                sys.exit(1)
            
            # Collect immediately
            collector.collect_all_roads()
            
            # Schedule hourly collection
            schedule.every().hour.do(collector.collect_all_roads)
            
            print(f"Next collection scheduled for top of next hour")
            
            try:
                while True:
                    schedule.run_pending()
                    time.sleep(60)
            except KeyboardInterrupt:
                print("\n\nStopping continuous collection...")
                collector.close_db()
        
        else:
            parser.print_help()
    
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
