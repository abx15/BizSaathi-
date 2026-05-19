import structlog
from fastapi import APIRouter, Request, UploadFile, File, HTTPException
from app.services.ocr_service import ocr_service

logger = structlog.get_logger(__name__)
router = APIRouter()

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_MIMETYPES = ["image/jpeg", "image/png", "image/webp"]

def validate_image_file(file: UploadFile):
    if file.content_type not in ALLOWED_MIMETYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Only JPG, PNG, and WEBP images are allowed."
        )

@router.post("/ocr/receipt")
async def ocr_receipt(request: Request, file: UploadFile = File(...)):
    validate_image_file(file)
    
    # Check size
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File is too large. Maximum size is 5MB.")
        
    try:
        res = await ocr_service.process_receipt(file_bytes, file.filename)
        if "error" in res:
            raise HTTPException(status_code=422, detail=res["error"])
        return {"success": True, "data": res}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Receipt OCR API crashed", filename=file.filename, error=str(e))
        raise HTTPException(status_code=500, detail="Receipt processing failed")

@router.post("/ocr/invoice")
async def ocr_invoice(request: Request, file: UploadFile = File(...)):
    validate_image_file(file)
    
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File is too large. Maximum size is 5MB.")

    try:
        res = await ocr_service.process_invoice(file_bytes, file.filename)
        if "error" in res:
            raise HTTPException(status_code=422, detail=res["error"])
        return {"success": True, "data": res}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Invoice OCR API crashed", filename=file.filename, error=str(e))
        raise HTTPException(status_code=500, detail="Invoice processing failed")
        
