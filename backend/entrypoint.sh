#!/bin/sh
echo "Waiting for database to be ready..."
python -c "
import time, psycopg2, os
while True:
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        conn.close()
        break
    except Exception as e:
        print('DB not ready, retrying in 2 seconds...')
        time.sleep(2)
"
echo "Database is ready. Running seed script..."
python seed_stations.py
echo "Starting backend server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
