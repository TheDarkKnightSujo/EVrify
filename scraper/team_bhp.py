import httpx
from bs4 import BeautifulSoup
import psycopg2
import os, time
from dotenv import load_dotenv

load_dotenv()

# Team-BHP search URLs for EV charging content
SEARCH_QUERIES = [
    "EV charging station",
    "Ather charger experience",
    "Tata Power charger review",
    "Statiq charging station",
    "ChargeZone review",
    "fast charger broken",
    "highway charging India",
]

def fetch_teambhp_posts(query, max_pages=3):
    """
    Searches Team-BHP using their built-in search and parses post text.
    Returns a list of post text strings.
    """
    results = []
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; ev-research-bot/1.0)"
    }
    encoded = query.replace(' ', '+')
    search_url = f"https://www.team-bhp.com/forum/search.php?searchid=&do=process&query={encoded}&showposts=1"

    try:
        r = httpx.get(search_url, headers=headers, timeout=20)
        soup = BeautifulSoup(r.text, "html.parser")

        # Team-BHP post text is in <div class="post_message"> elements
        posts = soup.find_all("div", class_="post_message")
        for post in posts[:30]:
            text = post.get_text(separator=" ", strip=True)
            if len(text) > 80:   # skip very short fragments
                results.append(text[:1500])
    except Exception as e:
        print(f"Team-BHP error for '{query}': {e}")
    return results

def run_teambhp_scraper():
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur  = conn.cursor()
    total = 0

    for query in SEARCH_QUERIES:
        posts = fetch_teambhp_posts(query)
        for text in posts:
            cur.execute("""
                INSERT INTO reviews (review_text, source)
                VALUES (%s, 'teambhp')
            """, (text,))
            total += 1
        conn.commit()
        time.sleep(3)   # polite rate limiting

    cur.close()
    conn.close()
    print(f"Team-BHP scrape complete. Inserted {total} posts.")

if __name__ == "__main__":
    run_teambhp_scraper()