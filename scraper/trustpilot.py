import asyncio
from playwright.async_api import async_playwright
import psycopg2
import os, time
from dotenv import load_dotenv

load_dotenv()

# Map network operator name (as stored in stations.network_operator)
# to their Trustpilot review page URL — India networks
NETWORK_PAGES = {
    "Ather Energy":   "https://www.trustpilot.com/review/www.atherenergy.com",
    "Statiq":         "https://www.trustpilot.com/review/statiq.in",
    "ChargeZone":     "https://www.trustpilot.com/review/www.chargezone.in",
}

async def scrape_trustpilot(page, network_name, url):
    try:
        await page.goto(url, timeout=30000)
        await page.wait_for_timeout(2000)

        review_els = await page.query_selector_all("[data-service-review-text-typography]")
        results = []
        for el in review_els[:20]:
            text = await el.inner_text()
            if text.strip():
                results.append(text.strip())
        return results
    except Exception as e:
        print(f"Trustpilot error ({network_name}): {e}")
        return []

async def run_trustpilot_scraper():
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur  = conn.cursor()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page    = await browser.new_page()

        for network_name, url in NETWORK_PAGES.items():
            reviews = await scrape_trustpilot(page, network_name, url)
            for text in reviews:
                # Store with NULL station_id — linked at query time
                # via stations.network_operator = network_name
                cur.execute("""
                    INSERT INTO reviews (review_text, source)
                    VALUES (%s, %s)
                """, (text, f"trustpilot_{network_name.lower().replace(' ','_')}"))
            conn.commit()
            print(f"Trustpilot: {len(reviews)} reviews for {network_name}")
            time.sleep(3)

        await browser.close()

    cur.close()
    conn.close()
    print("Trustpilot scrape complete.")

if __name__ == "__main__":
    asyncio.run(run_trustpilot_scraper())
