"""ArjunaVision — FastAPI Backend"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import engine, Base
from app.api.auth import router as auth_router
from app.api.emergency import router as emergency_router
from app.api.location import router as location_router
from app.api.health import router as health_router
from app.api.simulation import router as simulation_router
from app.api.routers import (
    users_router,
    contacts_router,
    risk_router,
    notifications_router,
    privacy_router,
    routes_router,
    facilities_router,
    admin_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="ArjunaVision API",
    description="AI-Powered Personal Safety & Emergency Response Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(users_router, prefix="/users", tags=["Users"])
app.include_router(contacts_router, prefix="/contacts", tags=["Emergency Contacts"])
app.include_router(emergency_router, prefix="/emergency", tags=["Emergency"])
app.include_router(location_router, prefix="/location", tags=["Location"])
app.include_router(health_router, prefix="/health", tags=["Health"])
app.include_router(risk_router, prefix="/risk", tags=["Risk Engine"])
app.include_router(routes_router, prefix="/routes", tags=["Safe Routes"])
app.include_router(facilities_router, prefix="/facilities", tags=["Facilities"])
app.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
app.include_router(privacy_router, prefix="/privacy", tags=["Privacy"])
app.include_router(simulation_router, prefix="/simulation", tags=["Simulation"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])


@app.get("/")
async def root():
    return {"message": "ArjunaVision API v1.0.0", "status": "online", "docs": "/docs"}


@app.get("/health-check")
async def health_check():
    return {"status": "healthy", "timestamp": __import__("datetime").datetime.utcnow().isoformat()}
