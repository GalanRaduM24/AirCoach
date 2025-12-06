# Hourly Traffic Logger - Setup Instructions

## Overview
Automatically collect traffic data every hour to build a 24-hour time-series dataset for the Traffic Time Machine visualization.

## Files Created
1. `log_hourly_traffic.py` - Main logger script
2. `run_hourly_logger.sh` - Cron job wrapper
3. `traffic_snapshots/` - Directory for hourly snapshots (auto-created)

## Setup Cron Job (macOS/Linux)

### Option 1: Using Crontab

```bash
# Edit crontab
crontab -e

# Add this line (runs every hour at minute 0)
0 * * * * /Users/miticadenis/Desktop/BESTEM/AirCoach/data_pipeline/car_traffic/run_hourly_logger.sh
```

### Option 2: Manual Run (for testing)

```bash
cd /Users/miticadenis/Desktop/BESTEM/AirCoach/data_pipeline/car_traffic
./venv/bin/python log_hourly_traffic.py
```

## Output Structure

Each hour creates two files:

```
traffic_snapshots/
├── traffic_20251207_0000.csv       # Full grid data
├── traffic_20251207_0000.json      # Metadata summary
├── traffic_20251207_0100.csv
├── traffic_20251207_0100.json
...
└── traffic_20251207_2300.json
```

## Monitoring

View logs:
```bash
tail -f ../../logs/traffic_logger.log
```

## After 24 Hours

Once you have 24 hourly snapshots, run:
```bash
./venv/bin/python visualize_time_machine.py
```

This will create an interactive map with a time slider to explore traffic patterns throughout the day.

## Stopping the Logger

```bash
# Remove from crontab
crontab -e
# Delete the line, save and exit
```

## Troubleshooting

**Issue:** API quota exceeded  
**Solution:** Reduce `GRID_SPACING` in `scan_traffic.py` to 0.01° (~600 points instead of 2,538)

**Issue:** Cron job not running  
**Solution:** Check system logs: `grep CRON /var/log/system.log`

**Issue:** Missing data  
**Solution:** Check `logs/traffic_logger.log` for errors
