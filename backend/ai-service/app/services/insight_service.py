import datetime
import json
import structlog
from typing import Dict, Any, List
from app.redis_client import redis_client
from app.services.context_builder import context_builder
from app.llm import llm_service

logger = structlog.get_logger(__name__)

class InsightService:
    async def get_insights(self, tenant_id: str, period: str = "this_month") -> Dict[str, Any]:
        cache_key = f"ai:insights:{tenant_id}:{period}"
        
        # 1. Try Cache
        cached_val = await redis_client.get(cache_key)
        if cached_val:
            try:
                logger.info("Cache hit for business insights", tenant_id=tenant_id)
                return json.loads(cached_val)
            except Exception:
                pass

        # 2. Fetch Fresh Context
        financials = await context_builder.get_financial_context(tenant_id, period)
        if not financials:
            return {
                "generatedAt": datetime.datetime.now().isoformat(),
                "period": period,
                "insights": []
            }

        # 3. Rule-based checks (dynamic heuristics)
        rule_insights = []
        
        # Heuristic 1: Overdue Invoices
        overdue_amt = financials.get("overdue", 0.0)
        overdue_count = financials.get("overdue_count", 0)
        if overdue_count > 0:
            rule_insights.append({
                "type": "warning",
                "title": f"{overdue_count} Invoices Overdue",
                "body": f"Aapke {overdue_count} invoices overdue hain jinka total amount ₹{overdue_amt:,.2f} hai. Inpe immediate follow-up karein.",
                "actionLabel": "Reminders bhejo",
                "actionUrl": "/invoices?status=OVERDUE"
            })

        # Heuristic 2: Expenses too high
        total_invoiced = financials.get("total_invoiced", 0.0)
        total_expenses = financials.get("total_expenses", 0.0)
        if total_invoiced > 0 and (total_expenses / total_invoiced) > 0.7:
            rule_insights.append({
                "type": "warning",
                "title": "Kharcha Margin Se Zyada Hai",
                "body": f"Is mahine aapka kharcha aapke revenue ka {int((total_expenses/total_invoiced)*100)}% hai. Kuch categories mein savings identify karein.",
                "actionLabel": "Expense details dekho",
                "actionUrl": "/expenses"
            })

        # Heuristic 3: High Margin
        margin = financials.get("profit_margin", 0.0)
        if margin > 25.0:
            rule_insights.append({
                "type": "positive",
                "title": "Healthy Profit Margin!",
                "body": f"Great job! Aapka net profit margin {margin}% hai jo ki extremely healthy hai. Is momentum ko maintain karein.",
                "actionLabel": None,
                "actionUrl": None
            })

        # 4. Invoke LLM for narrative insights & additional tips
        prompt = (
            f"Based on the following financial summaries for a small business:\n"
            f"- Total Invoiced: ₹{financials['total_invoiced']:,.2f}\n"
            f"- Total Expenses: ₹{financials['total_expenses']:,.2f}\n"
            f"- Net Profit: ₹{financials['net_profit']:,.2f}\n"
            f"- Top Customers: {financials['top_customers']}\n"
            f"- Expense breakdown: {financials['category_breakdown']}\n\n"
            f"Generate exactly 2 narrative business insights. One should be a 'positive' insight if profit is good, or a practical 'tip' if profit is low. "
            f"The second should be a specific operational 'tip' about follow-ups or categories. "
            f"The body MUST be in conversational Hindi/Hinglish as used by Indian merchants. "
            f"Respond ONLY with a valid JSON matching this schema:\n"
            f"{{\n"
            f"  \"insights\": [\n"
            f"    {{\n"
            f"      \"type\": \"warning\" | \"positive\" | \"tip\",\n"
            f"      \"title\": \"Short headline (5-7 words)\",\n"
            f"      \"body\": \"Conversational Hinglish narrative\",\n"
            f"      \"actionLabel\": \"Link label or null\",\n"
            f"      \"actionUrl\": \"System route url or null\"\n"
            f"    }}\n"
            f"  ]\n"
            f"}}"
        )
        
        schema = {
            "type": "object",
            "properties": {
                "insights": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {"type": "string", "enum": ["warning", "positive", "tip"]},
                            "title": {"type": "string"},
                            "body": {"type": "string"},
                            "actionLabel": {"type": "string", "nullable": True},
                            "actionUrl": {"type": "string", "nullable": True}
                        },
                        "required": ["type", "title", "body"]
                    }
                }
            },
            "required": ["insights"]
        }

        ai_res = await llm_service.structured_output(prompt, schema)
        ai_insights = ai_res.get("insights", [])

        # Combine rules and LLM insights
        combined_insights = rule_insights + ai_insights
        
        # If still empty, add default tip
        if not combined_insights:
            combined_insights.append({
                "type": "tip",
                "title": "Welcome to AI Insights",
                "body": "Aapke business performance insights yahan automatic analyze hote rahenge. Data populate karte rahein!",
                "actionLabel": "Invoice banao",
                "actionUrl": "/invoices/new"
            })

        response_data = {
            "generatedAt": datetime.datetime.now().isoformat(),
            "period": period,
            "insights": combined_insights
        }

        # 5. Cache for 1 hour
        await redis_client.set(cache_key, json.dumps(response_data), ex=3600)
        return response_data

    async def get_dashboard_summary(self, tenant_id: str) -> Dict[str, Any]:
        cache_key = f"ai:dashboard:{tenant_id}"
        
        # Try Cache
        cached_val = await redis_client.get(cache_key)
        if cached_val:
            try:
                logger.info("Cache hit for dashboard summary", tenant_id=tenant_id)
                return json.loads(cached_val)
            except Exception:
                pass

        # Fetch context
        financials = await context_builder.get_financial_context(tenant_id, "this_month")
        if not financials:
            return {
                "summary": "Data insufficient. Pehla invoice add karke business analyze karein!",
                "mood": "neutral"
            }

        prompt = (
            f"Write a short, engaging 3-line business status summary for a dashboard header. "
            f"Based on this month's stats:\n"
            f"- Total Invoiced: ₹{financials['total_invoiced']:,.2f}\n"
            f"- Received: ₹{financials['received']:,.2f}\n"
            f"- Total Expenses: ₹{financials['total_expenses']:,.2f}\n"
            f"- Overdue: ₹{financials['overdue']:,.2f} ({financials['overdue_count']} overdue invoices)\n\n"
            f"The summary must be exactly 3 sentences in friendly Hinglish, focused on current week's flow and what to prioritize. "
            f"Also evaluate the mood of the business: 'positive' (low overdue, high profit), 'warning' (high overdue or expenses), 'neutral' otherwise. "
            f"Respond ONLY with a valid JSON matching this schema:\n"
            f"{{\n"
            f"  \"summary\": \"3-sentence narrative Hinglish\",\n"
            f"  \"mood\": \"positive\" | \"neutral\" | \"warning\"\n"
            f"}}"
        )
        
        schema = {
            "type": "object",
            "properties": {
                "summary": {"type": "string"},
                "mood": {"type": "string", "enum": ["positive", "neutral", "warning"]}
            },
            "required": ["summary", "mood"]
        }

        response_data = await llm_service.structured_output(prompt, schema)
        if "summary" not in response_data:
            # Safe Fallback
            response_data = {
                "summary": f"Is mahine ₹{financials['total_invoiced']:,.2f} ki invoices bani, ₹{financials['received']:,.2f} received. Kharcha ₹{financials['total_expenses']:,.2f} raha hai.",
                "mood": "neutral"
            }

        # Cache for 30 min
        await redis_client.set(cache_key, json.dumps(response_data), ex=1800)
        return response_data

insight_service = InsightService()
