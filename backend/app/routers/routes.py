from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os, json, hashlib, psycopg2
from app.routing.planner import plan_route

router = APIRouter(prefix="/api", tags=["routing"])

redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
redis_token = os.getenv("REDIS_TOKEN", "")

if redis_url.startswith("http://") or redis_url.startswith("https://"):
    from upstash_redis import Redis
    redis = Redis(url=redis_url, token=redis_token)
else:
    import redis as standard_redis
    redis = standard_redis.from_url(redis_url, decode_responses=True)

class RouteRequest(BaseModel):
    vehicle_name:     str
    claimed_range_km: int
    origin:           str
    destination:      str
    pick_own_chargers: bool = False
    custom_stops:     list[int] = None

@router.post("/route")
def get_route(req: RouteRequest):
    # Include custom stops and pick_own_chargers in the cache key to avoid cache collisions
    stops_repr = sorted(req.custom_stops) if req.custom_stops else []
    cache_key = "evrify:v5:" + hashlib.md5(
        f"{req.origin}|{req.destination}|{req.claimed_range_km}|{req.pick_own_chargers}|{stops_repr}".encode()
    ).hexdigest()

    cached = redis.get(cache_key)
    if cached:
        return json.loads(cached)

    try:
        result = plan_route(
            req.origin, 
            req.destination, 
            req.claimed_range_km, 
            custom_stops=req.custom_stops, 
            pick_own_chargers=req.pick_own_chargers
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Only cache if route was fully successful with no warnings
    if not result.get("warnings"):
        redis.setex(cache_key, 3600, json.dumps(result))  # cache 1 hour
    return result

@router.get("/stations/{station_id}")
def get_station(station_id: int):
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur  = conn.cursor()
    cur.execute("""
        SELECT
            s.id, s.name, s.address, s.reliability_score,
            s.connector_types, s.network_operator,
            ST_Y(s.location::geometry) AS lat,
            ST_X(s.location::geometry) AS lng,
            json_agg(
                json_build_object(
                    'text',      r.review_text,
                    'sentiment', r.sentiment,
                    'issues',    r.issues,
                    'source',    r.source,
                    'date',      r.review_date
                )
            ) FILTER (WHERE r.id IS NOT NULL) AS reviews
        FROM stations s
        LEFT JOIN reviews r ON r.station_id = s.id OR (r.station_id IS NULL AND LOWER(r.network_operator) = LOWER(s.network_operator))
        WHERE s.id = %s
        GROUP BY s.id
    """, (station_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Station not found")

    return {
        "id":                row[0],
        "name":              row[1],
        "address":           row[2],
        "reliability_score": row[3],
        "connector_types":   row[4],
        "network_operator":  row[5],
        "lat":               row[6],
        "lng":               row[7],
        "reviews":           row[8] or [],
    }
