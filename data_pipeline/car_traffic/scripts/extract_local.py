"""
Task 3: Sensor Data Extractor
==============================
Fast-parse data_sensor.json, apply Bucharest bounding box filter,
and save a lightweight CSV with extracted air quality fields.

Author: Senior Python Geospatial Engineer
Date: 2025-12-06
"""

import json
import csv
from pathlib import Path

# ============================================================================
# Configuration
# ============================================================================

# Input/Output paths
INPUT_FILE = Path(__file__).parent.parent / "data" / "data_sensor.json"
OUTPUT_FILE = Path(__file__).parent.parent / "data" / "bucharest_raw.csv"

# Bucharest Bounding Box
BBOX = {
    "lat_min": 44.33,
    "lat_max": 44.56,
    "lon_min": 25.96,
    "lon_max": 26.23
}


# ============================================================================
# Functions
# ============================================================================

def is_inside_bbox(lat: float, lon: float, bbox: dict) -> bool:
    """
    Check if coordinates fall inside bounding box.
    
    Args:
        lat: Latitude
        lon: Longitude
        bbox: Dict with lat_min, lat_max, lon_min, lon_max
    
    Returns:
        True if point is inside bbox
    """
    return (
        bbox["lat_min"] <= lat <= bbox["lat_max"] and
        bbox["lon_min"] <= lon <= bbox["lon_max"]
    )


def extract_sensor_value(sensordatavalues: list, value_type: str) -> float | None:
    """
    Extract specific value_type from sensordatavalues list.
    
    Args:
        sensordatavalues: List of sensor readings
        value_type: Type to extract (P1, P2, humidity, temperature)
    
    Returns:
        Float value or None if not found
    """
    for item in sensordatavalues:
        if item.get("value_type") == value_type:
            try:
                return float(item.get("value"))
            except (ValueError, TypeError):
                return None
    return None


def extract_bucharest_sensors(input_path: Path, output_path: Path, bbox: dict) -> int:
    """
    Parse JSON, filter by bbox, extract fields to CSV.
    
    Args:
        input_path: Path to data_sensor.json
        output_path: Path to output CSV
        bbox: Bounding box dict
    
    Returns:
        Number of sensors found inside Bucharest
    """
    print("=" * 60)
    print("Task 3: Sensor Data Extractor")
    print("=" * 60)
    
    print(f"📂 Loading: {input_path}")
    print(f"   File size: {input_path.stat().st_size / 1024 / 1024:.1f} MB")
    
    with open(input_path, "r", encoding="utf-8") as f:
        sensors = json.load(f)
    
    print(f"📊 Total sensors in file: {len(sensors):,}")
    print(f"🗺️ Filtering to Bucharest bbox: {bbox}")
    
    results = []
    skipped = 0
    
    for sensor in sensors:
        # Extract coordinates
        try:
            lat = float(sensor["location"]["latitude"])
            lon = float(sensor["location"]["longitude"])
        except (KeyError, ValueError, TypeError):
            skipped += 1
            continue
        
        # Apply spatial filter
        if not is_inside_bbox(lat, lon, bbox):
            continue
        
        # Extract sensor data values
        sensordatavalues = sensor.get("sensordatavalues", [])
        
        results.append({
            "sensor_id": sensor.get("sensor", {}).get("id"),
            "lat": lat,
            "lon": lon,
            "timestamp": sensor.get("timestamp"),
            "P1": extract_sensor_value(sensordatavalues, "P1"),
            "P2": extract_sensor_value(sensordatavalues, "P2"),
            "humidity": extract_sensor_value(sensordatavalues, "humidity"),
            "temperature": extract_sensor_value(sensordatavalues, "temperature"),
        })
    
    print(f"   Skipped (invalid coords): {skipped:,}")
    print(f"✅ Found {len(results)} sensors inside Bucharest")
    
    # Handle empty results
    if not results:
        print("⚠️ No sensors found! Check bounding box or input file.")
        return 0
    
    # Save to CSV
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    fieldnames = ["sensor_id", "lat", "lon", "timestamp", "P1", "P2", "humidity", "temperature"]
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)
    
    print(f"💾 Saved to: {output_path}")
    print(f"   File size: {output_path.stat().st_size / 1024:.1f} KB")
    
    # Quick stats
    p1_values = [r["P1"] for r in results if r["P1"] is not None]
    p2_values = [r["P2"] for r in results if r["P2"] is not None]
    
    if p1_values:
        print(f"\n📈 PM10 (P1) Stats:")
        print(f"   Count: {len(p1_values)}, Avg: {sum(p1_values)/len(p1_values):.1f} μg/m³")
    
    if p2_values:
        print(f"📈 PM2.5 (P2) Stats:")
        print(f"   Count: {len(p2_values)}, Avg: {sum(p2_values)/len(p2_values):.1f} μg/m³")
    
    print("=" * 60)
    print("🎉 Task 3 Complete!")
    print("=" * 60)
    
    return len(results)


def main():
    """Main execution."""
    extract_bucharest_sensors(INPUT_FILE, OUTPUT_FILE, BBOX)


if __name__ == "__main__":
    main()
