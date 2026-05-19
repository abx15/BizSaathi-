import asyncio
import json
import structlog
from fastapi import APIRouter, Request, Query, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional
from app.schemas.query import QueryRequest, QueryResponse
from app.services.query_service import query_service
from app.services.context_builder import context_builder
from app.services.rag_service import rag_service
from app.llm import llm_service

logger = structlog.get_logger(__name__)
router = APIRouter()

@router.post("/query", response_model=QueryResponse)
async def ask_question(request: Request, body: QueryRequest):
    tenant_id = request.state.tenant_id
    try:
        res = await query_service.query(
            tenant_id=tenant_id,
            message=body.message,
            conversation_id=body.conversationId,
            period=body.period or "this_month"
        )
        return {"success": True, "data": res}
    except Exception as e:
        logger.error("Query API failed", tenant_id=tenant_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/query/stream")
async def stream_question(
    request: Request,
    message: str = Query(...),
    conversationId: Optional[str] = Query(None),
    period: str = Query("this_month")
):
    tenant_id = request.state.tenant_id
    logger.info("SSE Stream requested", tenant_id=tenant_id, message=message)

    async def event_generator():
        # Clean conversation_id mapping
        active_conversation_id = conversationId or str(uuid.uuid4())
        
        # 1. Fetch DB aggregated financials + Qdrant vectors
        try:
            rag_hits = await rag_service.search_context(tenant_id, message, limit=5)
            rag_context = "\n".join([f"- {h}" for h in rag_hits]) if rag_hits else ""
            
            db_context = await context_builder.build_full_context(tenant_id, period)
            full_context = f"{db_context}\n\n=== RELEVANT HISTORICAL RECORDS ===\n{rag_context}\n"
            
            history = await query_service.get_conversation_history(active_conversation_id)
            history.append({"role": "user", "content": message})
        except Exception as pre_err:
            logger.error("Error setting up stream context", error=str(pre_err))
            yield f"data: {json.dumps({'error': 'Failed to prepare semantic context'})}\n\n"
            yield f"data: {json.dumps({'done': True, 'conversationId': active_conversation_id})}\n\n"
            return

        full_answer = ""
        try:
            # 2. Iterate Groq stream yielding chunks
            async for chunk in llm_service.stream(history, context=full_context):
                if await request.is_disconnected():
                    logger.warn("SSE Client disconnected during generation", tenant_id=tenant_id)
                    break
                
                full_answer += chunk
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                await asyncio.sleep(0.01) # cooperative yield
                
        except Exception as e:
            logger.error("Stream generation crashed", error=str(e))
            yield f"data: {json.dumps({'error': 'AI processing error occurred during stream'})}\n\n"
        finally:
            # Save conversation history if we completed or partially completed
            if full_answer:
                try:
                    history.append({"role": "assistant", "content": full_answer})
                    await query_service.save_conversation_history(active_conversation_id, history)
                except Exception as save_err:
                    logger.error("Failed to save streaming conv history", error=str(save_err))
            
            # Send done trigger
            yield f"data: {json.dumps({'done': True, 'conversationId': active_conversation_id})}\n\n"

    # Use standard UUID generation if not importable directly
    import uuid
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.delete("/conversation/{conversation_id}")
async def clear_chat(request: Request, conversation_id: str):
    try:
        await query_service.clear_conversation(conversation_id)
        return {"success": True, "message": "Conversation history cleared successfully"}
    except Exception as e:
        logger.error("Failed clearing conversation", conversation_id=conversation_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to clear conversation")
