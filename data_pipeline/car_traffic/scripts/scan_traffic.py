"""
Task 7: Traffic Grid Scanner
=============================
Generate a coordinate grid over Bucharest and query TomTom Traffic API
for each point to build a dense traffic congestion map.

Author: Senior Python Geospatial Engineer
Date: 2025-12-06
"""

import os
import time
import numpy as np
import pandas as pd
import requests
from pathlib import Path
from dotenv import load_dotenv

# ============================================================================
# Configuration
# ============================================================================

# Load API key from .env
ENV_PATH = Path(__file__).parent.parent.parent / ".env"
load_dotenv(ENV_PATH)
API_KEY = os.getenv("TOMTOM_API_KEY")

# Bucharest Bounding Box
BBOX = {
    "lat_min": 44.33,
    "lat_max": 44.56,
    "lon_min": 25.96,
    "lon_max": 26.23
}

# Grid spacing (approx 500m)
GRID_SPACING = 0.005

# Output file
OUTPUT_FILE = Path(__file__).parent.parent / "data" / "bucharest_realtime_traffic.csv"

# TomTom API endpoint
TOMTOM_FLOW_URL = (
    "https://api.tomtom.com/traffic/services/4/"
    "flowSegmentData/absolute/10/json"
)


# ============================================================================
# Functions
# ============================================================================

def generate_grid(bbox: dict, spacing: float) -> list:
    """
    Generate a coordinate grid over the bounding box.
    
    Args:
        bbox: Dict with lat_min, lat_max, lon_min, lon_max
        spacing: Grid spacing in degrees
    
    Returns:
        List of (lat, lon) tuples
    """
    lats = np.arange(bbox["lat_min"], bbox["lat_max"], spacing)
    lons = np.arange(bbox["lon_min"], bbox["lon_max"], spacing)
    
    grid = [(lat, lon) for lat in lats for lon in lons]
    return grid


def fetch_congestion(lat: float, lon: float, api_key: str, session: requests.Session) -> dict:
    """
    Fetch traffic congestion data from TomTom API for a specific point.
    
    Args:
        lat: Latitude
        lon: Longitude
        api_key: TomTom API key
        session: Requests session for connection pooling
    
    Returns:
        Dict with lat, lon, congestion_factor (or None on failure)
    """
    try:
        params = {
            "point": f"{lat},{lon}",
            "key": api_key
        }
        response = session.get(TOMTOM_FLOW_URL, params=params, timeout=10)
        
        # Handle rate limiting
        if response.status_code == 429:
            print(f"\n⚠️ Rate limit hit, waiting 5 seconds...")
            time.sleep(5)
            # Retry once
            response = session.get(TOMTOM_FLOW_URL, params=params, timeout=10)
        
        response.raise_for_status()
        data = response.json()
        
        # Extract speeds
        flow_data = data.get("flowSegmentData", {})
        current_speed = flow_data.get("currentSpeed")
        free_flow_speed = flow_data.get("freeFlowSpeed")
        
        if current_speed is not None and free_flow_speed is not None and free_flow_speed > 0:
            congestion_factor = 1 - (current_speed / free_flow_speed)
            # Clamp to [0, 1]
            congestion_factor = max(0.0, min(1.0, congestion_factor))
            
            return {
                "lat": lat,
                "lon": lon,
                "current_speed": current_speed,
                "free_flow_speed": free_flow_speed,
                "congestion_factor": congestion_factor
            }
        else:
            return {"lat": lat, "lon": lon, "congestion_factor": None}
            
    except requests.RequestException as e:
        # Silent fail for individual points
        return {"lat": lat, "lon": lon, "congestion_factor": None}


def scan_traffic_grid(grid: list, api_key: str) -> pd.DataFrame:
    """
    Scan traffic data for all grid points with rate limiting.
    
    Args:
        grid: List of (lat, lon) tuples
        api_key: TomTom API key
    
    Returns:
        DataFrame with traffic data
    """
    results = []
    total = len(grid)
    
    # Use session for connection pooling (faster)
    with requests.Session() as session:
        for i, (lat, lon) in enumerate(grid, 1):
            # Progress indicator
            if i % 10 == 0 or i == 1:
                print(f"🔍 Scanning Sector [{i}/{total}]...", end='\r')
            
            # Fetch data
            result = fetch_congestion(lat, lon, api_key, session)
            results.append(result)
            
            # Rate limiting: 0.2s between requests (5 requests/sec)
            if i < total:
                time.sleep(0.2)
    
    print()  # Clear progress line
    return pd.DataFrame(results)


def main():
    """Main execution pipeline."""
    print("=" * 70)
    print("Task 7: Traffic Grid Scanner")
    print("=" * 70)
    
    # Check API key
    if not API_KEY:
        print("\n❌ Error: TOMTOM_API_KEY not found in .env")
        print(f"   Expected at: {ENV_PATH}")
        print("   Please add: TOMTOM_API_KEY=your_api_key_here")
        return
    
    print(f"\n🔑 API Key loaded from: {ENV_PATH}")
    
    # Generate grid
    print(f"\n📐 Generating coordinate grid...")
    print(f"   Bounding box: {BBOX}")
    print(f"   Grid spacing: {GRID_SPACING}° (~500m)")
    
    grid = generate_grid(BBOX, GRID_SPACING)
    print(f"   ✅ Generated {len(grid)} grid points")
    
    # Estimate time
    estimated_time = len(grid) * 0.2 / 60
    print(f"   ⏱️ Estimated scan time: ~{estimated_time:.1f} minutes")
    
    # Scan traffic
    print(f"\n🚦 Starting traffic scan...")
    df = scan_traffic_grid(grid, API_KEY)
    
    # Statistics
    valid_data = df[df["congestion_factor"].notna()]
    print(f"\n📊 Scan Results:")
    print(f"   Total points scanned: {len(df)}")
    print(f"   Valid data points: {len(valid_data)} ({len(valid_data)/len(df)*100:.1f}%)")
    print(f"   Failed queries: {len(df) - len(valid_data)}")
    
    if len(valid_data) > 0:
        print(f"\n📈 Congestion Statistics:")
        print(f"   Min: {valid_data['congestion_factor'].min():.2%}")
        print(f"   Max: {valid_data['congestion_factor'].max():.2%}")
        print(f"   Mean: {valid_data['congestion_factor'].mean():.2%}")
    
    # Save results
    df.to_csv(OUTPUT_FILE, index=False)
    print(f"\n💾 Saved to: {OUTPUT_FILE}")
    print(f"   File size: {OUTPUT_FILE.stat().st_size / 1024:.1f} KB")
    
    print("\n" + "=" * 70)
    print("🎉 Traffic grid scan complete!")
    print("=" * 70)
    print(f"\n💡 Next steps:")
    print(f"   - Use this data to visualize real-time traffic congestion")
    print(f"   - Overlay on road network for accurate traffic mapping")


if __name__ == "__main__":
    main()
