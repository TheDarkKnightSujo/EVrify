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

def get_route_geometry_and_distance_km(origin_lng, origin_lat, dest_lng, dest_lat, waypoints=None):
    """Get driving path coordinates and distance in km between two points via ORS geojson."""
    url     = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"
    headers = {"Authorization": ORS_KEY, "Content-Type": "application/json"}
    
    coords = [[origin_lng, origin_lat]]
    if waypoints:
        coords.extend(waypoints)
    coords.append([dest_lng, dest_lat])
    
    body    = {"coordinates": coords}
    try:
        r = httpx.post(url, json=body, headers=headers, timeout=15)
        r.raise_for_status()
        data = r.json()
        
        # Get coordinates: ORS returns [lng, lat]
        coordinates = data["features"][0]["geometry"]["coordinates"]
        # Convert to [lat, lng]
        route_coords = [[coord[1], coord[0]] for coord in coordinates]
        
        distance_m = data["features"][0]["properties"]["summary"]["distance"]
        return route_coords, distance_m / 1000
    except Exception as e:
        print(f"GeoJSON routing failed: {e}. Falling back to straight line.")
        # Fallback to straight line
        route_coords = [[origin_lat, origin_lng], [dest_lat, dest_lng]]
        straight_dist = haversine_distance_km(origin_lng, origin_lat, dest_lng, dest_lat)
        return route_coords, straight_dist * 1.25

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

def find_best_station_near(lat, lng, radius_km=25, prefer_scored=True):
    """
    Find the highest-reliability-scored charging station within radius.
    If prefer_scored is True, it filters for stations where reliability_score is NOT NULL.
    """
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur  = conn.cursor()
    
    if prefer_scored:
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
            WHERE reliability_score IS NOT NULL AND ST_DWithin(
                location,
                ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,
                %s
            )
            ORDER BY reliability_score DESC, distance_m ASC
            LIMIT 1
        """, (lng, lat, lng, lat, radius_km * 1000))
    else:
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

def plan_route(origin_name, destination_name, claimed_range_km, custom_stops=None, pick_own_chargers=False):
    """
    Main planning function.
    Plans the route globally by fetching candidate stations and solving for the optimal path (Dijkstra/DAG),
    falling back to the greedy algorithm if the DAG solver fails.
    """
    origin_lat, origin_lng = geocode(origin_name)
    dest_lat,   dest_lng   = geocode(destination_name)

    # Apply weather-based range adjustment
    multiplier     = get_weather_range_multiplier(origin_lat, origin_lng)
    # Use 80% of effective range as safety buffer
    effective_range = claimed_range_km * multiplier * 0.80

    # Calculate a dynamic waypoint to guide the route onto the best charging corridor for long trips.
    # This avoids hardcoding checkpoints and dynamically snaps the route to the main national highway networks.
    waypoints = None
    lat_span = abs(origin_lat - dest_lat)
    lng_span = abs(origin_lng - dest_lng)
    
    if lat_span > 1.5 or lng_span > 1.5:
        try:
            min_lat = min(origin_lat, dest_lat) - 0.5
            max_lat = max(origin_lat, dest_lat) + 0.5
            min_lng = min(origin_lng, dest_lng) - 0.5
            max_lng = max(origin_lng, dest_lng) + 0.5
            
            conn = psycopg2.connect(os.getenv("DATABASE_URL"))
            cur = conn.cursor()
            cur.execute("""
                SELECT ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng, reliability_score
                FROM stations
                WHERE location::geometry @ ST_MakeEnvelope(%s, %s, %s, %s, 4326)
            """, (min_lng, min_lat, max_lng, max_lat))
            rows = cur.fetchall()
            cur.close()
            conn.close()
            
            if rows:
                middle_stations = []
                if lat_span >= lng_span:
                    # Primarily North-South
                    mid_min = min(origin_lat, dest_lat) + 0.3 * lat_span
                    mid_max = min(origin_lat, dest_lat) + 0.7 * lat_span
                    middle_stations = [r for r in rows if mid_min <= r[0] <= mid_max]
                else:
                    # Primarily East-West
                    mid_min = min(origin_lng, dest_lng) + 0.3 * lng_span
                    mid_max = min(origin_lng, dest_lng) + 0.7 * lng_span
                    middle_stations = [r for r in rows if mid_min <= r[1] <= mid_max]
                    
                scored_stations = [s for s in middle_stations if s[2] is not None]
                scored_stations.sort(key=lambda x: x[2], reverse=True)
                
                top_n = scored_stations[:5]
                if not top_n:
                    top_n = middle_stations[:5]
                    
                if top_n:
                    avg_lat = sum(s[0] for s in top_n) / len(top_n)
                    avg_lng = sum(s[1] for s in top_n) / len(top_n)
                    waypoints = [[avg_lng, avg_lat]]
        except Exception as e:
            print(f"Failed to calculate dynamic corridor guidance waypoint: {e}")

    # Get the initial route coordinates and distance
    route_coords, total_distance = get_route_geometry_and_distance_km(
        origin_lng, origin_lat, dest_lng, dest_lat, waypoints=waypoints
    )

    try:
        # Sample coordinates to avoid giant SQL strings
        sampled = route_coords[::10]
        if len(sampled) == 0 or route_coords[-1] not in sampled:
            sampled.append(route_coords[-1])
            
        linestring_wkt = "LINESTRING(" + ", ".join(f"{pt[1]} {pt[0]}" for pt in sampled) + ")"
        
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cur  = conn.cursor()
        cur.execute("""
            SELECT
                id, name,
                ST_Y(location::geometry) AS lat,
                ST_X(location::geometry) AS lng,
                reliability_score, address, connector_types
            FROM stations
            WHERE ST_DWithin(
                location,
                ST_SetSRID(ST_GeomFromText(%s), 4326)::geography,
                80000
            )
        """, (linestring_wkt,))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        
        candidates = []
        for r in rows:
            candidates.append({
                "id": r[0],
                "name": r[1],
                "lat": r[2],
                "lng": r[3],
                "reliability_score": r[4],
                "address": r[5],
                "connector_types": r[6],
            })
            
        # Cumulative distances along the route
        route_dists = [0.0]
        for i in range(len(route_coords) - 1):
            p1 = route_coords[i]
            p2 = route_coords[i+1]
            dist = haversine_distance_km(p1[1], p1[0], p2[1], p2[0])
            route_dists.append(route_dists[-1] + dist)
            
        # Sample coordinates for faster projection (every 5th coordinate)
        sampled_coords_for_proj = list(enumerate(route_coords))[::5]
        if len(sampled_coords_for_proj) == 0 or sampled_coords_for_proj[-1][0] != len(route_coords) - 1:
            sampled_coords_for_proj.append((len(route_coords) - 1, route_coords[-1]))

        # Project candidates to the route to find progress indices
        for s in candidates:
            min_dist = float('inf')
            closest_idx = 0
            for idx, coord in sampled_coords_for_proj:
                d = haversine_distance_km(s["lng"], s["lat"], coord[1], coord[0])
                if d < min_dist:
                    min_dist = d
                    closest_idx = idx
            s["route_idx"] = closest_idx
            s["detour_distance_m"] = min_dist * 1000.0
            
        # Filter candidate stations to keep only those within 80 km detour
        candidates = [s for s in candidates if s["detour_distance_m"] <= 80000]
        
        # Sort candidates along the route progress
        candidates.sort(key=lambda x: x["route_idx"])
        
        # Build candidate_list for all responses (filtered to 30km detour)
        candidate_list = []
        for s in candidates:
            if s["detour_distance_m"] <= 30000:
                candidate_list.append({
                    "id": s["id"],
                    "name": s["name"],
                    "lat": s["lat"],
                    "lng": s["lng"],
                    "reliability_score": s["reliability_score"],
                    "address": s["address"],
                    "connector_types": s["connector_types"],
                    "distance_from_route_m": round(s["detour_distance_m"]),
                })
        
        # Custom Stops / Manual Charger Selection logic
        if pick_own_chargers:
            stops = []
            warnings = []
            
            if custom_stops:
                custom_stations = []
                for stop_id in custom_stops:
                    match = next((s for s in candidates if s["id"] == stop_id), None)
                    if match:
                        custom_stations.append(match)
                    else:
                        # Fallback query directly from database
                        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
                        cur = conn.cursor()
                        cur.execute("""
                            SELECT id, name, ST_Y(location::geometry), ST_X(location::geometry), reliability_score, address, connector_types
                            FROM stations WHERE id = %s
                        """, (stop_id,))
                        row = cur.fetchone()
                        cur.close()
                        conn.close()
                        if row:
                            min_dist = float('inf')
                            closest_idx = 0
                            for idx, coord in sampled_coords_for_proj:
                                d = haversine_distance_km(row[3], row[2], coord[1], coord[0])
                                if d < min_dist:
                                    min_dist = d
                                    closest_idx = idx
                            custom_stations.append({
                                "id": row[0],
                                "name": row[1],
                                "lat": row[2],
                                "lng": row[3],
                                "reliability_score": row[4],
                                "address": row[5],
                                "connector_types": row[6],
                                "route_idx": closest_idx,
                                "detour_distance_m": min_dist * 1000.0
                            })
                
                # Sort selected stops geographically along route progress
                custom_stations.sort(key=lambda x: x["route_idx"])
                
                # Fetch route geometry passing through custom stop waypoints
                stop_waypoints = [[s["lng"], s["lat"]] for s in custom_stations]
                route_coords, total_distance = get_route_geometry_and_distance_km(
                    origin_lng, origin_lat, dest_lng, dest_lat, waypoints=stop_waypoints
                )
                
                # Generate leg warnings
                legs = []
                legs.append({"name": origin_name, "lat": origin_lat, "lng": origin_lng})
                for cs in custom_stations:
                    legs.append({"name": cs["name"], "lat": cs["lat"], "lng": cs["lng"]})
                legs.append({"name": destination_name, "lat": dest_lat, "lng": dest_lng})
                
                for i in range(len(legs) - 1):
                    leg_dist = haversine_distance_km(legs[i]["lng"], legs[i]["lat"], legs[i+1]["lng"], legs[i+1]["lat"]) * 1.30
                    if leg_dist > effective_range:
                        warnings.append(
                            f"The segment from '{legs[i]['name']}' to '{legs[i+1]['name']}' is approximately {leg_dist:.1f} km, which exceeds your vehicle's effective range of {effective_range:.1f} km (with buffer)."
                        )
                
                for s in custom_stations:
                    stops.append({
                        "id": s["id"],
                        "name": s["name"],
                        "lat": s["lat"],
                        "lng": s["lng"],
                        "reliability_score": s["reliability_score"],
                        "address": s["address"],
                        "connector_types": s["connector_types"],
                        "distance_from_route_m": round(s["detour_distance_m"]),
                    })
            else:
                if total_distance > effective_range:
                    warnings.append(
                        f"Direct route distance of {total_distance:.1f} km exceeds your vehicle's safe range of {effective_range:.1f} km. Please click on chargers on the map to add stops!"
                    )
            
            return {
                "origin": {"name": origin_name, "lat": origin_lat, "lng": origin_lng},
                "destination": {"name": destination_name, "lat": dest_lat, "lng": dest_lng},
                "total_distance_km": round(total_distance, 1),
                "effective_range_km": round(effective_range, 1),
                "weather_multiplier": round(multiplier, 2),
                "stops": stops,
                "candidate_stations": candidate_list,
                "warnings": warnings,
                "route_geometry": route_coords
            }

        # Build DAG nodes
        nodes = []
        # Node 0: Origin
        nodes.append({
            "id": -1,
            "name": origin_name,
            "lat": origin_lat,
            "lng": origin_lng,
            "reliability_score": None,
            "address": "Origin",
            "connector_types": [],
            "route_idx": 0,
            "detour_distance_m": 0.0
        })
        # Nodes 1..N: Candidates
        nodes.extend(candidates)
        # Node N+1: Destination
        nodes.append({
            "id": -2,
            "name": destination_name,
            "lat": dest_lat,
            "lng": dest_lng,
            "reliability_score": None,
            "address": "Destination",
            "connector_types": [],
            "route_idx": len(route_coords) - 1,
            "detour_distance_m": 0.0
        })
        
        N = len(nodes)
        dist_to = [float('inf')] * N
        parent = [None] * N
        dist_to[0] = 0.0
        
        for i in range(N):
            if dist_to[i] == float('inf'):
                continue
            
            node_i = nodes[i]
            
            for j in range(i + 1, N):
                node_j = nodes[j]
                
                # Highway distance along route
                h_dist = route_dists[node_j["route_idx"]] - route_dists[node_i["route_idx"]]
                if h_dist < 0:
                    continue
                    
                # Leg distance estimation
                if node_i["id"] == -1 and node_j["id"] == -2:
                    leg_dist = h_dist
                else:
                    leg_dist = haversine_distance_km(node_i["lng"], node_i["lat"], node_j["lng"], node_j["lat"]) * 1.30
                
                if leg_dist > effective_range:
                    continue
                    
                # Reliability penalty
                if node_j["id"] == -2:
                    rel_penalty = 0.0
                elif node_j["reliability_score"] is not None:
                    if node_j["reliability_score"] >= 70.0:
                        # High confidence station has no reliability penalty
                        rel_penalty = 0.0
                    else:
                        # Low confidence station gets a massive penalty to discourage stopping there
                        rel_penalty = (100.0 - node_j["reliability_score"]) * 10.0
                else:
                    # Unscored station penalty is also massive
                    rel_penalty = 800.0
                    
                # Detour penalty
                detour_penalty = (node_j["detour_distance_m"] / 1000.0) * 2.5
                
                # Quadratic unused range cost (divided by 10 to keep scale balanced) to maximize range utilization and avoid early charging
                unused_range_cost = ((effective_range - leg_dist) / 10.0) ** 2
                
                # Low flat stop penalty to allow extra stops if it guarantees high-confidence charging
                stop_penalty = 0.0 if node_j["id"] == -2 else 50.0
                
                cost = unused_range_cost + rel_penalty + detour_penalty + stop_penalty
                
                if dist_to[i] + cost < dist_to[j]:
                    dist_to[j] = dist_to[i] + cost
                    parent[j] = i
                    
        if parent[-1] is not None:
            # Reconstruct optimal path
            path = []
            curr = parent[-1]
            while curr > 0:
                path.append(nodes[curr])
                curr = parent[curr]
            path.reverse()
            
            # Format stops sequence
            stops = []
            for stop in path:
                stops.append({
                    "id": stop["id"],
                    "name": stop["name"],
                    "lat": stop["lat"],
                    "lng": stop["lng"],
                    "reliability_score": stop["reliability_score"],
                    "address": stop["address"],
                    "connector_types": stop["connector_types"],
                    "distance_from_route_m": round(stop["detour_distance_m"]),
                })
                
            # Build precise geometries between segments
            full_route_geometry = []
            current_lat, current_lng = origin_lat, origin_lng
            
            for s in stops:
                seg_coords, _ = get_route_geometry_and_distance_km(current_lng, current_lat, s["lng"], s["lat"])
                full_route_geometry.extend(seg_coords)
                current_lat = s["lat"]
                current_lng = s["lng"]
                
            seg_coords, _ = get_route_geometry_and_distance_km(current_lng, current_lat, dest_lng, dest_lat)
            full_route_geometry.extend(seg_coords)
            
            return {
                "origin":             {"name": origin_name, "lat": origin_lat, "lng": origin_lng},
                "destination":        {"name": destination_name, "lat": dest_lat, "lng": dest_lng},
                "total_distance_km":  round(total_distance, 1),
                "effective_range_km": round(effective_range, 1),
                "weather_multiplier": multiplier,
                "stops":              stops,
                "candidate_stations": candidate_list,
                "warnings":           [],
                "route_geometry":     full_route_geometry,
            }
    except Exception as e:
        print(f"Global DAG pathfinder failed: {e}. Falling back to greedy planning.")

    # FALLBACK: Greedy local algorithm
    stops = []
    warnings = []
    full_route_geometry = []

    current_lat, current_lng = origin_lat, origin_lng
    remaining_distance = total_distance
    current_coords = route_coords

    loop_count = 0
    max_stops = 30
    
    while remaining_distance > effective_range and loop_count < max_stops:
        loop_count += 1
        
        cumulative_dist = 0.0
        target_idx = len(current_coords) - 1
        
        for i in range(len(current_coords) - 1):
            p1 = current_coords[i]
            p2 = current_coords[i+1]
            dist = haversine_distance_km(p1[1], p1[0], p2[1], p2[0])
            cumulative_dist += dist
            if cumulative_dist >= effective_range:
                target_idx = i
                break
                
        next_lat, next_lng = current_coords[target_idx]
        
        station = find_best_station_near(next_lat, next_lng, radius_km=45, prefer_scored=True)
        if not station:
            station = find_best_station_near(next_lat, next_lng, radius_km=75, prefer_scored=True)
        if not station:
            station = find_best_station_near(next_lat, next_lng, radius_km=25, prefer_scored=False)
        if not station:
            station = find_best_station_near(next_lat, next_lng, radius_km=45, prefer_scored=False)
        if not station:
            station = find_best_station_near(next_lat, next_lng, radius_km=75, prefer_scored=False)
        if not station:
            station = find_best_station_near(next_lat, next_lng, radius_km=100, prefer_scored=False)
            
        if not station:
            warnings.append(
                f"No station found near ({next_lat:.4f}, {next_lng:.4f}) along the highway. "
                f"Segment may not be feasible."
            )
            break
            
        stops.append(station)
        full_route_geometry.extend(current_coords[:target_idx+1])
        
        current_lat = station["lat"]
        current_lng = station["lng"]
        current_coords, remaining_distance = get_route_geometry_and_distance_km(
            current_lng, current_lat, dest_lng, dest_lat
        )
        
    full_route_geometry.extend(current_coords)

    if not full_route_geometry:
        full_route_geometry = route_coords

    return {
        "origin":             {"name": origin_name, "lat": origin_lat, "lng": origin_lng},
        "destination":        {"name": destination_name, "lat": dest_lat, "lng": dest_lng},
        "total_distance_km":  round(total_distance, 1),
        "effective_range_km": round(effective_range, 1),
        "weather_multiplier": multiplier,
        "stops":              stops,
        "candidate_stations": candidate_list,
        "warnings":           warnings,
        "route_geometry":     full_route_geometry,
    }