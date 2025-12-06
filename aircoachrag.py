"""
RAG over trusted air-quality sources (Calitatea Aer, Aerlive, AGERPRES, etc.)

What it does:
  * Scrapes a small set of TRUSTED_URLS (HTML, no RSS needed)
  * Extracts readable text (<p>, <h1-3>, <li>)
  * Saves everything into one text file
  * Uploads that file into an OpenAI Vector Store
  * Exposes `rag_explain_spike()` that you can call from your app

Requirements:
    pip install openai requests beautifulsoup4 python-dotenv

Environment:
    export OPENAI_API_KEY="sk-..."

Usage from CLI:
    # 1) Ingest articles & build vector store
    python aircoachrag.py ingest

    # 2) Test a RAG answer
    python aircoachrag.py ask "Why is PM2.5 high in Sector 3 right now?"
"""

import argparse
from datetime import datetime, timezone
import datetime as dt
import json
import os
import feedparser
from typing import Dict, List, Optional
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from openai import OpenAI

client = OpenAI()

# -------------------------------------------------------
# 1. TRUSTED SOURCES – YOU EDIT THIS!
# -------------------------------------------------------

# Put here only serious sources (official & NGOs).
# You can add:
#  - Aerlive articles with explanations / campaigns
#  - Calitatea Aer "Știri și Alerte" pages
#  - Individual AGERPRES news articles about smog, fires, etc.
TRUSTED_URLS = [
    # Aerlive – homepage + specific articles you like
    "https://aerlive.ro/",
    # Example: "https://aerlive.ro/resurse/..."   # fill with real paths

    # Calitatea Aer – news & alerts pages (you copy URLs from the site)
    # "https://www.calitateaer.ro/public/stiri-page/?__locale=ro",
    # "https://www.calitateaer.ro/public/alerts-page/?__locale=ro",

    # Optional: specific AGERPRES articles you trust
    # "https://www.agerpres.ro/mediul_inconjurator/2025/09/05/...",

    # etc.
]

WHITELIST_RSS_FEEDS = [
    # Romania Insider – English-language, reliable
    "https://www.romania-insider.com/feed",

    # HotNews.ro – official RSS feed (as per their own docs)
    "https://rss.hotnews.ro/",

    # You can add more here later (AGERPRES RSS, etc.)
    # e.g. "https://www.agerpres.ro/rss?cat=SOCIAL",
]

# Words that should appear somewhere in the text for it to be clearly relevant.
# We'll be lenient with official domains (we keep them even if keywords are missing).
KEYWORDS = [
    # Core air-quality / pollution
    "poluare", "poluării", "poluant", "poluanți",
    "calitatea aerului", "indicele de poluare", "indicele aerului",
    "smog", "particule", "pm2.5", "pm10",
    "no2", "nox", "ozon", "o3",
    "materie particulată", "particulate matter",
    "air quality", "air pollution",

    # Fires / explosions (big sources of smoke)
    "incendiu", "incendii", "foc", "flăcări",
    "explozie", "explozii", "deflagrație",
    "incendiu de vegetație", "incendiu de pădure",
    "wildfire", "forest fire", "industrial fire",

    # Gas / leaks / fumes
    "gaz", "gaze", "gaz metan", "gaz toxic",
    "scurgere de gaz", "scurgeri de gaz",
    "vapori toxici", "emisie de gaze",
    "gaze de eșapament", "esapament", "emisii auto", "emisii diesel",
    "fum toxic",

    # Traffic (vehicle emissions, congestion)
    "trafic", "traficul rutier", "blocaj rutier", "ambuteiaj",
    "cozi în trafic", "aglomerație în trafic", "coloană de mașini",
    "trafic intens", "trafic aglomerat",

    # Construction / demolition dust
    "șantier", "santier", "șantiere", "construcții", "lucrări de construcții",
    "demolare", "lucrări rutiere",
    "praf de construcții", "praf în aer",

    # Waste / landfills / burning trash
    "gunoi", "gunoaie", "deșeuri", "deseuri",
    "groapă de gunoi", "groapa de gunoi",
    "depozit de deșeuri", "depozit de deseuri",
    "incinerator", "arderea deșeurilor", "arderea deseurilor",
    "managementul deșeurilor", "colectare selectivă",

    # Health / breathing impact
    "astm", "asma", "bronșită", "bronsita",
    "alergii respiratorii", "probleme respiratorii",
    "sănătatea respiratorie", "sistem respirator",
]

ALWAYS_KEEP_DOMAINS = {
    "aerlive.ro",
    "www.calitateaer.ro",
}

VECTOR_STORE_NAME = "trusted-aq-bucharest"
VECTOR_STORE_ID_FILE = ".aq_vector_store_id"
CORPUS_FILE = "trusted_aq_corpus.txt"


# -------------------------------------------------------
# 2. HTML scraping helpers
# -------------------------------------------------------

HEADERS = {
    "User-Agent": "AirQualityHackathonBot/1.0 (+https://github.com/your-project)"
}


def extract_domain(url: str) -> str:
    return urlparse(url).netloc.lower()


def fetch_html(url: str) -> str:
    print(f"[FETCH] {url}")
    resp = requests.get(url, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    return resp.text


def extract_article_from_html(url: str) -> Optional[Dict]:
    """
    Super-simple HTML scraper:
      - use <title>
      - collect <p>, <h1-3>, <li> text
      - filter by KEYWORDS (unless from ALWAYS_KEEP_DOMAINS)
    """
    try:
        html = fetch_html(url)
    except Exception as e:
        print(f"[WARN] Failed to fetch {url}: {e}")
        return None

    soup = BeautifulSoup(html, "html.parser")
    title = soup.title.string.strip() if soup.title and soup.title.string else url

    text_parts: List[str] = []

    for tag_name in ["h1", "h2", "h3", "p", "li"]:
        for tag in soup.find_all(tag_name):
            txt = tag.get_text(" ", strip=True)
            # Ignore very short fragments
            if len(txt) >= 40:
                text_parts.append(txt)

    body_text = "\n".join(text_parts).strip()
    if not body_text:
        print(f"[WARN] No body text found at {url}")
        return None

    full_text_lower = f"{title}\n{body_text}".lower()
    domain = extract_domain(url)

    if domain not in ALWAYS_KEEP_DOMAINS:
        if not any(kw.lower() in full_text_lower for kw in KEYWORDS):
            print(f"[SKIP] {url} (no AQ keywords)")
            return None

    article = {
        "title": title,
        "url": url,
        "domain": domain,
        "fetched_at": dt.datetime.now(timezone.utc).isoformat(),
        "text": body_text,
    }
    print(f"[OK] Extracted article from {url} (len={len(body_text)} chars)")
    return article


def build_corpus_from_urls(urls: List[str]) -> List[Dict]:
    articles: List[Dict] = []
    for url in urls:
        art = extract_article_from_html(url)
        if art:
            articles.append(art)
    print(f"[CORPUS] Collected {len(articles)} articles from direct URLs.")
    return articles


def build_corpus_from_rss(feeds: List[str]) -> List[Dict]:
    """
    Fetch articles from a list of RSS feeds.
    For each entry we:
      - take the link
      - run it through extract_article_from_html()
      - apply the same KEYWORDS filtering
    """
    articles: List[Dict] = []

    for feed_url in feeds:
        print(f"[RSS] Fetching feed {feed_url}")
        parsed = feedparser.parse(feed_url)

        if parsed.bozo:
            print(f"[RSS-WARN] Problem parsing feed {feed_url}: {parsed.bozo_exception}")
            continue

        for entry in parsed.entries:
            link = entry.get("link")
            if not link:
                continue

            # Reuse the HTML scraper so everything is consistent
            art = extract_article_from_html(link)
            if not art:
                continue

            # Prefer the RSS title if present
            if entry.get("title"):
                art["title"] = entry.title

            articles.append(art)

    print(f"[RSS] Collected {len(articles)} articles from RSS feeds.")
    return articles


def save_corpus_to_text_file(articles: List[Dict], path: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        for a in articles:
            block = (
                "=== ARTICLE START ===\n"
                f"TITLE: {a['title']}\n"
                f"URL: {a['url']}\n"
                f"DOMAIN: {a['domain']}\n"
                f"FETCHED_AT: {a['fetched_at']}\n\n"
                f"{a['text']}\n"
                "=== ARTICLE END ===\n\n"
            )
            f.write(block)
    print(f"[CORPUS] Wrote corpus to {path}")


def ingest_trusted_sources():
    """
    Build the full RAG corpus from:
      - Aerlive / Agerpres / Calitatea Aer URLs (TRUSTED_URLS)
      - Romania Insider + HotNews RSS feeds (WHITELIST_RSS_FEEDS)
    """
    if not TRUSTED_URLS and not WHITELIST_RSS_FEEDS:
        raise RuntimeError(
            "TRUSTED_URLS and WHITELIST_RSS_FEEDS are both empty. "
            "Add Aerlive / Calitatea Aer / AGERPRES URLs or RSS feeds first."
        )

    articles: List[Dict] = []

    if TRUSTED_URLS:
        url_articles = build_corpus_from_urls(TRUSTED_URLS)
        articles.extend(url_articles)

    if WHITELIST_RSS_FEEDS:
        rss_articles = build_corpus_from_rss(WHITELIST_RSS_FEEDS)
        articles.extend(rss_articles)

    if not articles:
        print("[INGEST] No articles collected from HTML or RSS. Aborting.")
        return

    save_corpus_to_text_file(articles, CORPUS_FILE)
    vs_id = create_or_load_vector_store()
    upload_corpus_to_vector_store(vs_id, CORPUS_FILE)
    print("[INGEST] Done. Vector store ready for RAG.")



# -------------------------------------------------------
# 3. Vector Store creation / upload
# -------------------------------------------------------

def create_or_load_vector_store() -> str:
    if os.path.exists(VECTOR_STORE_ID_FILE):
        vs_id = open(VECTOR_STORE_ID_FILE, "r", encoding="utf-8").read().strip()
        print(f"[VECTOR] Reusing existing vector store: {vs_id}")
        return vs_id

    vs = client.vector_stores.create(name=VECTOR_STORE_NAME)
    vs_id = vs.id
    with open(VECTOR_STORE_ID_FILE, "w", encoding="utf-8") as f:
        f.write(vs_id)
    print(f"[VECTOR] Created new vector store: {vs_id}")
    return vs_id


def upload_corpus_to_vector_store(vs_id: str, file_path: str) -> None:
    """
    Upload the corpus file and attach to the vector store.
    We use file_batches.upload_and_poll so it waits until embedding is done.
    """
    print(f"[VECTOR] Uploading {file_path} to vector store {vs_id} ...")

    file_streams = [open(file_path, "rb")]

    batch = client.vector_stores.file_batches.upload_and_poll(
        vector_store_id=vs_id,
        files=file_streams,
    )

    print(
        f"[VECTOR] Upload batch status = {batch.status}, "
        f"file_counts = {batch.file_counts}"
    )


# -------------------------------------------------------
# 4. RAG: explain a spike using sensor data + docs
# -------------------------------------------------------

def rag_explain_spike(
    question: str,
    sensor_snapshot: Dict,
    vector_store_id: str,
    model: str = "gpt-4.1-mini",
) -> str:
    """
    Main RAG function you call from your backend.
    `sensor_snapshot` can look like:
        {
            "city": "Bucharest",
            "sector": 3,
            "time_utc": "...",
            "pm25": 120.0,
            "pm10": 180.0,
            "no2": 60.0
        }
    """
    # First, check if the question is relevant to air quality
    relevance_check = client.responses.create(
        model=model,
        instructions=(
            "You are a question classifier. Determine if the user's question is "
            "related to air quality, pollution, breathing, health impacts of air, "
            "going outside in specific locations, or environmental conditions.\n\n"
            "Reply ONLY with 'YES' if the question is air quality related, or 'NO' if it is not."
        ),
        input=f"Question: {question}",
        max_output_tokens=16,
    )
    
    relevance = str(relevance_check.output_text).strip().upper()
    
    if relevance != "YES":
        return (
            "I'm an Air Quality advisor for Bucharest. I can only answer questions about "
            "air pollution, air quality, breathing conditions, and whether it's safe to go "
            "outside in different neighborhoods. Please ask me something related to air quality!"
        )
    
    sensor_json = json.dumps(sensor_snapshot, ensure_ascii=False)

    instructions = (
        "You are an Air Quality Advisor for Bucharest. "
        "You receive:\n"
        "1) A JSON snapshot with current PM2.5, PM10, NO2, neighborhood, sector, and time.\n"
        "2) Retrieved trusted documents from official/NGO sites.\n\n"
        "Task:\n"
        "- Use the CORRECT neighborhood and sector from the snapshot when answering.\n"
        "- Explain possible causes of current air pollution spikes, "
        "  ONLY if there is some support in the documents or common knowledge.\n"
        "- Be explicit about uncertainty (e.g., 'likely due to', 'no clear cause').\n"
        "- Give concrete recommendations for the next 24 hours: when to go outside, "
        "  when to open windows, whether to wear a mask, etc.\n"
        "- If the data source is PLACEHOLDER, mention that real-time data should be checked.\n"
        "- Keep the answer short (max ~8 sentences) and practical."
    )

    full_input = (
        f"User question: {question}\n\n"
        f"Sensor snapshot JSON: {sensor_json}\n\n"
        f"IMPORTANT: Answer specifically about the neighborhood and sector in the snapshot. "
        f"Use the documents to support or invalidate potential causes. "
        f"If an official alert is found, mention its source and date."
    )

    resp = client.responses.create(
        model=model,
        instructions=instructions,
        input=full_input,
        tools=[
            {
                "type": "file_search",
                "vector_store_ids": [vector_store_id],
                "max_num_results": 8,
            }
        ],
        max_output_tokens=400,
    )

    # <- THIS is the important change:
    return str(resp.output_text)


# -------------------------------------------------------
# 5. CLI demo (for quick local testing)
# -------------------------------------------------------

def demo_ask(question: str):
    if not os.path.exists(VECTOR_STORE_ID_FILE):
        raise RuntimeError(
            "Vector store not found. Run `python aircoachrag.py ingest` first."
        )
    vs_id = open(VECTOR_STORE_ID_FILE, "r", encoding="utf-8").read().strip()

    # Extract location from question using LLM
    location_extract = client.responses.create(
        model="gpt-4o-mini",
        instructions=(
            "Extract the neighborhood name and sector number from the user's question about Bucharest.\n"
            "Return ONLY a JSON object with 'neighborhood' and 'sector' fields.\n"
            "If you can't determine the sector, use null.\n"
            "Example: {\"neighborhood\": \"Crangasi\", \"sector\": 6}\n"
            "Common neighborhoods: Crangasi (S6), Nicolae Teclu (S3), Titan (S3), Drumul Taberei (S6), "
            "Militari (S6), Berceni (S4), Pantelimon (S2), Colentina (S2), etc."
        ),
        input=f"Question: {question}",
        max_output_tokens=100,
    )
    
    try:
        location_data = json.loads(str(location_extract.output_text))
        neighborhood = location_data.get("neighborhood", "Unknown")
        sector = location_data.get("sector", None)
    except:
        neighborhood = "Unknown"
        sector = None
    
    # TODO: Replace this with real API call to fetch actual sensor data for the location
    # For now, we'll use placeholder data but make it clear in the response
    snapshot = {
        "city": "Bucharest",
        "neighborhood": neighborhood,
        "sector": sector if sector else "Unknown",
        "time_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "pm25": 115.0,  # PLACEHOLDER - should come from API
        "pm10": 180.0,  # PLACEHOLDER - should come from API
        "no2": 62.0,    # PLACEHOLDER - should come from API
        "data_source": "PLACEHOLDER (not real sensor data)"
    }
    
    print(f"\n[INFO] Detected location: {neighborhood}, Sector {sector if sector else 'Unknown'}")
    print(f"[WARNING] Using placeholder sensor data - integrate real API for production!\n")

    answer = rag_explain_spike(question, snapshot, vs_id)
    print("\n=== RAG ANSWER ===\n")
    print(answer)


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("ingest", help="Fetch trusted URLs and build vector store.")

    ask_p = sub.add_parser("ask", help="Ask a RAG question.")
    ask_p.add_argument("question", type=str, help="Question about current AQ spike")

    args = parser.parse_args()

    if args.cmd == "ingest":
        ingest_trusted_sources()
    elif args.cmd == "ask":
        demo_ask(args.question)


if __name__ == "__main__":
    main()
