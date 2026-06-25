from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
from upstash_redis import Redis
import os, json, hashlib
# pyrefly: ignore [missing-import]
from app.routing.planner import plan_route

router = APIRouter(prefix="/api", tags=["routing"])
redis = Redis(url=os.getenv("REDIS_URL"), token=os.getenv("REDIS_TOKEN"))

class RouteRequest(BaseModel):
    vehicle_name: str
    claimed_range_km: int
    origin: str
    destination: str

@router.post("/route")
def get_route(req: RouteRequest):
    # Cache key based on inputs
    cache_key = hashlib.md5(
        f"{req.origin}|{req.destination}|{req.claimed_range_km}".encode()
    ).hexdigest()

    cached = redis.get(cache_key)
    if cached:
        return json.loads(cached)

    try:
        result = plan_route(req.origin, req.destination, req.claimed_range_km)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    redis.setex(cache_key, 3600, json.dumps(result))   # cache for 1 hour
    return result

@router.get("/stations/{station_id}")
def get_station(station_id: int):
    import psycopg2
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()
    cur.execute("""
        SELECT s.id, s.name, s.address, s.reliability_score, s.connector_types,
               ST_Y(s.location::geometry) AS lat, ST_X(s.location::geometry) AS lng,
               json_agg(json_build_object(
                   'text', r.review_text,
                   'sentiment', r.sentiment,
                   'date', r.review_date
               )) FILTER (WHERE r.id IS NOT NULL) AS reviews
        FROM stations s
        LEFT JOIN reviews r ON r.station_id = s.id
        WHERE s.id = %s
        GROUP BY s.id
    """, (station_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Station not found")
    return {
        "id": row[0], "name": row[1], "address": row[2],
        "reliability_score": row[3], "connector_types": row[4],
        "lat": row[5], "lng": row[6], "reviews": row[7] or []
    }
