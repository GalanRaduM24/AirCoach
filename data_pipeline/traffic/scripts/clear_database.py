#!/usr/bin/env python3
"""
Clear traffic data from database
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_USER = os.getenv('user')
DB_PASSWORD = os.getenv('password')
DB_HOST = os.getenv('host')
DB_PORT = os.getenv('port')
DB_NAME = os.getenv('dbname')

try:
    print("Connecting to database...")
    conn = psycopg2.connect(
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME
    )
    
    cursor = conn.cursor()
    
    print("Clearing traffic_data table...")
    cursor.execute("TRUNCATE TABLE traffic_data CASCADE;")
    
    print("Clearing road_segments table...")
    cursor.execute("TRUNCATE TABLE road_segments CASCADE;")
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print("✓ Database tables cleared successfully!")
    print("You can now run the collector to get fresh data with street names.")
    
except Exception as e:
    print(f"✗ Error: {e}")
