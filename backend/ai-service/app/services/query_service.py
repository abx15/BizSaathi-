import hashlib
import json
import structlog
import uuid
from typing import Dict, Any, List, Optional
from app.redis_client import redis_client
from app.services.rag_service import rag_service
from app.services.context_builder import context_builder
from app.llm import llm_service

logger = structlog.get_logger(__name__)

class QueryService:
    def get_cache_key(self, tenant_id: str, message: str, period: str) -> str:
        h = hashlib.md5(f"{message}:{period}".encode("utf-8")).hexdigest()
        return f"ai:query:{tenant_id}:{h}"

    def get_conv_key(self, conversation_id: str) -> str:
        return f"ai:conv:{conversation_id}"

    async def get_conversation_history(self, conversation_id: str) -> List[Dict[str, str]]:
        key = self.get_conv_key(conversation_id)
        history_raw = await redis_client.get(key)
        if history_raw:
            try:
                return json.loads(history_raw)
            except Exception:
                return []
        return []

    async def save_conversation_history(self, conversation_id: str, history: List[Dict[str, str]]):
        key = self.get_conv_key(conversation_id)
        # Cap at last 10 messages (5 turns)
        capped_history = history[-10:]
        await redis_client.set(key, json.dumps(capped_history), ex=86400) # 24 hr TTL

    async def clear_conversation(self, conversation_id: str):
        key = self.get_conv_key(conversation_id)
        await redis_client.delete(key)

    async def query(self, tenant_id: str, message: str, conversation_id: Optional[str] = None, period: str = "this_month") -> Dict[str, Any]:
        cache_key = self.get_cache_key(tenant_id, message, period)
        
        # 1. Try to fetch cached response
        cached_res = await redis_client.get(cache_key)
        if cached_res:
            try:
                logger.info("Cache hit for query response", tenant_id=tenant_id)
                return json.loads(cached_res)
            except Exception:
                pass

        # 2. Handle conversation context
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
            history = []
        else:
            history = await self.get_conversation_history(conversation_id)

        # Append new user question to history
        history.append({"role": "user", "content": message})

        # 3. Retrieve DB aggregated financial summary and Qdrant semantic contexts
        rag_hits = await rag_service.search_context(tenant_id, message, limit=5)
        rag_context = "\n".join([f"- {h}" for h in rag_hits]) if rag_hits else "No specific context records matched."
        
        db_context = await context_builder.build_full_context(tenant_id, period)
        full_context = f"{db_context}\n\n=== RELEVANT HISTORICAL RECORDS ===\n{rag_context}\n"

        # 4. Invoke LLM with history and context
        answer = await llm_service.chat(history, context=full_context)

        # Append answer to history and save
        history.append({"role": "assistant", "content": answer})
        await self.save_conversation_history(conversation_id, history)

        # 5. Generate suggested dynamic follow-up questions
        suggested_prompt = (
            f"Given this business user query: '{message}'\n"
            f"And this answer: '{answer}'\n"
            f"Generate exactly 2 relevant, concise follow-up questions in the same language. "
            f"Respond ONLY with a valid JSON array of 2 strings: ['question 1', 'question 2']."
        )
        schema = {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 2,
            "maxItems": 2
        }
        suggested = await llm_service.structured_output(suggested_prompt, schema)
        if not isinstance(suggested, list) or len(suggested) < 2:
            # default suggestions
            suggested = [
                "Pichle mahine se kharcha zyada hua ya kam?",
                "Kaun sa vendor sabse zyada payment leta hai?"
            ]

        response_data = {
            "answer": answer,
            "sources": ["expense_data" if "kharch" in message.lower() or "expense" in message.lower() else "invoice_data"],
            "suggestedQuestions": suggested,
            "conversationId": conversation_id
        }

        # 6. Cache response for 5 minutes
        await redis_client.set(cache_key, json.dumps(response_data), ex=300)
        
        return response_data

query_service = QueryService()
