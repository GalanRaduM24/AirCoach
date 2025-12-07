"""
Enhanced RAG system for environmental events in Bucharest
Ingests from: web search, news APIs, social media (future), official sources
Stores in database with location tagging and semantic embeddings
"""

import os
import re
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict

import requests
from bs4 import BeautifulSoup
import feedparser
from openai import OpenAI
import psycopg2
from psycopg2.extras import execute_batch
from dotenv import load_dotenv

load_dotenv()

client = OpenAI()

# Database configuration
DB_CONFIG = {
    'host': os.getenv('host'),
    'port': int(os.getenv('port', 6543)),
    'database': os.getenv('dbname'),
    'user': os.getenv('user'),
    'password': os.getenv('password'),
}

# API Keys
SERPER_API_KEY = os.getenv('SERPER_API_KEY')  # For Google search

# Event type keywords and classifications
EVENT_KEYWORDS = {
    'fire': [
        'incendiu', 'incendii', 'foc', 'flăcări', 'arde', 'fum', 'smoke',
        'explozie', 'deflagrație', 'wildfire', 'forest fire'
    ],
    'traffic': [
        'trafic', 'ambuteiaj', 'blocaj', 'cozi', 'aglomerație', 'accident',
        'drum închis', 'deviere', 'circulație', 'traffic jam', 'congestion'
    ],
    'pollution': [
        'poluare', 'calitatea aerului', 'pm2.5', 'pm10', 'smog', 'poluant',
        'gaze', 'emisii', 'air quality', 'pollution', 'toxic'
    ],
    'construction': [
        'șantier', 'lucrări', 'construcție', 'demolare', 'reparații',
        'renovare', 'infrastructură', 'construction', 'roadwork'
    ],
    'festival': [
        'festival', 'eveniment', 'concert', 'manifestație', 'paradă',
        'sărbătoare', 'închidere', 'restricții', 'event', 'celebration'
    ],
    'road_closure': [
        'drum închis', 'stradă închisă', 'acces restricționat', 'blocat',
        'închidere', 'road closed', 'street closure', 'blocked'
    ],
    'weather': [
        'vreme', 'meteo', 'furtună', 'ploaie', 'ninsoare', 'vânt',
        'weather', 'storm', 'rain', 'snow', 'wind'
    ],
    'health': [
        'sănătate', 'alergii', 'astm', 'respirator', 'spital', 'urgență',
        'health', 'allergy', 'respiratory', 'hospital', 'emergency'
    ]
}

# Bucharest sectors and neighborhoods for location extraction
BUCHAREST_LOCATIONS = {
    'sectors': list(range(1, 7)),
    'neighborhoods': [
        'Crangași', 'Drumul Taberei', 'Militari', 'Giulești', 'Grozăvești',
        'Titan', 'Pantelimon', 'Colentina', 'Berceni', 'Rahova', 'Ferentari',
        'Cotroceni', 'Văcărești', 'Vitan', 'Dristor', 'Pipera', 'Băneasa',
        'Floreasca', 'Dorobanți', 'Aviatorilor', 'Primăverii', 'Herăstrău'
    ],
    'landmarks': [
        'Piața Unirii', 'Piața Victoriei', 'Piața Romană', 'Gara de Nord',
        'Parcul Herăstrău', 'Arcul de Triumf', 'Universitate', 'Obor'
    ]
}

RSS_FEEDS = [
    'https://www.romania-insider.com/feed',
    'https://rss.hotnews.ro/',
    'https://www.digi24.ro/rss',
    'https://observatornews.ro/feed',
]

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}


@dataclass
class EnvironmentalEvent:
    title: str
    content: str
    url: Optional[str]
    source_type: str  # 'news', 'social', 'web_search', 'official'
    source_name: str
    author: Optional[str]
    location_text: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    sector: Optional[int]
    neighborhood: Optional[str]
    address: Optional[str]
    event_type: List[str]
    severity: str  # 'low', 'medium', 'high', 'critical'
    published_at: datetime
    expires_at: Optional[datetime]
    language: str = 'ro'
    verified: bool = False


def classify_event_types(text: str) -> List[str]:
    """Classify event based on keywords in text"""
    text_lower = text.lower()
    types = []
    
    for event_type, keywords in EVENT_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            types.append(event_type)
    
    return types if types else ['other']


def estimate_severity(text: str, event_types: List[str]) -> str:
    """Estimate event severity based on content"""
    text_lower = text.lower()
    
    critical_words = ['urgent', 'urgență', 'pericol', 'evacuat', 'mort', 'rănit', 'toxic']
    high_words = ['grav', 'major', 'serios', 'alert', 'atenție']
    medium_words = ['moderat', 'limitat', 'temporar']
    
    if any(w in text_lower for w in critical_words):
        return 'critical'
    elif any(w in text_lower for w in high_words):
        return 'high'
    elif any(w in text_lower for w in medium_words):
        return 'medium'
    
    # Fire and health events default to high
    if 'fire' in event_types or 'health' in event_types:
        return 'high'
    
    return 'low'


def extract_location_info(text: str, use_llm: bool = False) -> Dict:
    """Extract location information from text using regex or LLM"""
    location_data = {
        'location_text': None,
        'sector': None,
        'neighborhood': None,
        'address': None,
        'latitude': None,
        'longitude': None
    }
    
    # Quick regex extraction for sectors
    sector_match = re.search(r'[Ss]ector(?:ul)?\s+(\d)', text)
    if sector_match:
        sector = int(sector_match.group(1))
        if 1 <= sector <= 6:
            location_data['sector'] = sector
            location_data['location_text'] = f"Sector {sector}, București"
    
    # Quick regex for neighborhoods
    for neighborhood in BUCHAREST_LOCATIONS['neighborhoods']:
        if neighborhood.lower() in text.lower():
            location_data['neighborhood'] = neighborhood
            if not location_data['location_text']:
                location_data['location_text'] = f"{neighborhood}, București"
            break
    
    # Optional: Use LLM for more accurate extraction (slower, uses API credits)
    if use_llm and not location_data['location_text']:
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{
                    "role": "system",
                    "content": (
                        "Extract location information from Romanian text about Bucharest events. "
                        "Return JSON with: location_text, sector (1-6 or null), neighborhood, address, "
                        "latitude, longitude. For coordinates, use known Bucharest locations. "
                        "If no location found, return null fields."
                    )
                }, {
                    "role": "user",
                    "content": text[:1000]
                }],
                response_format={"type": "json_object"},
                max_tokens=150,
                timeout=5.0
            )
            
            result = json.loads(response.choices[0].message.content)
            location_data.update(result)
        except Exception as e:
            print(f"[WARN] LLM location extraction failed: {e}")
    
    return location_data


def create_embedding(text: str) -> List[float]:
    """Create OpenAI embedding for semantic search"""
    try:
        response = client.embeddings.create(
            model="text-embedding-ada-002",
            input=text[:8000]  # Limit input length
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"[WARN] Embedding creation failed: {e}")
        return None


def search_google_news(query: str, days_ago: int = 7) -> List[Dict]:
    """Search Google News using Serper API"""
    if not SERPER_API_KEY:
        print("[SKIP] SERPER_API_KEY not set, skipping Google search")
        return []
    
    url = "https://google.serper.dev/news"
    
    date_from = (datetime.now(timezone.utc) - timedelta(days=days_ago)).strftime('%Y-%m-%d')
    
    payload = {
        "q": query,
        "location": "Bucharest, Romania",
        "gl": "ro",
        "hl": "ro",
        "num": 20,
        "tbs": f"cdr:1,cd_min:{date_from}"
    }
    
    headers = {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        articles = []
        for item in data.get('news', []):
            articles.append({
                'title': item.get('title', ''),
                'snippet': item.get('snippet', ''),
                'link': item.get('link', ''),
                'source': item.get('source', ''),
                'date': item.get('date', '')
            })
        
        print(f"[SERPER] Found {len(articles)} articles for: {query}")
        return articles
    
    except Exception as e:
        print(f"[ERROR] Serper API failed: {e}")
        return []


def scrape_rss_feeds(feeds: List[str], days_ago: int = 7) -> List[Dict]:
    """Scrape RSS feeds for recent news"""
    articles = []
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_ago)
    
    for feed_url in feeds:
        try:
            print(f"[RSS] Fetching {feed_url}")
            parsed = feedparser.parse(feed_url)
            
            for entry in parsed.entries:
                # Parse date
                pub_date = None
                if hasattr(entry, 'published_parsed') and entry.published_parsed:
                    pub_date = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                    pub_date = datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc)
                
                # Skip old articles
                if pub_date and pub_date < cutoff_date:
                    continue
                
                articles.append({
                    'title': entry.get('title', ''),
                    'summary': entry.get('summary', ''),
                    'link': entry.get('link', ''),
                    'source': parsed.feed.get('title', feed_url),
                    'published': pub_date or datetime.now(timezone.utc)
                })
            
            print(f"[RSS] Got {len([e for e in parsed.entries if e])} recent articles")
        
        except Exception as e:
            print(f"[ERROR] RSS feed {feed_url} failed: {e}")
    
    return articles


def process_article_to_event(article: Dict, source_type: str) -> Optional[EnvironmentalEvent]:
    """Convert scraped article to EnvironmentalEvent"""
    title = article.get('title', '')
    content = article.get('snippet', '') or article.get('summary', '') or article.get('content', '')
    
    full_text = f"{title}\n{content}"
    
    # Check relevance
    event_types = classify_event_types(full_text)
    if event_types == ['other']:
        return None
    
    # Extract location
    location_info = extract_location_info(full_text)
    
    # Estimate severity
    severity = estimate_severity(full_text, event_types)
    
    # Parse published date
    pub_date = article.get('published')
    if isinstance(pub_date, str):
        try:
            pub_date = datetime.fromisoformat(pub_date.replace('Z', '+00:00'))
        except:
            pub_date = datetime.now(timezone.utc)
    elif not pub_date:
        pub_date = datetime.now(timezone.utc)
    
    # Set expiration (events older than 30 days auto-delete)
    expires_at = pub_date + timedelta(days=30)
    
    return EnvironmentalEvent(
        title=title,
        content=content,
        url=article.get('link'),
        source_type=source_type,
        source_name=article.get('source', 'Unknown'),
        author=article.get('author'),
        location_text=location_info.get('location_text'),
        latitude=location_info.get('latitude'),
        longitude=location_info.get('longitude'),
        sector=location_info.get('sector'),
        neighborhood=location_info.get('neighborhood'),
        address=location_info.get('address'),
        event_type=event_types,
        severity=severity,
        published_at=pub_date,
        expires_at=expires_at
    )


def save_events_to_db(events: List[EnvironmentalEvent]):
    """Save events to Supabase database"""
    if not events:
        print("[DB] No events to save")
        return
    
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    saved_count = 0
    for event in events:
        try:
            # Create embedding
            embedding_text = f"{event.title}\n{event.content}"
            embedding = create_embedding(embedding_text)
            
            cursor.execute("""
                INSERT INTO environmental_events 
                (title, content, url, source_type, source_name, author,
                 location_text, latitude, longitude, sector, neighborhood, address,
                 event_type, severity, published_at, expires_at, embedding, language, verified)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, (
                event.title, event.content, event.url, event.source_type, event.source_name,
                event.author, event.location_text, event.latitude, event.longitude,
                event.sector, event.neighborhood, event.address, event.event_type,
                event.severity, event.published_at, event.expires_at, 
                embedding, event.language, event.verified
            ))
            saved_count += 1
        
        except Exception as e:
            print(f"[ERROR] Failed to save event: {e}")
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print(f"[DB] Saved {saved_count}/{len(events)} events")


def ingest_environmental_data(days_ago: int = 7):
    """Main ingestion function - collect from all sources"""
    print(f"🔄 Starting ingestion (last {days_ago} days)...\n")
    
    all_events = []
    
    # 1. Search Google News
    search_queries = [
        "București poluare",
        "București incendiu",
        "București trafic blocat",
        "București drum închis",
        "București accident",
        "București calitatea aerului"
    ]
    
    for query in search_queries:
        articles = search_google_news(query, days_ago)
        for article in articles:
            event = process_article_to_event(article, 'web_search')
            if event:
                all_events.append(event)
    
    # 2. Scrape RSS feeds
    rss_articles = scrape_rss_feeds(RSS_FEEDS, days_ago)
    for article in rss_articles:
        event = process_article_to_event(article, 'news')
        if event:
            all_events.append(event)
    
    # 3. Save to database
    print(f"\n📊 Processed {len(all_events)} relevant events")
    save_events_to_db(all_events)
    
    print("\n✨ Ingestion complete!")


def query_events_near_location(lat: float, lon: float, radius_km: float = 5.0, hours_ago: int = 168):
    """Query events near a location"""
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM get_events_near_location(%s, %s, %s, %s, 20)
    """, (lat, lon, radius_km, hours_ago))
    
    events = cursor.fetchall()
    cursor.close()
    conn.close()
    
    return events


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'ingest':
        days = int(sys.argv[2]) if len(sys.argv) > 2 else 7
        ingest_environmental_data(days)
    else:
        print("Usage: python rag_ingestion.py ingest [days]")
        print("Example: python rag_ingestion.py ingest 14")
