"""
Task 4: Winter Corrector (Kappa-Köhler Humidity Correction)
=============================================================
Apply humidity correction to compensate for fog interference in
low-cost PM sensors during Bucharest winters.

Author: Senior Python Geospatial Engineer
Date: 2025-12-06
"""

import pandas as pd
from pathlib import Path

# ============================================================================
# Configuration
# ============================================================================

# Input/Output paths
INPUT_FILE = Path(__file__).parent.parent / "data" / "bucharest_raw.csv"
OUTPUT_FILE = Path(__file__).parent.parent / "data" / "bucharest_clean.csv"

# Kappa-Köhler constant for urban traffic aerosols
KAPPA = 0.24


# ============================================================================
# Functions
# ============================================================================

def apply_winter_correction(df: pd.DataFrame, kappa: float) -> pd.DataFrame:
    """
    Apply Kappa-Köhler humidity correction algorithm.
    
    Low-cost PM sensors can't distinguish fog droplets from dust particles.
    At high humidity, sensors report inflated PM values. This algorithm
    mathematically "dries" the air to estimate true PM levels.
    
    Formula:
        Growth_Factor = 1 + (κ / ((100 / RH) - 1))
        PM_Real = PM_Raw / Growth_Factor
    
    Args:
        df: DataFrame with P1, P2, humidity columns
        kappa: Hygroscopicity constant (0.24 for traffic pollution)
    
    Returns:
        DataFrame with PM2.5_Real, PM10_Real, growth_factor columns
    """
    df = df.copy()
    
    print("🌫️ Applying Kappa-Köhler humidity correction...")
    
    # Fill missing humidity with conservative estimate (60%)
    missing_humidity = df["humidity"].isna().sum()
    if missing_humidity > 0:
        print(f"   Filling {missing_humidity} missing humidity values with 60%")
    df["humidity"] = df["humidity"].fillna(60)
    
    # Cap humidity at 99 to avoid division by zero
    capped = (df["humidity"] >= 99).sum()
    if capped > 0:
        print(f"   Capping {capped} humidity values at 99%")
    df["humidity"] = df["humidity"].clip(upper=99)
    
    # Calculate growth factor
    # GF = 1 + (κ / ((100 / RH) - 1))
    df["growth_factor"] = 1 + (kappa / ((100 / df["humidity"]) - 1))
    
    # Apply correction
    df["PM2.5_Real"] = df["P2"] / df["growth_factor"]
    df["PM10_Real"] = df["P1"] / df["growth_factor"]
    
    print(f"   Growth factor range: {df['growth_factor'].min():.2f} - {df['growth_factor'].max():.2f}")
    
    return df


def format_output(df: pd.DataFrame) -> pd.DataFrame:
    """
    Round values and drop invalid rows.
    
    Args:
        df: DataFrame to format
    
    Returns:
        Cleaned and formatted DataFrame
    """
    df = df.copy()
    
    print("✂️ Formatting and cleaning data...")
    
    rows_before = len(df)
    
    # Round coordinates to 4 decimal places (~11m precision)
    df["lat"] = df["lat"].round(4)
    df["lon"] = df["lon"].round(4)
    
    # Round PM values to 1 decimal place
    df["PM2.5_Real"] = df["PM2.5_Real"].round(1)
    df["PM10_Real"] = df["PM10_Real"].round(1)
    
    # Drop rows with NaN PM2.5_Real
    df = df.dropna(subset=["PM2.5_Real"])
    
    # Drop sensor malfunction readings (PM2.5 > 1000)
    df = df[df["PM2.5_Real"] <= 1000]
    
    rows_after = len(df)
    dropped = rows_before - rows_after
    
    if dropped > 0:
        print(f"   Dropped {dropped} invalid rows")
    
    return df


def main():
    """Main execution pipeline."""
    print("=" * 60)
    print("Task 4: Winter Corrector (Kappa-Köhler)")
    print("=" * 60)
    
    # Load data
    print(f"📂 Loading: {INPUT_FILE}")
    df = pd.read_csv(INPUT_FILE)
    print(f"   Rows: {len(df)}")
    
    # Store raw averages for comparison
    raw_pm25_avg = df["P2"].mean()
    raw_pm10_avg = df["P1"].mean()
    
    print(f"\n📊 Raw Averages:")
    print(f"   PM2.5: {raw_pm25_avg:.1f} μg/m³")
    print(f"   PM10: {raw_pm10_avg:.1f} μg/m³")
    
    # Apply corrections
    df = apply_winter_correction(df, KAPPA)
    df = format_output(df)
    
    # Print corrected averages
    corrected_pm25_avg = df["PM2.5_Real"].mean()
    corrected_pm10_avg = df["PM10_Real"].mean()
    
    print(f"\n✅ Corrected Averages:")
    print(f"   PM2.5: {corrected_pm25_avg:.1f} μg/m³")
    print(f"   PM10: {corrected_pm10_avg:.1f} μg/m³")
    
    # Calculate reduction
    pm25_reduction = ((raw_pm25_avg - corrected_pm25_avg) / raw_pm25_avg) * 100
    pm10_reduction = ((raw_pm10_avg - corrected_pm10_avg) / raw_pm10_avg) * 100
    
    print(f"\n📉 Humidity Correction Impact:")
    print(f"   PM2.5 reduced by {pm25_reduction:.1f}%")
    print(f"   PM10 reduced by {pm10_reduction:.1f}%")
    
    # Save
    df.to_csv(OUTPUT_FILE, index=False)
    print(f"\n💾 Saved to: {OUTPUT_FILE}")
    print(f"   Final rows: {len(df)}")
    print(f"   File size: {OUTPUT_FILE.stat().st_size / 1024:.1f} KB")
    
    print("=" * 60)
    print("🎉 Task 4 Complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
