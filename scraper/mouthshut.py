import httpx
from bs4 import BeautifulSoup
import psycopg2
import os, time, hashlib
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))


MOUTHSHUT_PAGES = {
    "Ather 450X":             "https://www.mouthshut.com/product-reviews/Ather-450X-reviews-925997672",
    "Ather 450":              "https://www.mouthshut.com/product-reviews/Ather-450-reviews-925958742",
    "Tata Nexon EV":          "https://www.mouthshut.com/product-reviews/Tata-Nexon-EV-reviews-925994273",
    "Tata Punch EV":          "https://www.mouthshut.com/product-reviews/Tata-Punch-EV-reviews-926017770",
    "Tata Tiago EV":          "https://www.mouthshut.com/product-reviews/Tata-Tiago-EV-reviews-926006456",
    "Ola S1 Pro":             "https://www.mouthshut.com/product-reviews/Ola-S1-Pro-reviews-925997871",
    "Ola S1":                 "https://www.mouthshut.com/product-reviews/Ola-S1-reviews-926019515",
    "Ola S1 X":               "https://www.mouthshut.com/product-reviews/Ola-S1-X-reviews-926107386",
    "TVS iQube":              "https://www.mouthshut.com/product-reviews/TVS-iQube-Electric-reviews-925997876",
    "Mahindra XUV400 EV":     "https://www.mouthshut.com/product-reviews/Mahindra-XUV400-EV-reviews-926054817",
    "MG ZS EV":               "https://www.mouthshut.com/product-reviews/MG-ZS-EV-reviews-925983794",
    "MG Comet EV":            "https://www.mouthshut.com/product-reviews/MG-Comet-EV-reviews-926012437",
    "Hyundai Kona Electric":  "https://www.mouthshut.com/product-reviews/Hyundai-Kona-Electric-reviews-925985871",
    "BYD Atto 3":             "https://www.mouthshut.com/product-reviews/BYD-Atto-3-reviews-926063991",
    "Zevpoint Charger":       "https://www.mouthshut.com/product-reviews/ZEVPOINT-reviews-926084666",
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
