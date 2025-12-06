#!/bin/bash
# Cron Job Setup for Hourly Traffic Logging
# ==========================================
# This script sets up hourly traffic data collection

# Navigate to project directory
cd /Users/miticadenis/Desktop/BESTEM/AirCoach/data_pipeline/car_traffic

# Run hourly logger
./venv/bin/python log_hourly_traffic.py >> ../../logs/traffic_logger.log 2>&1
