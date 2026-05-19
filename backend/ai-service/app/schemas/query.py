from pydantic import BaseModel
from typing import List, Optional

class QueryRequest(BaseModel):
    message: str
    conversationId: Optional[str] = None
    period: Optional[str] = "this_month"

class QueryResponseData(BaseModel):
    answer: str
    sources: List[str]
    suggestedQuestions: List[str]
    conversationId: str

class QueryResponse(BaseModel):
    success: bool
    data: QueryResponseData
