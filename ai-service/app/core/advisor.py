"""
Health Advisor Orchestrator
-----------------------------
Wires together all layers:
  1. Load / index user data
  2. Semantic retrieval
  3. Pattern detection
  4. Multi-step reasoning via LLM
  5. Session memory
  6. Proactive insights (for weekly endpoint)
"""
from __future__ import annotations

import uuid
from datetime import date, datetime
import logging

from app.api.models import (
    QueryResponse, ReasoningStep, DataCitation, NextAction,
    WeeklyInsightsResponse, ConversationHistoryResponse, ConversationMessage,
    FeedbackRequest,
)
from app.db.health_data import get_all_health_context
from app.services.embedding_service import index_user_data, semantic_search
from app.services.pattern_service import build_pattern_report
from app.services.session_manager import session_manager
from app.core.reasoning import classify_query, reason_and_respond
from app.core.proactive import generate_proactive_insights

logger = logging.getLogger(__name__)


class HealthAdvisorOrchestrator:
    # Track which users have been indexed in this process lifetime
    _indexed_users: set[int] = set()

    async def _ensure_indexed(self, user_id: int):
        """Index user data on first query per session."""
        if user_id not in self._indexed_users:
            await index_user_data(user_id, since_days=60)
            self._indexed_users.add(user_id)

    async def answer(
        self,
        user_id: int,
        question: str,
        conversation_id: str | None = None,
    ) -> QueryResponse:
        # 1. Session
        cid = session_manager.create_or_get(user_id, conversation_id)
        history = session_manager.get_history(cid)

        # 2. Index (lazy)
        await self._ensure_indexed(user_id)

        # 3. Fetch full health context from DB
        health_context = await get_all_health_context(user_id)

        # 4. Semantic search for relevant historical entries
        semantic_hits = await semantic_search(user_id, question)

        # 5. Pattern analysis
        pattern_report = build_pattern_report(health_context)

        # 6. Classify query
        query_type = classify_query(question)

        # 7. Reason + generate
        result = await reason_and_respond(
            question=question,
            query_type=query_type,
            health_context=health_context,
            pattern_report=pattern_report,
            semantic_hits=semantic_hits,
            conversation_history=history,
        )

        answer_text = result.get("answer", "I couldn't produce an answer. Please try rephrasing.")

        # 8. Store in session memory
        session_manager.add_turn(cid, question, answer_text)

        # 9. Build response
        reasoning_steps = [ReasoningStep(**s) for s in result.get("reasoning_steps", [])]
        citations = [DataCitation(**c) for c in result.get("data_citations", [])]
        actions = [NextAction(**a) for a in result.get("next_actions", [])]

        return QueryResponse(
            conversation_id=cid,
            answer=answer_text,
            reasoning_steps=reasoning_steps,
            data_citations=citations,
            next_actions=actions,
            confidence=result.get("confidence", 0.5),
            query_type=query_type,
        )

    async def weekly_insights(self, user_id: int) -> WeeklyInsightsResponse:
        await self._ensure_indexed(user_id)
        health_context = await get_all_health_context(user_id)
        pattern_report = build_pattern_report(health_context)
        insights = generate_proactive_insights(health_context, pattern_report)

        week_start = (date.today() - __import__("datetime").timedelta(days=date.today().weekday()))

        return WeeklyInsightsResponse(
            user_id=user_id,
            week_start=str(week_start),
            insights=insights,
            auto_recommendations={},
        )

    async def get_conversation(self, conversation_id: str, user_id: int) -> ConversationHistoryResponse:
        data = session_manager.get_all(conversation_id, user_id)
        messages = [ConversationMessage(**m) for m in data.get("messages", [])]
        return ConversationHistoryResponse(
            conversation_id=conversation_id,
            messages=messages,
        )

    async def record_feedback(self, request: FeedbackRequest):
        # Placeholder: persist to ai_feedback table for future adaptation
        logger.info(
            f"Feedback received for conversation {request.conversation_id}: "
            f"satisfied={request.satisfied} comment={request.comment}"
        )
