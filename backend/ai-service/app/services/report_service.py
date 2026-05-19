import datetime
import json
import structlog
from typing import Dict, Any
from app.redis_client import redis_client
from app.services.context_builder import context_builder
from app.llm import llm_service

logger = structlog.get_logger(__name__)

REPORT_TYPES = {
    "monthly_summary": "Monthly P&L, revenue, expenses, top customers",
    "expense_analysis": "Expense breakdown, trends, anomalies",
    "customer_analysis": "Customer rankings, payment behavior, churn risk",
    "invoice_aging": "Overdue analysis, payment patterns",
    "staff_summary": "Attendance, payroll cost, department breakdown",
    "cash_flow": "Inflow vs outflow, projections"
}

class ReportService:
    async def generate_report(self, tenant_id: str, report_type: str, period: str) -> Dict[str, Any]:
        if report_type not in REPORT_TYPES:
            raise ValueError(f"Invalid report type. Supported: {list(REPORT_TYPES.keys())}")

        cache_key = f"ai:report:{tenant_id}:{report_type}:{period}"
        
        # 1. Try Cache
        cached_val = await redis_client.get(cache_key)
        if cached_val:
            try:
                logger.info("Cache hit for report generation", tenant_id=tenant_id, report_type=report_type)
                return json.loads(cached_val)
            except Exception:
                pass

        # 2. Gather postgres context
        financials = await context_builder.get_financial_context(tenant_id, period)
        staff = await context_builder.get_staff_context(tenant_id)
        crm = await context_builder.get_crm_context(tenant_id)

        # 3. Construct LLM prompt based on report type
        prompt = (
            f"Generate a highly detailed, professional '{report_type}' business report for period '{period}'.\n"
            f"Business context details:\n"
            f"- Financials: {json.dumps(financials)}\n"
            f"- Staff: {json.dumps(staff)}\n"
            f"- CRM: {json.dumps(crm)}\n\n"
            f"You must return a structured JSON report matching the specified schema exactly. "
            f"Write the title in English, but write the 'summary' and 'aiNarrative' fields in conversational, professional Hinglish. "
            f"Make sure to design standard labels and data arrays to be plotted as charts. "
            f"Respond ONLY with a valid JSON matching this schema:\n"
            f"{{\n"
            f"  \"reportType\": \"{report_type}\",\n"
            f"  \"period\": \"{period}\",\n"
            f"  \"title\": \"Report Title\",\n"
            f"  \"sections\": [\n"
            f"    {{\n"
            f"      \"title\": \"Section Heading\",\n"
            f"      \"summary\": \"Detailed section review in Hinglish\",\n"
            f"      \"data\": {{ \"metric1\": 120, \"metric2\": 300 }},\n"
            f"      \"chart\": {{\n"
            f"        \"type\": \"bar\" | \"line\" | \"pie\",\n"
            f"        \"labels\": [\"label1\", \"label2\"],\n"
            f"        \"values\": [120, 300]\n"
            f"      }}\n"
            f"    }}\n"
            f"  ],\n"
            f"  \"aiNarrative\": \"Multi-line strategic business analysis in Hinglish\",\n"
            f"  \"recommendations\": [\n"
            f"    \"Actionable instruction 1\",\n"
            f"    \"Actionable instruction 2\"\n"
            f"  ]\n"
            f"}}"
        )

        schema = {
            "type": "object",
            "properties": {
                "reportType": {"type": "string"},
                "period": {"type": "string"},
                "title": {"type": "string"},
                "sections": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "summary": {"type": "string"},
                            "data": {"type": "object"},
                            "chart": {
                                "type": "object",
                                "properties": {
                                    "type": {"type": "string", "enum": ["bar", "line", "pie"]},
                                    "labels": {"type": "array", "items": {"type": "string"}},
                                    "values": {"type": "array", "items": {"type": "number"}}
                                },
                                "required": ["type", "labels", "values"]
                            }
                        },
                        "required": ["title", "summary"]
                    }
                },
                "aiNarrative": {"type": "string"},
                "recommendations": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["reportType", "period", "title", "sections", "aiNarrative", "recommendations"]
        }

        # 4. Invoke LLM
        response_data = await llm_service.structured_output(prompt, schema)
        
        # Safe validations
        if "title" not in response_data:
            # Fallback structure
            response_data = {
                "reportType": report_type,
                "period": period,
                "title": f"Business Analysis Report ({period})",
                "sections": [
                    {
                        "title": "Revenue vs Expense Summary",
                        "summary": "Revenue aur expenses ki dynamic range values is period mein analyze hui hain.",
                        "data": {"total_invoiced": financials.get("total_invoiced", 0), "total_expenses": financials.get("total_expenses", 0)},
                        "chart": {
                            "type": "bar",
                            "labels": ["Total Invoiced", "Total Expenses"],
                            "values": [financials.get("total_invoiced", 0), financials.get("total_expenses", 0)]
                        }
                    }
                ],
                "aiNarrative": "Aapke business performance reports successfully fetch kiye gaye hain. Net profit parameters normal range mein hain.",
                "recommendations": [
                    "Expenses control mein rakhein aur overdue follow-ups regular schedule karein.",
                    "Active customer interaction badhayein lead generation improve karne ke liye."
                ]
            }

        # 5. Cache for 1 hour
        await redis_client.set(cache_key, json.dumps(response_data), ex=3600)
        return response_data

report_service = ReportService()
