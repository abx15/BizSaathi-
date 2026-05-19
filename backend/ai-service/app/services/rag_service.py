import hashlib
import uuid
import structlog
from typing import List
from app.database import db
from app.vector_store import vector_store
from app.services.embedding_service import embedding_service
from app.services.context_builder import context_builder
from app.llm import llm_service
from app.config import settings

logger = structlog.get_logger(__name__)

class RAGService:
    async def index_tenant_data(self, tenant_id: str) -> bool:
        """
        Indices all business data for a tenant into Qdrant.
        Clears old entries first.
        """
        logger.info("Indexing tenant data into Qdrant vector DB", tenant_id=tenant_id)
        
        try:
            # 1. Clear old data for tenant
            await vector_store.delete_tenant_data(settings.QDRANT_COLLECTION_BUSINESS, tenant_id)
            
            documents = []
            
            # 2. Fetch invoices
            invoices = await db.fetch(
                """
                SELECT i."invoiceNumber", c.name as customer, i."invoiceDate", i.status, i."totalAmount"
                FROM "Invoice" i
                JOIN "Customer" c ON i."customerId" = c.id
                WHERE i."tenantId" = $1
                """,
                tenant_id
            )
            for inv in invoices:
                txt = f"Invoice {inv['invoiceNumber']} to customer {inv['customer']} on date {inv['invoiceDate'].strftime('%Y-%m-%d')} for total ₹{float(inv['totalAmount']):,.2f}. Status: {inv['status']}."
                documents.append({
                    "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{tenant_id}:invoice:{inv['invoiceNumber']}")),
                    "text": txt,
                    "metadata": {"type": "invoice", "number": inv['invoiceNumber']}
                })

            # 3. Fetch expenses
            expenses = await db.fetch(
                """
                SELECT e.title, c.name as category, e.amount, e.vendor, e."expenseDate"
                FROM "Expense" e
                JOIN "ExpenseCategory" c ON e."categoryId" = c.id
                WHERE e."tenantId" = $1
                """,
                tenant_id
            )
            for idx, exp in enumerate(expenses):
                vendor = exp['vendor'] or "unknown vendor"
                txt = f"Expense for {exp['title']} under category {exp['category']} from vendor {vendor} on date {exp['expenseDate'].strftime('%Y-%m-%d')} for amount ₹{float(exp['amount']):,.2f}."
                documents.append({
                    "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{tenant_id}:expense:{idx}")),
                    "text": txt,
                    "metadata": {"type": "expense", "title": exp['title']}
                })

            # 4. Fetch customers
            customers = await db.fetch(
                'SELECT name, email, phone, city, state FROM "Customer" WHERE "tenantId" = $1',
                tenant_id
            )
            for cust in customers:
                city = cust['city'] or "unknown city"
                state = cust['state'] or "unknown state"
                txt = f"Customer {cust['name']}, contact information: phone {cust['phone'] or 'N/A'}, email {cust['email'] or 'N/A'}, located in {city}, {state}."
                documents.append({
                    "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{tenant_id}:customer:{cust['name']}")),
                    "text": txt,
                    "metadata": {"type": "customer", "name": cust['name']}
                })

            # 5. Fetch leads
            try:
                import uuid as pyuuid
                t_uuid = pyuuid.UUID(tenant_id)
                leads = await db.fetch(
                    """
                    SELECT l.title, l.value, l.status, l.priority, c.name as contact_name
                    FROM crm_leads l
                    LEFT JOIN crm_contacts c ON l.contact_id = c.id
                    WHERE l.tenant_id = $1
                    """,
                    t_uuid
                )
                for lidx, lead in enumerate(leads):
                    contact = lead['contact_name'] or "unknown contact"
                    txt = f"CRM Lead: Deal '{lead['title']}' valued at ₹{float(lead['value']):,.2f} for contact {contact}. Current status: {lead['status']}, priority: {lead['priority']}."
                    documents.append({
                        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{tenant_id}:lead:{lidx}")),
                        "text": txt,
                        "metadata": {"type": "lead", "title": lead['title']}
                    })
            except Exception as le:
                logger.warn("Skipping RAG indexing for CRM leads", error=str(le))

            if not documents:
                logger.info("No documents found to index", tenant_id=tenant_id)
                return True

            # 6. Generate embeddings in batch
            texts = [d["text"] for d in documents]
            vectors = await embedding_service.embed_batch(texts)
            
            # 7. Upsert to Qdrant
            qdrant_docs = []
            for doc, vec in zip(documents, vectors):
                qdrant_docs.append({
                    "id": doc["id"],
                    "vector": vec,
                    "payload": {
                        "text": doc["text"],
                        "type": doc["metadata"]["type"],
                        "metadata": doc["metadata"]
                    }
                })
                
            success = await vector_store.upsert_documents(
                settings.QDRANT_COLLECTION_BUSINESS,
                tenant_id,
                qdrant_docs
            )
            return success
        except Exception as e:
            logger.error("Failed indexing tenant data into Qdrant", tenant_id=tenant_id, error=str(e))
            return False

    async def search_context(self, tenant_id: str, query: str, limit: int = 5) -> List[str]:
        """Generate query vector and search for matching text snippets in Qdrant."""
        try:
            vector = await embedding_service.embed_query(query)
            hits = await vector_store.search(
                collection=settings.QDRANT_COLLECTION_BUSINESS,
                tenant_id=tenant_id,
                query_vector=vector,
                limit=limit,
                score_threshold=0.5
            )
            return [hit["payload"]["text"] for hit in hits if "payload" in hit and "text" in hit["payload"]]
        except Exception as e:
            logger.error("Error in search_context RAG", error=str(e))
            return []

    async def answer_with_rag(self, tenant_id: str, query: str) -> str:
        """Core RAG method: gets semantic text, constructs DB financials context, and gets Groq completion."""
        # 1. Retrieve semantic document context
        rag_hits = await self.search_context(tenant_id, query, limit=5)
        rag_context = "\n".join([f"- {h}" for h in rag_hits]) if rag_hits else "No specific invoice or expense detail records matched."
        
        # 2. Retrieve aggregated DB context
        db_context = await context_builder.build_full_context(tenant_id)
        
        # 3. Combine contexts
        full_context = f"{db_context}\n\n=== RELEVANT HISTORICAL RECORDS ===\n{rag_context}\n"
        
        # 4. Trigger Groq execution
        messages = [{"role": "user", "content": query}]
        return await llm_service.chat(messages, context=full_context)

rag_service = RAGService()
