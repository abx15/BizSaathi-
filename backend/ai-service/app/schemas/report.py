from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ReportRequest(BaseModel):
    reportType: str = Field(description="Type of report: e.g. monthly_summary, expense_analysis, etc.")
    period: str = Field(description="Period for report in YYYY-MM format")
    format: Optional[str] = "json"

class ReportChart(BaseModel):
    type: str  # "bar" | "line" | "pie"
    labels: List[str]
    values: List[float]

class ReportSection(BaseModel):
    title: str
    summary: str
    data: Optional[Dict[str, Any]] = None
    chart: Optional[ReportChart] = None

class ReportResponseData(BaseModel):
    reportType: str
    period: str
    title: str
    sections: List[ReportSection]
    aiNarrative: str
    recommendations: List[str]

class ReportResponse(BaseModel):
    success: bool
    data: ReportResponseData
