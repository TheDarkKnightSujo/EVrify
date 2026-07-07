import httpx
from bs4 import BeautifulSoup
import psycopg2
import os, time, hashlib
from urllib.parse import quote
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-IN,en;q=0.9",
}

QUORA_QUERIES = [
        # --- Your Original Baseline Queries ---
    "EV charging station India review latest",
    "Mumbai Goa EV road trip charging",
    "Tata Nexon EV highway charging experience India",
    "Ather 450X long drive charging stops",
    "India EV charging network honest review",

    # --- Major Indian Highway Corridors (High Density EV Travel) ---
    "Mumbai Pune expressway EV charging stations",
    "Delhi Jaipur highway EV road trip charging",
    "Bangalore Mysore road trip EV charging",
    "Delhi Chandigarh EV highway drive experience",
    "Samruddhi Mahamarg EV charging station network",
    "Chennai Bangalore highway EV charging stops",
    "Hyderabad Vijaywada EV driving range test",

    # --- Network-Specific & Operator Infrastructure Reviews ---
    "Tata Power EZ Charge highway stations review",
    "Statiq EV charger not working India",
    "ChargeZone fast charger highway experience",
    "Jio-bp pulse EV charging station review",
    "Zeon Charging reliable fast chargers highway",
    "Glida EV charging station reality check India",
    "Shell Recharge EV highway charging review",

    # --- Diverse Vehicle Range & Real-World Highway Testing ---
    "Punch EV highway long drive range test",
    "Ola S1 Pro long distance highway charging",
    "Mahindra XUV400 EV highway trip review",
    "BYD Atto 3 road trip India charging",
    "Tiago EV highway driving range anxiety",
    "Ather Rizta family road trip charging stops",

    # --- Outage, Wait Times, & Edge-Case Incident Reports ---
    "EV charging station long queues India highway",
    "broken EV charger highway India experience",
    "EV charging station power cut issue highway",
    "Tata Nexon EV towing highway battery drain",
    "night driving EV road trip safety charging India",
]

EV_KEYWORDS = ["charg","station","ev","electric","range","charger","kwh","ather","tata","statiq"]

def fetch_quora_results(query):
    url  = f"https://www.quora.com/search?q={quote(query)}"
    try:
        r    = httpx.get(url, headers=HEADERS, timeout=20, follow_redirects=True)
        soup = BeautifulSoup(r.text, "lxml")
        containers = (
            soup.find_all("div", class_=lambda c: c and "q-text" in c) or
            soup.find_all("span", class_=lambda c: c and "qu-" in (c or ""))
        )
        results = []
        for container in containers[:10]:
            text = container.get_text(separator=" ", strip=True)
            if any(k in text.lower() for k in EV_KEYWORDS) and len(text) > 100:
                results.append(text[:2000])
        return results
    except Exception as e:
        print(f"Quora error ('{query}'): {e}")
        return []

def run_quora_scraper():
    conn  = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur   = conn.cursor()
    total = 0
    for query in QUORA_QUERIES:
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

        results = fetch_quora_results(query)
        for text in results:
            review_hash = hashlib.sha256(text.encode('utf-8')).hexdigest()
            cur.execute(
                "INSERT INTO reviews (review_text, source, network_operator, review_hash) VALUES (%s, 'quora', %s, %s) ON CONFLICT (review_hash) DO NOTHING", 
                (text, network, review_hash)
            )
            total += 1
        conn.commit()
        print(f"Quora '{query[:45]}': {len(results)} answers")
        time.sleep(3)
    cur.close()
    conn.close()
    print(f"Quora complete. {total} answers stored.")

if __name__ == "__main__":
    run_quora_scraper()
