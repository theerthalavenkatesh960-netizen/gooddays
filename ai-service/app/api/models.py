from pydantic import BaseModel
from typing import Optional, List, Any


# ── Inbound ────────────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    user_id: int
    question: str
    conversation_id: Optional[str] = None     # if continuing an existing session


class FeedbackRequest(BaseModel):
    conversation_id: str
    message_index: int                         # which assistant turn user rated
    satisfied: bool
    comment: Optional[str] = None


# ── Outbound ───────────────────────────────────────────────────────────────────

class DataCitation(BaseModel):
    """A specific data point that informed the answer."""
    date: Optional[str] = None
    metric: str
    value: Any
    note: Optional[str] = None


class ReasoningStep(BaseModel):
    """One step in the reasoning chain (for explainability)."""
    step: int
    description: str
    confidence: Optional[float] = None        # 0.0 – 1.0


class NextAction(BaseModel):
    action: str
    reason: str
    urgency: str = "low"                      # low / medium / high


class QueryResponse(BaseModel):
    conversation_id: str
    answer: str                               # conversational response
    reasoning_steps: List[ReasoningStep] = []
    data_citations: List[DataCitation] = []
    next_actions: List[NextAction] = []
    confidence: float = 0.0
    query_type: str = "analytical"            # analytical / prescriptive / predictive


class ProactiveInsight(BaseModel):
    type: str                                 # weight_plateau / low_energy / ...
    title: str
    description: str
    supporting_data: List[DataCitation] = []
    recommended_action: Optional[str] = None
    urgency: str = "low"


class WeeklyInsightsResponse(BaseModel):
    user_id: int
    week_start: str
    insights: List[ProactiveInsight] = []
    auto_recommendations: dict = {}           # { "meal_plan": ..., "workout": ... }


class ConversationMessage(BaseModel):
    role: str                                 # "user" | "assistant"
    content: str
    timestamp: Optional[str] = None


class ConversationHistoryResponse(BaseModel):
    conversation_id: str
    messages: List[ConversationMessage] = []
