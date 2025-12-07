#!/usr/bin/env python3
"""
Generate a grid of sampling points across Bucharest for comprehensive traffic coverage
"""

import json
import math

# Bucharest bounding box (approximate)
BUCHAREST_BOUNDS = {
    'north': 44.5400,  # Northern limit
    'south': 44.3400,  # Southern limit
    'east': 26.2200,   # Eastern limit
    'west': 25.9800    # Western limit
}

# Grid spacing in degrees (approximately 1 kilometer)
# At Bucharest's latitude, 1 degree ≈ 111 km
# So 0.01 degrees ≈ 1.11 km
GRID_SPACING = 0.01  # ~1 km between points

def generate_grid_points():
    """Generate a grid of sampling points across Bucharest"""
    points = []
    point_id = 1
    
    # Calculate number of points in each direction
    lat_range = BUCHAREST_BOUNDS['north'] - BUCHAREST_BOUNDS['south']
    lon_range = BUCHAREST_BOUNDS['east'] - BUCHAREST_BOUNDS['west']
    
    lat_steps = int(lat_range / GRID_SPACING) + 1
    lon_steps = int(lon_range / GRID_SPACING) + 1
    
    print(f"Generating grid: {lat_steps} x {lon_steps} = {lat_steps * lon_steps} points")
    
    # Generate grid
    for i in range(lat_steps):
        lat = BUCHAREST_BOUNDS['south'] + (i * GRID_SPACING)
        
        for j in range(lon_steps):
            lon = BUCHAREST_BOUNDS['west'] + (j * GRID_SPACING)
            
            # Create point
            point = {
                "name": f"Grid Point {point_id}",
                "description": f"Sampling point at grid position ({i}, {j})",
                "lat": round(lat, 6),
                "lon": round(lon, 6),
                "grid_x": j,
                "grid_y": i
            }
            
            points.append(point)
            point_id += 1
    
    return points

def main():
    """Generate and save grid points"""
    print("Generating grid sampling points for Bucharest...")
    print(f"Bounds: {BUCHAREST_BOUNDS}")
    print(f"Grid spacing: {GRID_SPACING} degrees (~1 km)\n")
    
    points = generate_grid_points()
    
    # Create roads structure
    roads_data = {
        "description": "Grid-based sampling points across Bucharest for comprehensive traffic coverage",
        "grid_spacing_degrees": GRID_SPACING,
        "grid_spacing_meters": 1000,
        "total_points": len(points),
        "roads": points
    }
    
    # Save to file
    output_file = "../config/bucharest_roads_grid.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(roads_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✓ Generated {len(points)} sampling points")
    print(f"✓ Saved to {output_file}")
    print(f"\nThis grid covers all of Bucharest with ~1km spacing")
    print(f"Each collection will query {len(points)} points for comprehensive traffic data")
    print(f"\nAPI usage per collection: {len(points)} calls")
    print(f"Daily usage (24 collections): {len(points) * 24} calls")
    print(f"Free tier limit: 2,500 calls/day")
    
    if len(points) * 24 > 2500:
        print(f"\n⚠️  WARNING: Daily usage ({len(points) * 24}) exceeds free tier!")
        print(f"   Consider reducing grid density or collection frequency")
    else:
        print(f"\n✓ Within free tier limits!")

if __name__ == '__main__':
    main()
