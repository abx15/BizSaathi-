import asyncio
import io
import structlog
from typing import Dict, Any, Optional
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
from app.llm import llm_service

logger = structlog.get_logger(__name__)

class OCRService:
    def preprocess_image(self, image_bytes: bytes) -> Image.Image:
        """
        Pillow image preprocessing:
        1. Open image
        2. Convert to Grayscale
        3. Denoise with Median Filter
        4. Enhance contrast
        """
        img = Image.open(io.BytesIO(image_bytes))
        
        # 1. Convert to Grayscale
        img = img.convert('L')
        
        # 2. Denoise with a mild filter
        img = img.filter(ImageFilter.MedianFilter(size=3))
        
        # 3. Enhance Contrast
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(2.0)
        
        return img

    def run_tesseract(self, img: Image.Image, lang: str = "eng+hin") -> str:
        """Run pytesseract OCR extraction on preprocessed image."""
        try:
            return pytesseract.image_to_string(img, lang=lang)
        except Exception as e:
            logger.error("Tesseract run error", error=str(e))
            # Fallback to English only if Hindi package is missing
            return pytesseract.image_to_string(img, lang="eng")

    async def process_receipt(self, file_bytes: bytes, file_name: str) -> Dict[str, Any]:
        """OCR Receipt parsing flow running CPU bound actions in threadpool."""
        logger.info("Processing receipt OCR", filename=file_name)
        
        try:
            # Run CPU-bound preprocessing in threadpool
            img = await asyncio.to_thread(self.preprocess_image, file_bytes)
            
            # Run CPU-bound Tesseract extraction in threadpool
            ocr_text = await asyncio.to_thread(self.run_tesseract, img)
            
            if not ocr_text.strip():
                logger.warn("OCR extracted text is empty", filename=file_name)
                return {"error": "OCR text extraction failed: no text detected"}

            # Send extracted text to Groq LLM to refine and output JSON
            prompt = (
                f"Analyze this raw OCR text extracted from a receipt. "
                f"Extract receipt details like vendor name, purchase date, taxable amount, GST amount, item breakdown, and payment method.\n\n"
                f"Raw OCR Text:\n{ocr_text}\n\n"
                f"You must return ONLY a valid JSON object matching the JSON schema below. "
                f"Ensure data types are correct. If date is not extractable, set to today's date in YYYY-MM-DD format.\n"
                f"If paymentMethod is not explicitly written, default to CASH.\n"
                f"Items array should contain: name, qty, rate, amount."
            )

            schema = {
                "type": "object",
                "properties": {
                    "vendor": {"type": "string"},
                    "date": {"type": "string"},
                    "amount": {"type": "number"},
                    "gstAmount": {"type": "number"},
                    "totalAmount": {"type": "number"},
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "qty": {"type": "number"},
                                "rate": {"type": "number"},
                                "amount": {"type": "number"}
                            },
                            "required": ["name", "amount"]
                        }
                    },
                    "paymentMethod": {"type": "string", "enum": ["CASH", "UPI", "BANK_TRANSFER", "CARD", "CHEQUE", "OTHER"]},
                    "confidence": {"type": "number"}
                },
                "required": ["vendor", "date", "amount", "totalAmount", "paymentMethod"]
            }

            extracted_data = await llm_service.structured_output(prompt, schema)
            return extracted_data
            
        except Exception as e:
            logger.error("Failed processing receipt OCR", filename=file_name, error=str(e))
            return {"error": f"Failed to process receipt: {str(e)}"}

    async def process_invoice(self, file_bytes: bytes, file_name: str) -> Dict[str, Any]:
        """OCR Invoice parsing flow running CPU bound actions in threadpool."""
        logger.info("Processing invoice OCR", filename=file_name)
        
        try:
            # Preprocess
            img = await asyncio.to_thread(self.preprocess_image, file_bytes)
            
            # Extract
            ocr_text = await asyncio.to_thread(self.run_tesseract, img)
            
            if not ocr_text.strip():
                return {"error": "OCR text extraction failed: no text detected"}

            # Send to Groq for invoice details
            prompt = (
                f"Analyze this raw OCR text extracted from an invoice image. "
                f"Extract invoice details like vendor name, customer name, invoice number, invoice date, total amount, GST amount, item list, and payment terms.\n\n"
                f"Raw OCR Text:\n{ocr_text}\n\n"
                f"You must return ONLY a valid JSON object matching the JSON schema below. "
                f"If date is not extractable, set to today's date in YYYY-MM-DD. "
                f"Default paymentMethod to BANK_TRANSFER if not specified."
            )

            schema = {
                "type": "object",
                "properties": {
                    "vendor": {"type": "string"},
                    "invoiceNumber": {"type": "string"},
                    "customer": {"type": "string"},
                    "date": {"type": "string"},
                    "amount": {"type": "number"},
                    "gstAmount": {"type": "number"},
                    "totalAmount": {"type": "number"},
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "qty": {"type": "number"},
                                "rate": {"type": "number"},
                                "amount": {"type": "number"}
                            },
                            "required": ["name", "amount"]
                        }
                    },
                    "paymentMethod": {"type": "string", "enum": ["CASH", "UPI", "BANK_TRANSFER", "CARD", "CHEQUE", "OTHER"]},
                    "confidence": {"type": "number"}
                },
                "required": ["vendor", "invoiceNumber", "date", "totalAmount", "paymentMethod"]
            }

            extracted_data = await llm_service.structured_output(prompt, schema)
            return extracted_data
            
        except Exception as e:
            logger.error("Failed processing invoice OCR", filename=file_name, error=str(e))
            return {"error": f"Failed to process invoice: {str(e)}"}

ocr_service = OCRService()
