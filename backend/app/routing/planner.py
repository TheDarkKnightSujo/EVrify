import httpx
import os
import psycopg2
import math
from dotenv import load_dotenv

load_dotenv()

ORS_KEY = os.getenv("ORS_API_KEY")

def haversine_distance_km(lon1, lat1, lon2, lat2):
    """Calculate the great-circle distance between two points on the Earth."""
    R = 6371.0  # Earth's radius in kilometers
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)

    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad

    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def geocode(place_name):
    """Convert a place name to (lat, lng) using Nominatim (free, no key)."""
    url = "https://nominatim.openstreetmap.org/search"
    try:
        r = httpx.get(url,
            params={"q": place_name, "format": "json", "limit": 1},
            headers={"User-Agent": "ev-route-planner/1.0"},
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as e:
        print(f"Geocoding failed for '{place_name}': {e}")
    raise ValueError(f"Could not geocode: {place_name}")

def get_route_distance_km(origin_lng, origin_lat, dest_lng, dest_lat):
    """Get driving distance in km between two points via ORS, with Haversine fallback."""
    url     = "https://api.openrouteservice.org/v2/directions/driving-car"
    headers = {"Authorization": ORS_KEY}
    body    = {"coordinates": [[origin_lng, origin_lat], [dest_lng, dest_lat]]}
    try:
        r = httpx.post(url, json=body, headers=headers, timeout=15)
        r.raise_for_status()
        data = r.json()
        distance_m = data["routes"][0]["summary"]["distance"]
        return distance_m / 1000
    except Exception as e:
        print(f"ORS API request failed or timed out: {e}. Falling back to estimated Haversine distance.")
        # Estimate driving distance by multiplying straight-line distance by a road winding factor of 1.25
        straight_dist = haversine_distance_km(origin_lng, origin_lat, dest_lng, dest_lat)
        return straight_dist * 1.25

def get_weather_range_multiplier(lat, lng):
    """Adjust effective range based on ambient temperature, with fallback."""
    url = "https://api.open-meteo.com/v1/forecast"
    try:
        r = httpx.get(url, params={
            "latitude": lat, "longitude": lng,
            "current": "temperature_2m"
        }, timeout=10)
        r.raise_for_status()
        temp = r.json()["current"]["temperature_2m"]
        if temp > 30:
            return 0.90   # heat degrades battery efficiency
        elif temp < 5:
            return 0.75   # cold reduces range significantly
    except Exception as e:
        print(f"Weather lookup failed: {e}. Defaulting to multiplier 1.00.")
    return 1.00

def find_best_station_near(lat, lng, radius_km=25):
    """
    Find the highest-reliability-scored charging station within radius.
    Falls back to nearest station if none have a score yet.
    """
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur  = conn.cursor()
    cur.execute("""
        SELECT
            id, name,
            ST_Y(location::geometry) AS lat,
            ST_X(location::geometry) AS lng,
            reliability_score, address, connector_types,
            ST_Distance(
                location,
                ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography
            ) AS distance_m
        FROM stations
        WHERE ST_DWithin(
            location,
            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,
            %s
        )
        ORDER BY reliability_score DESC NULLS LAST, distance_m ASC
        LIMIT 1
    """, (lng, lat, lng, lat, radius_km * 1000))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if row:
        return {
            "id":                row[0],
            "name":              row[1],
            "lat":               row[2],
            "lng":               row[3],
            "reliability_score": row[4],
            "address":           row[5],
            "connector_types":   row[6],
            "distance_from_route_m": round(row[7]),
        }
    return None

def plan_route(origin_name, destination_name, claimed_range_km):
    """
    Main planning function.
    Returns list of charging stops between origin and destination,
    ordered by appearance on the route.
    """
    origin_lat, origin_lng = geocode(origin_name)
    dest_lat,   dest_lng   = geocode(destination_name)

    # Apply weather-based range adjustment
    multiplier     = get_weather_range_multiplier(origin_lat, origin_lng)
    # Use 80% of effective range as safety buffer (range anxiety is real)
    effective_range = claimed_range_km * multiplier * 0.80

    total_distance = get_route_distance_km(
        origin_lng, origin_lat, dest_lng, dest_lat
    )

    stops     = []
    warnings  = []
    current_lat, current_lng = origin_lat, origin_lng
    remaining_distance       = total_distance

    while remaining_distance > effective_range:
        # Linear interpolation along the straight-line direction
        fraction = effective_range / remaining_distance
        next_lat = current_lat + (dest_lat - current_lat) * fraction
        next_lng = current_lng + (dest_lng - current_lng) * fraction

        station = find_best_station_near(next_lat, next_lng, radius_km=25)

        if not station:
            warnings.append(
                f"No station found near ({next_lat:.4f}, {next_lng:.4f}). "
                f"Segment may not be feasible."
            )
            break

        stops.append(station)
        current_lat        = station["lat"]
        current_lng        = station["lng"]
        remaining_distance = get_route_distance_km(
            current_lng, current_lat, dest_lng, dest_lat
        )

    return {
        "origin":             {"name": origin_name, "lat": origin_lat, "lng": origin_lng},
        "destination":        {"name": destination_name, "lat": dest_lat, "lng": dest_lng},
        "total_distance_km":  round(total_distance, 1),
        "effective_range_km": round(effective_range, 1),
        "weather_multiplier": multiplier,
        "stops":              stops,
        "warnings":           warnings,
    }