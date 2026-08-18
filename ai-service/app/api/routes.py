from fastapi import APIRouter, HTTPException
from app.api.models import (
    QueryRequest, QueryResponse,
    FeedbackRequest,
    WeeklyInsightsResponse,
    ConversationHistoryResponse,
)
from app.core.advisor import HealthAdvisorOrchestrator

router = APIRouter()
advisor = HealthAdvisorOrchestrator()


@router.post("/advisor/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    """
    Answer a free-form health question using the user's personal logs.
    Supports multi-turn: pass conversation_id from a previous response to continue.
    """
    try:
        return await advisor.answer(
            user_id=request.user_id,
            question=request.question,
            conversation_id=request.conversation_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/advisor/insights/weekly", response_model=WeeklyInsightsResponse)
async def weekly_insights(user_id: int):
    """
    Returns proactively detected insights for the current week.
    E.g. weight plateau, low energy streak, missed routine blocks.
    """
    try:
        return await advisor.weekly_insights(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/advisor/conversation/{conversation_id}", response_model=ConversationHistoryResponse)
async def get_conversation(conversation_id: str, user_id: int):
    """Retrieve the message history for a conversation session."""
    try:
        return await advisor.get_conversation(conversation_id, user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/advisor/feedback")
async def feedback(request: FeedbackRequest):
    """
    Log user satisfaction for a message.
    Used to adapt future reasoning depth and response style.
    """
    try:
        await advisor.record_feedback(request)
        return {"status": "recorded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
