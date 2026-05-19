from pydantic import BaseModel
from typing import List, Optional

class BusinessInsight(BaseModel):
    type: str  # "warning" | "positive" | "tip"
    title: str
    body: str
    actionLabel: Optional[str] = None
    actionUrl: Optional[str] = None

class InsightsResponseData(BaseModel):
    generatedAt: str
    period: str
    insights: List[BusinessInsight]

class InsightsResponse(BaseModel):
    success: bool
    data: InsightsResponseData

class DashboardSummaryData(BaseModel):
    summary: str
    mood: str  # "positive" | "neutral" | "warning"

class DashboardSummaryResponse(BaseModel):
    success: bool
    data: DashboardSummaryData
