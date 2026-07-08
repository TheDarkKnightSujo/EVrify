import httpx
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Fetch stations for India (countrycode=IN)
# Change to US, GB, DE etc. for other regions
def fetch_ocm_stations(country="IN", max_results=5000):
    url = "https://api.openchargemap.io/v3/poi/"
    params = {
        "output": "json",
        "countrycode": country,
        "maxresults": max_results,
        "compact": True,
        "verbose": False,
        "key": os.getenv("OCM_API_KEY", "")
    }
    r = httpx.get(url, params=params, timeout=60)
    
    if r.status_code != 200:
        print(f"Error fetching data from Open Charge Map: {r.status_code}")
        print(r.text)
        r.raise_for_status()
        
    return r.json()

def insert_stations(stations):
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()
    inserted = 0
    for s in stations:
        try:
            addr_info = s.get("AddressInfo", {})
            lat = addr_info.get("Latitude")
            lng = addr_info.get("Longitude")
            name = addr_info.get("Title", "Unknown")
            address = addr_info.get("AddressLine1", "")
            conns = s.get("Connections", [])
            connector_types = list({c.get("ConnectionType", {}).get("Title", "") for c in conns if c.get("ConnectionType")})
            stalls = sum(c.get("Quantity", 1) or 1 for c in conns)

            if lat and lng:
                cur.execute("""
                    INSERT INTO stations (name, location, address, connector_types, total_stalls, source)
                    VALUES (%s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, %s, 'ocm')
                    ON CONFLICT DO NOTHING
                """, (name, lng, lat, address, connector_types, stalls))
                inserted += 1
        except Exception as e:
            print(f"Skipping station: {e}")
    conn.commit()
    cur.close()
    conn.close()
    print(f"Inserted {inserted} stations.")

if __name__ == "__main__":
    print("Fetching from Open Charge Map...")
    data = fetch_ocm_stations()
    print(f"Fetched {len(data)} stations. Inserting...")
    insert_stations(data)
