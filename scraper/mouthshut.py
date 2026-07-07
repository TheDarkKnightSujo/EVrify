import httpx
from bs4 import BeautifulSoup
import psycopg2
import os, time, hashlib
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))


MOUTHSHUT_PAGES = {
    "Ather":          "https://www.mouthshut.com/product-reviews/Ather-Energy-reviews-925972456",
    "Tata EZ Charge": "https://www.mouthshut.com/product-reviews/Tata-Power-EZ-Charge-reviews-926001234",
    "Statiq":         "https://www.mouthshut.com/product-reviews/Statiq-EV-Charging-reviews-926001235",
    "ChargeZone":     "https://www.mouthshut.com/product-reviews/ChargeZone-EV-reviews-926001236",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-IN,en;q=0.9",
}

def scrape_mouthshut_page(network_name, base_url):
    results = []
    for page_num in range(1, 6):
        url = f"{base_url}?page={page_num}" if page_num > 1 else base_url
        try:
            r    = httpx.get(url, headers=HEADERS, timeout=20, follow_redirects=True)
            soup = BeautifulSoup(r.text, "lxml")
            divs = soup.find_all("div", class_=lambda c: c and "review" in c.lower())
            page_count = 0
            for div in divs:
                text = div.get_text(separator=" ", strip=True)
                kws  = ["charg","ev","station","charger","range","kwh","broken","wait","slow"]
                if any(k in text.lower() for k in kws) and len(text) > 80:
                    results.append(text[:2000])
                    page_count += 1
            if not page_count:
                break
            print(f"  MouthShut {network_name} p{page_num}: {page_count} reviews")
            time.sleep(2)
        except Exception as e:
            print(f"MouthShut error ({network_name} p{page_num}): {e}")
            break
    return results

def run_mouthshut_scraper():
    conn  = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur   = conn.cursor()
    total = 0
    for network_name, url in MOUTHSHUT_PAGES.items():
        print(f"Scraping MouthShut: {network_name}")
        reviews = scrape_mouthshut_page(network_name, url)
        for text in reviews:
            source = f"mouthshut_{network_name.lower().replace(' ','_')}"
            review_hash = hashlib.sha256(text.encode('utf-8')).hexdigest()
            cur.execute(
                "INSERT INTO reviews (review_text, source, network_operator, review_hash) VALUES (%s, %s, %s, %s) ON CONFLICT (review_hash) DO NOTHING",
                (text, source, network_name, review_hash)
            )
            total += 1
        conn.commit()
        time.sleep(3)
    cur.close()
    conn.close()
    print(f"MouthShut complete. {total} reviews stored.")

if __name__ == "__main__":
    run_mouthshut_scraper()
