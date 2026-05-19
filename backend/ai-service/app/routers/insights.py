import structlog
from fastapi import APIRouter, Request, Query, HTTPException
from app.schemas.insight import InsightsResponse, DashboardSummaryResponse
from app.services.insight_service import insight_service

logger = structlog.get_logger(__name__)
router = APIRouter()

@router.get("/insights", response_model=InsightsResponse)
async def get_business_insights(request: Request, period: str = Query("this_month")):
    tenant_id = request.state.tenant_id
    try:
        res = await insight_service.get_insights(tenant_id, period)
        return {"success": True, "data": res}
    except Exception as e:
        logger.error("Insights API failed", tenant_id=tenant_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to load business insights")

@router.get("/dashboard-summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary_header(request: Request):
    tenant_id = request.state.tenant_id
    try:
        res = await insight_service.get_dashboard_summary(tenant_id)
        return {"success": True, "data": res}
    except Exception as e:
        logger.error("Dashboard Summary API failed", tenant_id=tenant_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to load dashboard summary")
