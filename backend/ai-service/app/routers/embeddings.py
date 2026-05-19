import uuid
import structlog
from fastapi import APIRouter, Request, BackgroundTasks, Header, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.config import settings
from app.redis_client import redis_client
from app.services.rag_service import rag_service

logger = structlog.get_logger(__name__)
router = APIRouter()

class ReindexRequest(BaseModel):
    tenantId: str
    entityType: str = "all"

class SingleEntityRequest(BaseModel):
    tenantId: str
    entityType: str
    entityId: str

def verify_internal_key(x_internal_key: Optional[str] = Header(None)):
    if not x_internal_key or x_internal_key != settings.INTERNAL_API_KEY:
        logger.warn("Unauthorized access attempt to internal embedding endpoints")
        raise HTTPException(status_code=401, detail="Unauthorized internal key")

async def run_full_indexing_task(job_id: str, tenant_id: str):
    status_key = f"ai:index:status:{job_id}"
    try:
        await redis_client.set(status_key, "IN_PROGRESS", ex=3600)
        success = await rag_service.index_tenant_data(tenant_id)
        if success:
            await redis_client.set(status_key, "COMPLETED", ex=3600)
        else:
            await redis_client.set(status_key, "FAILED", ex=3600)
    except Exception as e:
        logger.error("Reindexing background task failed", tenant_id=tenant_id, error=str(e))
        await redis_client.set(status_key, "FAILED", ex=3600)

@router.post("/index")
async def trigger_reindexing(
    request: Request,
    body: ReindexRequest,
    background_tasks: BackgroundTasks,
    x_internal_key: Optional[str] = Header(None)
):
    verify_internal_key(x_internal_key)
    
    job_id = str(uuid.uuid4())
    logger.info("Triggered full re-indexing", tenant_id=body.tenantId, job_id=job_id)
    
    # 1. Track status in Redis
    await redis_client.set(f"ai:index:status:{job_id}", "QUEUED", ex=3600)
    
    # 2. Run background task
    background_tasks.add_task(run_full_indexing_task, job_id, body.tenantId)
    
    return {"message": "Indexing started", "jobId": job_id}

@router.get("/index/status/{job_id}")
async def get_index_status(request: Request, job_id: str):
    # This can be read by external systems or frontend client
    status = await redis_client.get(f"ai:index:status:{job_id}")
    if not status:
        raise HTTPException(status_code=404, detail="Job ID not found or expired")
    return {"success": True, "jobId": job_id, "status": status}

@router.post("/index/entity")
async def index_single_entity(
    request: Request,
    body: SingleEntityRequest,
    background_tasks: BackgroundTasks,
    x_internal_key: Optional[str] = Header(None)
):
    verify_internal_key(x_internal_key)
    
    logger.info("Delta update triggered for single entity", tenant_id=body.tenantId, entity=body.entityType, entity_id=body.entityId)
    
    # 1. Delta re-index (for the purpose of read-only prompt matching, we can trigger background update or update index)
    # To keep simple and robust, we run background index for the tenant
    job_id = str(uuid.uuid4())
    background_tasks.add_task(run_full_indexing_task, job_id, body.tenantId)
    
    # 2. CACHE INVALIDATION: delete insights and dashboard cache for the tenant
    insights_pattern = f"ai:insights:{body.tenantId}:*"
    dashboard_key = f"ai:dashboard:{body.tenantId}"
    
    await redis_client.delete_pattern(insights_pattern)
    await redis_client.delete(dashboard_key)
    
    return {"success": True, "message": "Delta update queued, related caches invalidated"}
