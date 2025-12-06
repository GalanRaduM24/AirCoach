# Car Traffic Data Pipeline - Organized Structure

## Directory Structure

```
car_traffic/
├── data/                          # All data files
│   ├── data_sensor.json          # Raw sensor data (43MB)
│   ├── bucharest_raw.csv         # Extracted Bucharest sensors
│   ├── bucharest_clean.csv       # Humidity-corrected data
│   └── bucharest_realtime_traffic.csv  # TomTom traffic grid
│
├── scripts/                       # All Python scripts
│   ├── extract_local.py          # Step 1: Extract sensors
│   ├── process_data.py           # Step 2: Apply corrections
│   ├── scan_traffic.py           # Step 3: Scan traffic grid
│   ├── visualize_dense_traffic.py # Helper: IDW interpolation
│   ├── visualize_time_machine.py  # Step 4: Generate time machine
│   └── log_hourly_traffic.py     # Optional: Hourly logger
│
├── outputs/                       # Generated GeoJSON files
│   └── bucharest_static_roads.geojson
│
├── cache/                         # OSMnx cache (auto-generated)
├── venv/                          # Python virtual environment
├── HOURLY_LOGGER_README.md       # Logger setup instructions
├── README.md                      # This file
├── requirements.txt               # Python dependencies
└── run_hourly_logger.sh          # Cron job script
```

## Quick Start - Running the Pipeline

### From scripts/ directory:

```bash
cd scripts/

# Step 1: Extract sensor data
../venv/bin/python extract_local.py

# Step 2: Apply humidity correction
../venv/bin/python process_data.py

# Step 3: Scan traffic grid (requires TOMTOM_API_KEY)
../venv/bin/python scan_traffic.py

# Step 4: Generate 24-hour time machine visualization
../venv/bin/python visualize_time_machine.py
```

### Output

The main visualization will be saved to:
```
data_pipeline/bucharest_time_machine.html (275 MB)
```

## Data Files

All data files are in the `data/` folder:

| File | Size | Description |
|------|------|-------------|
| `data_sensor.json` | 43 MB | Full sensor dataset |
| `bucharest_raw.csv` | 4.6 KB | Extracted Bucharest sensors (69 sensors) |
| `bucharest_clean.csv` | 3.2 KB | Corrected data (37 sensors) |
| `bucharest_realtime_traffic.csv` | 126 KB | Traffic grid (2,531 points) |

## Key Features

- ✅ **Organized Structure:** Data, scripts, and outputs separated
- ✅ **Clean Pipeline:** Extract → Process → Scan → Visualize
- ✅ **Interactive Time Machine:** 24-hour traffic slider with smooth gradients
- ✅ **Real Data:** Based on TomTom API traffic scans
- ✅ **Realistic Patterns:** Rush hours, night traffic variations

## Notes

- All scripts use relative paths to reference `data/` folder
- Main output saved to: `../../bucharest_time_machine.html`
- Virtual environment required: `venv/bin/python`
