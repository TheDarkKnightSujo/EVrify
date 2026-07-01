CREATE TABLE stations (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    location        GEOGRAPHY(POINT, 4326) NOT NULL,
    address         TEXT,
    connector_types TEXT[],
    total_stalls    INTEGER,
    source          TEXT,          -- 'ocm', 'nrel', 'plugshare'
    source_url      TEXT,
    reliability_score FLOAT DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_stations_location ON stations USING GIST(location);

CREATE TABLE reviews (
    id              SERIAL PRIMARY KEY,
    station_id      INTEGER REFERENCES stations(id) ON DELETE CASCADE,
    review_text     TEXT,
    rating          FLOAT,
    review_date     DATE,
    sentiment       TEXT,          -- 'positive', 'neutral', 'negative'
    issues          TEXT[],        -- ['broken', 'slow', 'wait', 'great']
    confidence      FLOAT,
    source          TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE routes (
    id              SERIAL PRIMARY KEY,
    origin_lat      FLOAT,
    origin_lng      FLOAT,
    dest_lat        FLOAT,
    dest_lng        FLOAT,
    vehicle_name    TEXT,
    claimed_range   INTEGER,
    waypoints       JSONB,
    total_distance  FLOAT,
    created_at      TIMESTAMP DEFAULT NOW()
);
