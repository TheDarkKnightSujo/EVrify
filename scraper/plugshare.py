import asyncio
from playwright.async_api import async_playwright
import psycopg2
import os, time, random
from dotenv import load_dotenv

load_dotenv()

# PlugShare public station pages are accessible without login
# We scrape the station detail page for reviews and check-ins
# Rate limit: 1 request per 3-5 seconds to be respectful

async def scrape_station(page, station_id, ps_station_id):
    url = f"https://www.plugshare.com/location/{ps_station_id}"
    try:
        await page.goto(url, timeout=30000)
        await page.wait_for_timeout(2000)

        # Extract review elements (inspect the page to confirm selectors)
        reviews = await page.query_selector_all(".review-item")
        results = []
        for rev in reviews[:10]:  # cap at 10 per station
            text_el = await rev.query_selector(".review-text")
            rating_el = await rev.query_selector(".rating")
            text = await text_el.inner_text() if text_el else ""
            rating = await rating_el.inner_text() if rating_el else ""
            results.append({"text": text.strip(), "rating": rating.strip()})
        return results
    except Exception as e:
        print(f"Error scraping {ps_station_id}: {e}")
        return []

async def run_scraper():
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()

    # Get stations that have a plugshare source_url
    cur.execute("SELECT id, source_url FROM stations WHERE source_url IS NOT NULL LIMIT 100")
    stations = cur.fetchall()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.set_extra_http_headers({
            "User-Agent": "Mozilla/5.0 (compatible; research-bot/1.0)"
        })

        for station_id, source_url in stations:
            ps_id = source_url.split("/")[-1]
            reviews = await scrape_station(page, station_id, ps_id)
            for r in reviews:
                cur.execute("""
                    INSERT INTO reviews (station_id, review_text, source)
                    VALUES (%s, %s, 'plugshare')
                """, (station_id, r["text"]))
            conn.commit()
            wait = random.uniform(3, 6)   # polite rate limiting
            time.sleep(wait)

        await browser.close()
    cur.close()
    conn.close()
    print("Scraping complete.")

if __name__ == "__main__":
    asyncio.run(run_scraper())
