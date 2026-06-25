from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import routes

app = FastAPI(title="EV Route Planner API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router)

@app.get("/health")
def health():
    return {"status": "ok"}
