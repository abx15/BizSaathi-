import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import structlog
from app.config import settings
from app.database import db
from app.redis_client import redis_client
from app.vector_store import vector_store
from app.services.embedding_service import embedding_service
from app.middleware.auth import JWTAuthMiddleware
from app.middleware.logging import LoggingMiddleware, configure_structlog

# 1. Configure structlog
configure_structlog(settings.LOG_LEVEL)
logger = structlog.get_logger(__name__)

# 2. Setup FastAPI lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Initializing BizSaathi AI service components...")
    
    # - Connect Postgres
    await db.connect()
    
    # - Connect Redis
    await redis_client.connect()
    
    # - Connect Qdrant and initialize collections
    await vector_store.connect()
    
    # - Load SentenceTransformer model into memory
    embedding_service.load_model()
    
    logger.info("BizSaathi AI service components initialized successfully!")
    yield
    
    # Shutdown actions
    logger.info("Stopping BizSaathi AI service components...")
    await db.disconnect()
    await redis_client.disconnect()
    logger.info("BizSaathi AI service components stopped.")

# 3. Create FastAPI app
app = FastAPI(
    title="BizSaathi AI Service",
    description="Python FastAPI + RAG Standalone Microservice",
    version="1.0.0",
    lifespan=lifespan
)

# 4. Add Global Middleware
# - CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # adjust to specific domain settings if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# - Structured Logging & Trace IDs
app.add_middleware(LoggingMiddleware)

# - JWT Auth Middleware (Applied to all non-public routes)
app.add_middleware(JWTAuthMiddleware)

# 5. Add health check endpoints
@app.get("/health")
async def health_check():
    return {"success": True, "status": "healthy", "service": "ai-service"}

@app.get("/v1/ai/health")
async def ai_health_check():
    return {"success": True, "status": "healthy", "service": "ai-service"}

# 6. Include API Routers with prefix
from app.routers import query, insights, reports, ocr, embeddings

app.include_router(query.router, prefix="/v1/ai", tags=["AI Query"])
app.include_router(insights.router, prefix="/v1/ai", tags=["AI Insights"])
app.include_router(reports.router, prefix="/v1/ai", tags=["AI Reports"])
app.include_router(ocr.router, prefix="/v1/ai", tags=["OCR Ingestion"])
app.include_router(embeddings.router, prefix="/v1/ai", tags=["Vector Embeddings Indexing"])

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        log_config=None  # Use custom structlog logging configuration
    )
