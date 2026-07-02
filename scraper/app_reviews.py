import psycopg2
import os, time
from dotenv import load_dotenv
from google_play_scraper import app, reviews, Sort

load_dotenv()

# India EV charging app package IDs on Google Play Store
APPS = {
    "Ather Energy":         "com.atherspace.atherapp",
    "Tata Power EZ Charge": "com.tatapower.evcharging",
    "Statiq":               "com.statiq.evclient",
    "ChargeZone":           "com.chargezone.app",
}

def fetch_app_reviews(app_id, app_name, count=200):
    """
    Fetch the most recent reviews for a given app from Google Play.
    Sorted by newest first so we get fresh signal.
    """
    try:
        result, _ = reviews(
            app_id,
            lang='en',
            country='in',
            sort=Sort.NEWEST,
            count=count,
        )
        return result
    except Exception as e:
        print(f"App review error ({app_name}): {e}")
        return []

def run_app_review_scraper():
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur  = conn.cursor()
    total = 0

    for app_name, app_id in APPS.items():
        print(f"Fetching Play Store reviews for {app_name}...")
        rev_list = fetch_app_reviews(app_id, app_name)
        for rev in rev_list:
            text = rev.get("content", "").strip()
            if text and len(text) > 20:
                cur.execute("""
                    INSERT INTO reviews (review_text, rating, review_date, source)
                    VALUES (%s, %s, %s, 'play_store')
                """, (
                    text[:1500],
                    float(rev.get("score", 0)),
                    rev.get("at"),          # datetime object
                ))
                total += 1
        conn.commit()
        time.sleep(2)   # polite pacing between apps

    cur.close()
    conn.close()
    print(f"App Store scrape complete. Inserted {total} reviews.")

if __name__ == "__main__":
    run_app_review_scraper()
