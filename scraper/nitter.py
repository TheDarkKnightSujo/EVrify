import asyncio
from playwright.async_api import async_playwright
import psycopg2
import os, time, random, hashlib
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))

# Check https://github.com/zedeus/nitter/wiki/Instances for current list
NITTER_INSTANCES = [
    "https://nitter.net",
    "https://nitter.privacydev.net",
    "https://nitter.poast.org",
]

SEARCH_QUERIES = [
    "EV charging India broken",
    "Ather charger not working",
    "Ather grid charging slow",
    "Tata EZ Charge broken",
    "Tata Power EZ Charge problems",
    "Statiq charger down India",
    "Statiq EV charger broken",
    "ChargeZone broken India",
    "ChargeZone charger failure India",
    "Zeon charger not working",
    "Zeon charging station broken",
    "Jio-bp pulse charger broken",
    "Jio-bp charger issues",
    "Glida charger down India",
    "Shell Recharge charger issues India",
    "EV charging station India experience",
    "electric vehicle charger India review",
    "highway EV charger broken India",
]


async def find_working_instance(page):
    for instance in NITTER_INSTANCES:
        try:
            await page.goto(instance, timeout=10000)
            await page.wait_for_timeout(1000)
            if await page.query_selector(".timeline"):
                print(f"Using Nitter instance: {instance}")
                return instance
        except:
            continue
    print("No Nitter instance available. Skipping.")
    return None

async def scrape_nitter_search(page, instance, query):
    url = f"{instance}/search?q={query.replace(' ', '+')}&f=tweets"
    try:
        await page.goto(url, timeout=20000)
        await page.wait_for_timeout(2000)
        tweet_els = await page.query_selector_all(".tweet-content")
        results   = []
        for el in tweet_els[:30]:
            text = await el.inner_text()
            if len(text.strip()) > 30:
                results.append(text.strip()[:500])
        return results
    except Exception as e:
        print(f"Nitter search error ('{query}'): {e}")
        return []

async def run_nitter_scraper():
    conn  = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur   = conn.cursor()
    total = 0
    async with async_playwright() as p:
        browser  = await p.chromium.launch(headless=True)
        page     = await browser.new_page()
        instance = await find_working_instance(page)
        if not instance:
            print("Nitter unavailable — skipping cleanly. Pipeline continues.")
            await browser.close()
            cur.close()
            conn.close()
            return
            
        for query in SEARCH_QUERIES:
            network = None
            ql = query.lower()
            if "tata" in ql: network = "Tata EZ Charge"
            elif "ather" in ql: network = "Ather"
            elif "statiq" in ql: network = "Statiq"
            elif "chargezone" in ql: network = "ChargeZone"
            elif "jio" in ql: network = "Jio-bp pulse"
            elif "zeon" in ql: network = "Zeon Charging"
            elif "glida" in ql: network = "Glida"
            elif "shell" in ql: network = "Shell Recharge"
            
            tweets = await scrape_nitter_search(page, instance, query)
            for text in tweets:
                review_hash = hashlib.sha256(text.encode('utf-8')).hexdigest()
                cur.execute(
                    "INSERT INTO reviews (review_text, source, network_operator, review_hash) VALUES (%s, 'nitter_tweet', %s, %s) ON CONFLICT (review_hash) DO NOTHING", 
                    (text, network, review_hash)
                )
                total += 1
            conn.commit()
            print(f"Nitter '{query}': {len(tweets)} tweets")
            time.sleep(random.uniform(3, 6))
            
        await browser.close()
    cur.close()
    conn.close()
    print(f"Nitter complete. {total} tweets stored.")

if __name__ == "__main__":
    asyncio.run(run_nitter_scraper())
