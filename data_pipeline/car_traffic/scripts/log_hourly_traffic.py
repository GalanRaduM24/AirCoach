"""
Hourly Traffic Logger
=====================
Save traffic grid snapshots every hour for time-series analysis.

Author: Senior Python Geospatial Engineer
Date: 2025-12-06
"""

import os
import time
import json
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
import sys

# Add parent directory to path to import scan_traffic functions
sys.path.append(str(Path(__file__).parent))
from scan_traffic import generate_grid, scan_traffic_grid, BBOX, GRID_SPACING

# ============================================================================
# Configuration
# ============================================================================

# Load API key
ENV_PATH = Path(__file__).parent.parent.parent / ".env"
load_dotenv(ENV_PATH)
API_KEY = os.getenv("TOMTOM_API_KEY")

# Output directory for hourly snapshots
OUTPUT_DIR = Path(__file__).parent.parent / "traffic_snapshots"
OUTPUT_DIR.mkdir(exist_ok=True)


# ============================================================================
# Functions
# ============================================================================

def log_hourly_snapshot():
    """
    Capture one traffic snapshot and save to timestamped file.
    """
    timestamp = datetime.now()
    hour = timestamp.hour
    date_str = timestamp.strftime("%Y%m%d")
    hour_str = f"{hour:02d}"
    
    print("=" * 70)
    print(f"Hourly Traffic Logger - {timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    # Check API key
    if not API_KEY:
        print("\n❌ Error: TOMTOM_API_KEY not found in .env")
        return False
    
    # Generate grid
    print(f"\n📐 Generating grid ({GRID_SPACING}° spacing)...")
    grid = generate_grid(BBOX, GRID_SPACING)
    print(f"   Grid points: {len(grid)}")
    
    # Scan traffic
    print(f"\n🚦 Scanning traffic at hour {hour_str}:00...")
    df = scan_traffic_grid(grid, API_KEY)
    
    # Save to CSV (timestamped)
    csv_file = OUTPUT_DIR / f"traffic_{date_str}_{hour_str}00.csv"
    df.to_csv(csv_file, index=False)
    
    # Also save metadata JSON
    metadata = {
        "timestamp": timestamp.isoformat(),
        "hour": hour,
        "date": date_str,
        "grid_points": len(grid),
        "valid_points": len(df[df["congestion_factor"].notna()]),
        "mean_congestion": float(df["congestion_factor"].mean()) if len(df) > 0 else 0,
        "max_congestion": float(df["congestion_factor"].max()) if len(df) > 0 else 0
    }
    
    json_file = OUTPUT_DIR / f"traffic_{date_str}_{hour_str}00.json"
    with open(json_file, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    # Statistics
    valid_data = df[df["congestion_factor"].notna()]
    print(f"\n📊 Snapshot Summary:")
    print(f"   Valid points: {len(valid_data)} / {len(df)}")
    if len(valid_data) > 0:
        print(f"   Mean congestion: {valid_data['congestion_factor'].mean():.2%}")
        print(f"   Max congestion: {valid_data['congestion_factor'].max():.2%}")
    
    print(f"\n💾 Saved:")
    print(f"   CSV: {csv_file}")
    print(f"   Metadata: {json_file}")
    
    print("\n" + "=" * 70)
    print("✅ Snapshot complete!")
    print("=" * 70)
    
    return True


def main():
    """Main execution."""
    success = log_hourly_snapshot()
    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()
