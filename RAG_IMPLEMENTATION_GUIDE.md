# AirCoach RAG Implementation Guide

## Overview

This RAG (Retrieval-Augmented Generation) system provides air quality advice for Bucharest neighborhoods using trusted sources and real-time sensor data.

## Current Status

✅ **Implemented:**

- Question relevance filtering (rejects off-topic questions)
- Location extraction from user questions (neighborhood + sector)
- RAG pipeline with OpenAI vector store
- Trusted source ingestion (HTML scraping + RSS feeds)

⚠️ **Using Placeholder Data:**

- Sensor readings are currently hardcoded
- All neighborhoods return the same values: PM2.5=115, PM10=180, NO2=62

## Architecture

```
User Question
    ↓
1. Relevance Check (Is it about air quality?)
    ↓ YES
2. Location Extraction (Which neighborhood?)
    ↓
3. Fetch Sensor Data [TODO: Currently placeholder]
    ↓
4. RAG Query (Search trusted documents)
    ↓
5. Generate Answer with recommendations
```

## File Structure

```
aircoachrag.py              # Main RAG implementation
trusted_aq_corpus.txt       # Ingested articles (generated)
.aq_vector_store_id         # OpenAI vector store ID (generated)
RAG_IMPLEMENTATION_GUIDE.md # This file
```

## Setup Instructions

### 1. Install Dependencies

```bash
pip install openai requests beautifulsoup4 python-dotenv feedparser
```

### 2. Set OpenAI API Key

**PowerShell:**

```powershell
$env:OPENAI_API_KEY="sk-proj-..."
```

**Bash/Linux:**

```bash
export OPENAI_API_KEY="sk-proj-..."
```

**Or use `.env` file:**

```
OPENAI_API_KEY=sk-proj-...
```

### 3. Ingest Trusted Sources

```bash
python aircoachrag.py ingest
```

This scrapes trusted URLs and RSS feeds, then uploads them to OpenAI vector store.

### 4. Test the RAG

```bash
python aircoachrag.py ask "Should I go out in Crangasi? I have asthma."
```

## For Frontend/Backend Teams

### Integration Options

#### Option 1: Direct Python Integration (Backend)

Import and use the `rag_explain_spike()` function:

```python
from aircoachrag import rag_explain_spike

# Your backend fetches real sensor data
sensor_data = {
    "city": "Bucharest",
    "neighborhood": "Crangasi",
    "sector": 6,
    "time_utc": "2025-12-07T10:00:00Z",
    "pm25": 85.0,      # From your API
    "pm10": 120.0,     # From your API
    "no2": 45.0,       # From your API
    "data_source": "Calitatea Aer API"
}

answer = rag_explain_spike(
    question="Should I go out in Crangasi?",
    sensor_snapshot=sensor_data,
    vector_store_id="vs-xxx"  # Load from .aq_vector_store_id file
)

# Return answer to frontend
```

#### Option 2: REST API Wrapper (Recommended)

Create a Flask/FastAPI endpoint:

```python
from flask import Flask, request, jsonify
from aircoachrag import rag_explain_spike
import os

app = Flask(__name__)

# Load vector store ID on startup
with open('.aq_vector_store_id', 'r') as f:
    VECTOR_STORE_ID = f.read().strip()

@app.route('/api/air-quality-advice', methods=['POST'])
def get_advice():
    data = request.json
    question = data.get('question')

    # TODO: Fetch real sensor data based on extracted location
    # For now, using placeholder
    sensor_data = {
        "city": "Bucharest",
        "neighborhood": data.get('neighborhood', 'Unknown'),
        "sector": data.get('sector', None),
        "time_utc": datetime.now(timezone.utc).isoformat(),
        "pm25": 115.0,  # TODO: Get from API
        "pm10": 180.0,  # TODO: Get from API
        "no2": 62.0,    # TODO: Get from API
    }

    answer = rag_explain_spike(question, sensor_data, VECTOR_STORE_ID)

    return jsonify({
        "answer": answer,
        "sensor_data": sensor_data
    })

if __name__ == '__main__':
    app.run(port=5000)
```

Frontend can then call:

```javascript
fetch("http://localhost:5000/api/air-quality-advice", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    question: "Should I go out in Crangasi?",
    neighborhood: "Crangasi",
    sector: 6,
  }),
})
  .then((res) => res.json())
  .then((data) => console.log(data.answer));
```

## Critical TODOs for Production

### 1. **Integrate Real Sensor Data API** 🚨 PRIORITY

Current placeholder must be replaced with actual API calls.

**Recommended APIs:**

#### A. Calitatea Aer (Romanian Official Data)

```python
def fetch_calitatea_aer_data(sector: int):
    """
    Fetch from https://www.calitateaer.ro/
    Check their API documentation or scrape their public data
    """
    # TODO: Implement
    pass
```

#### B. Aerlive (Community Sensors)

```python
def fetch_aerlive_data(lat: float, lon: float):
    """
    Fetch from https://aerlive.ro/api/...
    Contact Aerlive for API access
    """
    # TODO: Implement
    pass
```

#### C. OpenWeatherMap Air Pollution API (Fallback)

```python
import requests

def fetch_openweather_data(lat: float, lon: float, api_key: str):
    """
    Free tier: 1,000 calls/day
    Docs: https://openweathermap.org/api/air-pollution
    """
    url = f"http://api.openweathermap.org/data/2.5/air_pollution"
    params = {"lat": lat, "lon": lon, "appid": api_key}

    resp = requests.get(url, params=params)
    data = resp.json()

    components = data['list'][0]['components']

    return {
        "pm25": components.get('pm2_5'),
        "pm10": components.get('pm10'),
        "no2": components.get('no2'),
        "o3": components.get('o3'),
        "co": components.get('co'),
    }

# Example usage
sensor_data = fetch_openweather_data(
    lat=44.4268,  # Bucharest center
    lon=26.1025,
    api_key="your_key_here"
)
```

**Neighborhood Coordinates (for API calls):**

```python
BUCHAREST_NEIGHBORHOODS = {
    "Crangasi": {"lat": 44.4525, "lon": 26.0458, "sector": 6},
    "Nicolae Teclu": {"lat": 44.4091, "lon": 26.1586, "sector": 3},
    "Titan": {"lat": 44.4339, "lon": 26.1583, "sector": 3},
    "Drumul Taberei": {"lat": 44.4111, "lon": 26.0308, "sector": 6},
    "Militari": {"lat": 44.4361, "lon": 26.0206, "sector": 6},
    "Berceni": {"lat": 44.3753, "lon": 26.1158, "sector": 4},
    "Pantelimon": {"lat": 44.4539, "lon": 26.2214, "sector": 2},
    "Colentina": {"lat": 44.4622, "lon": 26.1519, "sector": 2},
    # Add more neighborhoods...
}
```

### 2. **Update demo_ask() to use real data**

Replace this section in `aircoachrag.py`:

```python
def demo_ask(question: str):
    # ... existing location extraction code ...

    # BEFORE (placeholder):
    snapshot = {
        "pm25": 115.0,
        "pm10": 180.0,
        "no2": 62.0,
    }

    # AFTER (real data):
    coords = BUCHAREST_NEIGHBORHOODS.get(neighborhood)
    if coords:
        sensor_data = fetch_openweather_data(
            coords['lat'],
            coords['lon'],
            os.getenv('OPENWEATHER_API_KEY')
        )
        snapshot = {
            "city": "Bucharest",
            "neighborhood": neighborhood,
            "sector": coords['sector'],
            "time_utc": datetime.now(timezone.utc).isoformat(),
            "pm25": sensor_data['pm25'],
            "pm10": sensor_data['pm10'],
            "no2": sensor_data['no2'],
            "data_source": "OpenWeatherMap"
        }
    else:
        # Fallback to Bucharest center
        sensor_data = fetch_openweather_data(44.4268, 26.1025, api_key)
```

### 3. **Keep Corpus Up-to-Date**

Run ingestion regularly (daily/weekly) to get fresh articles:

```bash
# Add to cron job or scheduled task
python aircoachrag.py ingest
```

Or automate in code:

```python
from datetime import datetime, timedelta
import os

CORPUS_MAX_AGE_DAYS = 7

def should_reingest():
    if not os.path.exists('trusted_aq_corpus.txt'):
        return True

    file_age = datetime.now() - datetime.fromtimestamp(
        os.path.getmtime('trusted_aq_corpus.txt')
    )

    return file_age > timedelta(days=CORPUS_MAX_AGE_DAYS)

# In your app startup
if should_reingest():
    ingest_trusted_sources()
```

### 4. **Add More Trusted Sources**

Edit `TRUSTED_URLS` in `aircoachrag.py`:

```python
TRUSTED_URLS = [
    "https://aerlive.ro/",
    "https://www.calitateaer.ro/public/stiri-page/?__locale=ro",
    "https://www.calitateaer.ro/public/alerts-page/?__locale=ro",

    # Add specific articles
    "https://www.agerpres.ro/mediul-inconjurator/...",

    # Add more as you find good sources
]
```

### 5. **Error Handling**

Add proper error handling for production:

```python
def rag_explain_spike(question, sensor_snapshot, vector_store_id, model="gpt-4o-mini"):
    try:
        # Existing code...
        pass
    except OpenAIError as e:
        return f"Sorry, I couldn't process your question due to an API error: {e}"
    except Exception as e:
        return f"An unexpected error occurred. Please try again later."
```

### 6. **Rate Limiting & Caching**

For production, implement caching to reduce API costs:

```python
from functools import lru_cache
from datetime import datetime

@lru_cache(maxsize=100)
def cached_rag_answer(question: str, sensor_json: str, timestamp_hour: str):
    """Cache answers for 1 hour"""
    return rag_explain_spike(question, json.loads(sensor_json), VECTOR_STORE_ID)

# Usage:
timestamp_hour = datetime.now().strftime("%Y-%m-%d-%H")  # Cache per hour
answer = cached_rag_answer(question, json.dumps(sensor_data), timestamp_hour)
```

## Testing Checklist

- [ ] Test with air quality questions → Should get relevant answers
- [ ] Test with off-topic questions → Should reject politely
- [ ] Test different neighborhoods → Should extract correct location
- [ ] Test with real sensor API → Should return different data per location
- [ ] Test error cases (no API key, network failure, etc.)
- [ ] Load test (simulate multiple concurrent users)

## Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-proj-...

# Optional (for real sensor data)
OPENWEATHER_API_KEY=...
CALITATEA_AER_API_KEY=...
AERLIVE_API_TOKEN=...
```

## API Costs Estimate

**OpenAI Pricing (as of Dec 2025):**

- GPT-4o-mini: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- Embeddings (text-embedding-3-small): ~$0.02 per 1M tokens
- Vector store: Free for first 1GB/day

**Example cost per query:**

- Relevance check: ~500 tokens = $0.0001
- Location extraction: ~200 tokens = $0.00003
- RAG answer: ~2000 tokens input + 400 output = $0.0005
- **Total: ~$0.0006 per query** (0.06 cents)

**For 10,000 queries/day: ~$6/day = $180/month**

## Contact & Support

- **Backend Team**: Integrate the REST API wrapper
- **Frontend Team**: Call the `/api/air-quality-advice` endpoint
- **Data Team**: Set up real sensor API integration

## Quick Start for Your Team

1. Pull this branch: `git checkout timmy`
2. Install dependencies: `pip install -r requirements.txt` (create this file!)
3. Set `OPENAI_API_KEY` environment variable
4. Run `python aircoachrag.py ingest` once
5. Test: `python aircoachrag.py ask "Should I go out in Crangasi?"`
6. Integrate into your backend using Option 2 (REST API)
7. **PRIORITY**: Replace placeholder sensor data with real API calls

## Questions?

Leave comments in the code or open a GitHub issue on the `timmy` branch.

Good luck! 🚀
