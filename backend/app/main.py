from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import routes

app = FastAPI(title="EV Route Planner API")

import os

# Secure CORS: Allow specific origins in production, fallback to development defaults
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_env:
    origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
else:
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://e-vrify.vercel.app",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router)

@app.get("/health")
def health():
    return {"status": "ok"}
