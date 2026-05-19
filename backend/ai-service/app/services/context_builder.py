import datetime
from decimal import Decimal
import structlog
from typing import Dict, Any, List
from app.database import db

logger = structlog.get_logger(__name__)

def format_inr(amount: Any) -> str:
    """Format decimal/float values into INR style string."""
    if amount is None:
        return "0.00"
    try:
        val = float(amount)
        return f"{val:,.2f}"
    except (ValueError, TypeError):
        return "0.00"

def get_period_dates(period: str) -> tuple[datetime.datetime, datetime.datetime]:
    """Calculate start and end dates based on period string."""
    now = datetime.datetime.now()
    if period == "last_month":
        first_day_current = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end_date = first_day_current - datetime.timedelta(microseconds=1)
        start_date = end_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "this_year":
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end_date = now
    else:  # default to "this_month"
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end_date = now
    return start_date, end_date

class ContextBuilder:
    async def get_financial_context(self, tenant_id: str, period: str) -> Dict[str, Any]:
        start_date, end_date = get_period_dates(period)
        
        try:
            # 1. Invoice summary
            invoice_query = """
                SELECT 
                    COALESCE(SUM("totalAmount"), 0) as total_invoiced,
                    COALESCE(SUM("paidAmount"), 0) as received,
                    COALESCE(SUM(CASE WHEN status IN ('SENT', 'PARTIAL') THEN ("totalAmount" - "paidAmount") ELSE 0 END), 0) as pending,
                    COALESCE(SUM(CASE WHEN status = 'OVERDUE' THEN ("totalAmount" - "paidAmount") ELSE 0 END), 0) as overdue,
                    COUNT(CASE WHEN status = 'OVERDUE' THEN 1 END) as overdue_count
                FROM "Invoice"
                WHERE "tenantId" = $1 AND "invoiceDate" >= $2 AND "invoiceDate" <= $3
            """
            inv_row = await db.fetchrow(invoice_query, tenant_id, start_date, end_date)
            
            # 2. Expense summary
            expense_query = """
                SELECT 
                    COALESCE(SUM(e.amount), 0) as total_expenses,
                    COALESCE(SUM(e."gstAmount"), 0) as total_gst,
                    COALESCE(SUM(e."totalAmount"), 0) as total_gross_expenses
                FROM "Expense" e
                WHERE e."tenantId" = $1 AND e."expenseDate" >= $2 AND e."expenseDate" <= $3
            """
            exp_row = await db.fetchrow(expense_query, tenant_id, start_date, end_date)

            # 3. Expense by category breakdown
            category_query = """
                SELECT 
                    c.name as category_name,
                    COALESCE(SUM(e.amount), 0) as total_amount
                FROM "Expense" e
                JOIN "ExpenseCategory" c ON e."categoryId" = c.id
                WHERE e."tenantId" = $1 AND e."expenseDate" >= $2 AND e."expenseDate" <= $3
                GROUP BY c.name
                ORDER BY total_amount DESC
            """
            categories = await db.fetch(category_query, tenant_id, start_date, end_date)
            category_breakdown = {c["category_name"]: float(c["total_amount"]) for c in categories}

            # 4. Top customers by revenue
            customer_query = """
                SELECT 
                    c.name as customer_name,
                    COALESCE(SUM(i."totalAmount"), 0) as total_billed,
                    COUNT(i.id) as invoice_count
                FROM "Invoice" i
                JOIN "Customer" c ON i."customerId" = c.id
                WHERE i."tenantId" = $1 AND i."invoiceDate" >= $2 AND i."invoiceDate" <= $3
                GROUP BY c.name
                ORDER BY total_billed DESC
                LIMIT 5
            """
            customers = await db.fetch(customer_query, tenant_id, start_date, end_date)
            top_customers = [{
                "name": c["customer_name"],
                "total_billed": float(c["total_billed"]),
                "invoice_count": c["invoice_count"]
            } for c in customers]

            # 5. Net Profit
            total_invoiced = float(inv_row["total_invoiced"])
            received = float(inv_row["received"])
            total_expenses = float(exp_row["total_expenses"])
            
            net_profit = total_invoiced - total_expenses
            profit_margin = (net_profit / total_invoiced * 100) if total_invoiced > 0 else 0.0

            # 6. Tenant basic details
            tenant_info = await db.fetchrow(
                'SELECT name, "gstNumber", address, phone FROM "Tenant" WHERE id = $1', tenant_id
            )
            business_name = tenant_info["name"] if tenant_info else "BizSaathi Merchant"
            gstin = tenant_info["gstNumber"] if tenant_info and tenant_info["gstNumber"] else "N/A"
            state = "N/A" # State not directly in tenant schema, can fetch from top customer supply
            
            return {
                "business_name": business_name,
                "gstin": gstin,
                "state": state,
                "period": period,
                "total_invoiced": total_invoiced,
                "received": received,
                "pending": float(inv_row["pending"]),
                "overdue": float(inv_row["overdue"]),
                "overdue_count": inv_row["overdue_count"],
                "total_expenses": total_expenses,
                "category_breakdown": category_breakdown,
                "net_profit": net_profit,
                "profit_margin": round(profit_margin, 2),
                "top_customers": top_customers
            }
        except Exception as e:
            logger.error("Error gathering financial context", tenant_id=tenant_id, error=str(e))
            return {}

    async def get_invoice_context(self, tenant_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        query = """
            SELECT 
                i."invoiceNumber", 
                c.name as customer_name, 
                i."invoiceDate", 
                i."dueDate", 
                i.status, 
                i."totalAmount", 
                i."paidAmount"
            FROM "Invoice" i
            JOIN "Customer" c ON i."customerId" = c.id
            WHERE i."tenantId" = $1
            ORDER BY i."invoiceDate" DESC
            LIMIT $2
        """
        try:
            rows = await db.fetch(query, tenant_id, limit)
            return [{
                "invoice_number": r["invoiceNumber"],
                "customer": r["customer_name"],
                "date": r["invoiceDate"].strftime("%Y-%m-%d"),
                "due_date": r["dueDate"].strftime("%Y-%m-%d") if r["dueDate"] else "N/A",
                "status": r["status"],
                "total": float(r["totalAmount"]),
                "paid": float(r["paidAmount"])
            } for r in rows]
        except Exception as e:
            logger.error("Error in get_invoice_context", error=str(e))
            return []

    async def get_expense_context(self, tenant_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        query = """
            SELECT 
                e.title, 
                c.name as category, 
                e.amount, 
                e.vendor, 
                e."expenseDate"
            FROM "Expense" e
            JOIN "ExpenseCategory" c ON e."categoryId" = c.id
            WHERE e."tenantId" = $1
            ORDER BY e."expenseDate" DESC
            LIMIT $2
        """
        try:
            rows = await db.fetch(query, tenant_id, limit)
            return [{
                "title": r["title"],
                "category": r["category"],
                "amount": float(r["amount"]),
                "vendor": r["vendor"] or "N/A",
                "date": r["expenseDate"].strftime("%Y-%m-%d")
            } for r in rows]
        except Exception as e:
            logger.error("Error in get_expense_context", error=str(e))
            return []

    async def get_staff_context(self, tenant_id: str) -> Dict[str, Any]:
        try:
            # 1. Staff count
            staff_count = await db.fetchval(
                'SELECT COUNT(*) FROM "Staff" WHERE "tenantId" = $1 AND status = \'ACTIVE\'',
                tenant_id
            )
            
            # 2. Total payroll cost (sum of basic + allowances of active staff)
            payroll_cost = await db.fetchval(
                'SELECT COALESCE(SUM("basicSalary" + allowances), 0) FROM "Staff" WHERE "tenantId" = $1 AND status = \'ACTIVE\'',
                tenant_id
            )
            
            # 3. Attendance rate (this month)
            now = datetime.datetime.now()
            start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            attendance_query = """
                SELECT 
                    COUNT(CASE WHEN status = 'PRESENT' THEN 1 END) as present_days,
                    COUNT(*) as total_records
                FROM "Attendance"
                WHERE "tenantId" = $1 AND date >= $2
            """
            att_row = await db.fetchrow(attendance_query, tenant_id, start_of_month)
            
            rate = 0.0
            if att_row and att_row["total_records"] > 0:
                rate = (att_row["present_days"] / att_row["total_records"]) * 100

            return {
                "active_staff_count": staff_count or 0,
                "monthly_payroll_cost": float(payroll_cost) if payroll_cost else 0.0,
                "attendance_rate_this_month": round(rate, 2)
            }
        except Exception as e:
            logger.error("Error gathering staff context", error=str(e))
            return {}

    async def get_crm_context(self, tenant_id: str) -> Dict[str, Any]:
        try:
            # 1. Open leads & Pipeline value
            leads_query = """
                SELECT 
                    COUNT(*) as count,
                    COALESCE(SUM(value), 0) as value
                FROM crm_leads
                WHERE tenant_id = $1 AND status = 'OPEN'
            """
            # Since tenant_id is UUID in crm_leads, we cast it if it's a string.
            import uuid
            t_uuid = uuid.UUID(tenant_id)
            
            leads_row = await db.fetchrow(leads_query, t_uuid)
            
            # 2. Win rate
            win_query = """
                SELECT 
                    COUNT(CASE WHEN status = 'WON' THEN 1 END) as won_count,
                    COUNT(CASE WHEN status IN ('WON', 'LOST') THEN 1 END) as closed_count
                FROM crm_leads
                WHERE tenant_id = $1
            """
            win_row = await db.fetchrow(win_query, t_uuid)
            
            win_rate = 0.0
            if win_row and win_row["closed_count"] > 0:
                win_rate = (win_row["won_count"] / win_row["closed_count"]) * 100
                
            return {
                "open_leads_count": leads_row["count"] if leads_row else 0,
                "pipeline_value": float(leads_row["value"]) if leads_row else 0.0,
                "lead_win_rate": round(win_rate, 2)
            }
        except Exception as e:
            logger.warn("CRM context query skipped (possibly crm tables not initialized or empty)", error=str(e))
            return {
                "open_leads_count": 0,
                "pipeline_value": 0.0,
                "lead_win_rate": 0.0
            }

    async def build_full_context(self, tenant_id: str, period: str = "this_month") -> str:
        financials = await self.get_financial_context(tenant_id, period)
        invoices = await self.get_invoice_context(tenant_id, limit=5)
        expenses = await self.get_expense_context(tenant_id, limit=5)
        staff = await self.get_staff_context(tenant_id)
        crm = await self.get_crm_context(tenant_id)

        if not financials:
            return "No financial data available for this business."

        # Format breakdown string
        breakdown_list = [f"{k}: ₹{format_inr(v)}" for k, v in financials["category_breakdown"].items()]
        category_breakdown = ", ".join(breakdown_list) if breakdown_list else "None"

        # Top customer breakdown
        cust_list = [f"{c['name']} (₹{format_inr(c['total_billed'])})" for c in financials["top_customers"]]
        top_customers = ", ".join(cust_list) if cust_list else "None"

        # Formatting recent invoices list
        inv_str = ""
        for inv in invoices:
            inv_str += f"- Invoice {inv['invoice_number']} to {inv['customer']} for ₹{format_inr(inv['total'])} ({inv['status']}) on {inv['date']}\n"
        if not inv_str:
            inv_str = "No recent invoices found.\n"

        # Formatting recent expenses list
        exp_str = ""
        for exp in expenses:
            exp_str += f"- Expense of ₹{format_inr(exp['amount'])} for '{exp['title']}' under '{exp['category']}' from vendor '{exp['vendor']}' on {exp['date']}\n"
        if not exp_str:
            exp_str = "No recent expenses found.\n"

        # Final Prompt context construction
        context = f"""
=== BUSINESS DATA (Use ONLY this data for numbers) ===

TENANT: {financials['business_name']} | GST: {financials['gstin']}
PERIOD: {period.upper()} (Dates: {get_period_dates(period)[0].strftime('%Y-%m-%d')} to {get_period_dates(period)[1].strftime('%Y-%m-%d')})

REVENUE:
- Total Invoiced: ₹{format_inr(financials['total_invoiced'])}
- Received: ₹{format_inr(financials['received'])}
- Pending: ₹{format_inr(financials['pending'])}
- Overdue: ₹{format_inr(financials['overdue'])} ({financials['overdue_count']} invoices)

EXPENSES:
- Total: ₹{format_inr(financials['total_expenses'])}
- By Category: {category_breakdown}

NET PROFIT: ₹{format_inr(financials['net_profit'])} ({financials['profit_margin']}% margin)

TOP CUSTOMERS: {top_customers}

RECENT TRANSACTIONS:
Invoices:
{inv_str}
Expenses:
{exp_str}

STAFF:
- Active Employee Count: {staff['active_staff_count']}
- Monthly Payroll Commitment: ₹{format_inr(staff['monthly_payroll_cost'])}
- Attendance Rate This Month: {staff['attendance_rate_this_month']}%

CRM & PIPELINE:
- Open Deals Count: {crm['open_leads_count']}
- Pipeline Value: ₹{format_inr(crm['pipeline_value'])}
- Lead Conversion Win Rate: {crm['lead_win_rate']}%

=== END OF DATA ===
"""
        return context

context_builder = ContextBuilder()
