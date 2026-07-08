import asyncio
from playwright.async_api import async_playwright
import psycopg2
import os, time, random
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))

async def scrape_google_reviews(page, station_name, address):
    query   = f"{station_name} EV charging {address}"
    search_url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}"
    try:
        await page.goto(search_url, timeout=30000)
        await page.wait_for_timeout(3000)

        # Click the first result
        first = await page.query_selector(".hfpxzc")
        if not first:
            return []
        await first.click()
        await page.wait_for_timeout(2000)

        # Extract overall rating
        rating_el = await page.query_selector(".ceNzKf")
        rating = await rating_el.get_attribute("aria-label") if rating_el else ""

        # Click "Reviews" tab to load review list
        reviews_tab = await page.query_selector("button[data-tab-index='1']")
        if reviews_tab:
            await reviews_tab.click()
            await page.wait_for_timeout(2000)

        # Scroll to load more reviews
        review_panel = await page.query_selector(".m6QErb")
        if review_panel:
            for _ in range(3):
                await review_panel.evaluate("el => el.scrollTop += 1000")
                await page.wait_for_timeout(1000)

        # Extract review text elements
        review_els = await page.query_selector_all(".wiI7pd")
        results = []
        for el in review_els[:15]:
            text = await el.inner_text()
            if text.strip():
                results.append({
                    "text": text.strip(),
                    "overall_rating": rating
                })
        return results

    except Exception as e:
        print(f"Google Maps error for {station_name}: {e}")
        return []

async def run_google_maps_scraper():
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur  = conn.cursor()

    # Target stations that have no reviews yet
    cur.execute("""
        SELECT s.id, s.name, s.address
        FROM stations s
        LEFT JOIN reviews r ON r.station_id = s.id AND r.source = 'google_maps'
        WHERE r.id IS NULL
        LIMIT 150
    """)
    stations = cur.fetchall()
    print(f"Scraping Google Maps for {len(stations)} stations...")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page    = await browser.new_page()

        for station_id, name, address in stations:
            reviews = await scrape_google_reviews(page, name, address or "")
            for r in reviews:
                cur.execute("""
                    INSERT INTO reviews (station_id, review_text, source)
                    VALUES (%s, %s, 'google_maps')
                """, (station_id, r["text"]))
            conn.commit()
            time.sleep(random.uniform(4, 8))

        await browser.close()

    cur.close()
    conn.close()
    print("Google Maps scrape complete.")

if __name__ == "__main__":
    asyncio.run(run_google_maps_scraper())
