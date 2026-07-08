import httpx
from bs4 import BeautifulSoup
import psycopg2
import os, time
from urllib.parse import quote
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))

# Search queries targeting charging station news
NEWS_QUERIES = [
    "EV charging station broken India",
    "electric vehicle charger outage",
    "EV charging station vandalism",
    "fast charger not working",
    "EV charging network down",
    "Ather charging station problem",
    "Tata EV charger review",
    "Statiq EV charger not working",
    "ChargeZone station broken",
    "Zeon Charging issues India",
    "Jio-bp pulse charger downtime",
    "Glida EV charger issues",
    "highway EV charging complaints India",
    "EV charger billing issues India",
    "Mahindra XUV400 charger problem",
    "MG ZS EV charging fault",
    "Ola Hypercharger down",
]


def fetch_google_news(query):
    """
    Uses Google News RSS feed — free, no key, static XML.
    Returns list of article titles + descriptions.
    """
    encoded = quote(query)
    url = f"https://news.google.com/rss/search?q={encoded}&hl=en-IN&gl=IN&ceid=IN:en"
    try:
        r = httpx.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        soup = BeautifulSoup(r.text, "xml")
        items = soup.find_all("item")
        results = []
        for item in items[:10]:
            title = item.find("title")
            desc  = item.find("description")
            text  = ""
            if title: text += title.get_text() + " "
            if desc:  text += BeautifulSoup(desc.get_text(), "html.parser").get_text()
            if text.strip():
                results.append(text.strip()[:1000])
        return results
    except Exception as e:
        print(f"News fetch error for '{query}': {e}")
        return []

def run_news_scraper():
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur  = conn.cursor()
    total = 0

    for query in NEWS_QUERIES:
        articles = fetch_google_news(query)
        for text in articles:
            cur.execute("""
                INSERT INTO reviews (review_text, source)
                VALUES (%s, 'news')
            """, (text,))
            total += 1
        conn.commit()
        time.sleep(2)   # polite pacing

    cur.close()
    conn.close()
    print(f"News scrape complete. Inserted {total} articles.")

if __name__ == "__main__":
    run_news_scraper()
