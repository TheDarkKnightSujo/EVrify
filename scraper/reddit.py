# pyrefly: ignore [missing-import]
import praw
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))

reddit = praw.Reddit(
    client_id=os.getenv("REDDIT_CLIENT_ID"),
    client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
    user_agent="ev-route-planner-research/1.0"
)

SUBREDDITS = ["electricvehicles", "ChargingStations", "India", "IndianEVs"]
KEYWORDS = ["charging station", "charger broken", "EV charging", "fast charger"]

def fetch_reddit_reviews():
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()

    for sub_name in SUBREDDITS:
        subreddit = reddit.subreddit(sub_name)
        for keyword in KEYWORDS:
            for post in subreddit.search(keyword, limit=50, time_filter="month"):
                text = post.title + " " + (post.selftext or "")
                # Store as unlinked review (station_id = NULL, to be matched later)
                cur.execute("""
                    INSERT INTO reviews (review_text, source)
                    VALUES (%s, 'reddit')
                """, (text[:2000],))
        conn.commit()
        print(f"Done with r/{sub_name}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    fetch_reddit_reviews()
    print("Reddit scrape complete.")
