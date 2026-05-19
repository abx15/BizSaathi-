import structlog
from fastapi import APIRouter, Request, HTTPException
from app.schemas.report import ReportRequest, ReportResponse
from app.services.report_service import report_service

logger = structlog.get_logger(__name__)
router = APIRouter()

@router.post("/reports/generate", response_model=ReportResponse)
async def generate_business_report(request: Request, body: ReportRequest):
    tenant_id = request.state.tenant_id
    try:
        res = await report_service.generate_report(
            tenant_id=tenant_id,
            report_type=body.reportType,
            period=body.period
        )
        return {"success": True, "data": res}
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        logger.error("Reports API failed", tenant_id=tenant_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to generate report")
