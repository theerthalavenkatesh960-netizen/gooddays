from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.routes import router
from app.db.connection import init_db, close_db
from config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting GoodDays AI Service — provider: {settings.AI_PROVIDER}")
    await init_db()
    yield
    await close_db()
    logger.info("GoodDays AI Service shut down")


app = FastAPI(
    title="GoodDays AI Health Advisor",
    description="AI-powered health analysis service — reads from GoodDays PostgreSQL DB",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "provider": settings.AI_PROVIDER}
