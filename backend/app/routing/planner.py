# pyrefly: ignore [missing-import]
import httpx
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

ORS_KEY = os.getenv("ORS_API_KEY")

def geocode(place_name):
    """Convert a place name to (lat, lng) using Nominatim (free, no key)."""
    url = "https://nominatim.openstreetmap.org/search"
    r = httpx.get(url, params={"q": place_name, "format": "json", "limit": 1},
                  headers={"User-Agent": "ev-route-planner/1.0"})
    data = r.json()
    if data:
        return float(data[0]["lat"]), float(data[0]["lon"])
    raise ValueError(f"Could not geocode: {place_name}")

def get_route_distance_km(origin_lng, origin_lat, dest_lng, dest_lat):
    """Get driving distance in km between two points via ORS."""
    url = "https://api.openrouteservice.org/v2/directions/driving-car"
    headers = {"Authorization": ORS_KEY}
    body = {"coordinates": [[origin_lng, origin_lat], [dest_lng, dest_lat]]}
    r = httpx.post(url, json=body, headers=headers)
    data = r.json()
    distance_m = data["routes"][0]["summary"]["distance"]
    return distance_m / 1000

def get_weather_range_multiplier(lat, lng):
    """Adjust range based on temperature. Cold = less range."""
    url = "https://api.open-meteo.com/v1/forecast"
    r = httpx.get(url, params={
        "latitude": lat, "longitude": lng,
        "current": "temperature_2m"
    })
    temp = r.json()["current"]["temperature_2m"]
    if temp > 30:
        return 0.90   # heat affects battery
    elif temp < 5:
        return 0.75   # cold kills range fastest
    return 1.00

def find_best_station_near(lat, lng, radius_km=20):
    """Find the highest-reliability charging station within radius."""
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()
    cur.execute("""
        SELECT id, name, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng,
               reliability_score, address, connector_types
        FROM stations
        WHERE ST_DWithin(
            location,
            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,
            %s
        )
        ORDER BY reliability_score DESC NULLS LAST
        LIMIT 1
    """, (lng, lat, radius_km * 1000))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if row:
        return {
            "id": row[0], "name": row[1],
            "lat": row[2], "lng": row[3],
            "reliability_score": row[4],
            "address": row[5],
            "connector_types": row[6],
        }
    return None

def plan_route(origin_name, destination_name, claimed_range_km):
    """
    Main planning function.
    Returns list of charging stops between origin and destination.
    """
    origin_lat, origin_lng = geocode(origin_name)
    dest_lat, dest_lng = geocode(destination_name)

    # Apply weather-based range adjustment
    multiplier = get_weather_range_multiplier(origin_lat, origin_lng)
    effective_range = claimed_range_km * multiplier * 0.80  # use 80% of range as safety buffer

    total_distance = get_route_distance_km(origin_lng, origin_lat, dest_lng, dest_lat)

    stops = []
    current_lat, current_lng = origin_lat, origin_lng
    remaining_distance = total_distance

    while remaining_distance > effective_range:
        # Move effective_range km along the direction toward destination
        # Simple linear interpolation (for MVP — upgrade to polyline sampling later)
        fraction = effective_range / remaining_distance
        next_lat = current_lat + (dest_lat - current_lat) * fraction
        next_lng = current_lng + (dest_lng - current_lng) * fraction

        station = find_best_station_near(next_lat, next_lng, radius_km=25)
        if not station:
            stops.append({
                "warning": f"No station found near ({next_lat:.4f}, {next_lng:.4f}). Route may not be feasible."
            })
            break

        stops.append(station)
        current_lat = station["lat"]
        current_lng = station["lng"]
        remaining_distance = get_route_distance_km(current_lng, current_lat, dest_lng, dest_lat)

    return {
        "origin": {"name": origin_name, "lat": origin_lat, "lng": origin_lng},
        "destination": {"name": destination_name, "lat": dest_lat, "lng": dest_lng},
        "total_distance_km": round(total_distance, 1),
        "effective_range_km": round(effective_range, 1),
        "weather_multiplier": multiplier,
        "stops": stops,
        "warnings": [s for s in stops if "warning" in s],
    }
