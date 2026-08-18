"""
Reasoning Engine
-----------------
Classifies the user question, builds a structured prompt from retrieved
context + pattern analysis, runs multi-step reasoning via the LLM, and
returns a structured response (answer, steps, citations, actions).
"""
from __future__ import annotations

import json
import re
from typing import Optional
import logging

from app.services import llm_service
from app.api.models import ReasoningStep, DataCitation, NextAction

logger = logging.getLogger(__name__)

# ── Query classification ──────────────────────────────────────────────────────

_ANALYTICAL_KEYWORDS = ["why", "reason", "cause", "because", "explain", "what happened"]
_PRESCRIPTIVE_KEYWORDS = ["should i", "what to eat", "recommend", "suggest", "advice", "plan", "help me"]
_PREDICTIVE_KEYWORDS = ["will i", "when will", "how long", "on track", "predict", "forecast", "reach my goal"]


def classify_query(question: str) -> str:
    q = question.lower()
    if any(k in q for k in _PREDICTIVE_KEYWORDS):
        return "predictive"
    if any(k in q for k in _PRESCRIPTIVE_KEYWORDS):
        return "prescriptive"
    return "analytical"


# ── System prompt ─────────────────────────────────────────────────────────────

_BASE_SYSTEM = """You are an expert AI health advisor with deep knowledge of fitness, nutrition, sleep science, and behavioural health.
You answer questions using ONLY the personal health data provided — never fabricate data.
When citing evidence, reference specific dates or values from the context.
Always end with 1-3 concrete, actionable next steps.

Format your response as JSON with this exact structure:
{
  "answer": "<conversational response, 150-300 words>",
  "reasoning_steps": [
    {"step": 1, "description": "...", "confidence": 0.9},
    ...
  ],
  "data_citations": [
    {"date": "YYYY-MM-DD", "metric": "...", "value": "...", "note": "..."},
    ...
  ],
  "next_actions": [
    {"action": "...", "reason": "...", "urgency": "low|medium|high"},
    ...
  ],
  "confidence": 0.85
}
Only return valid JSON, no surrounding text."""


# ── Context builder ───────────────────────────────────────────────────────────

def _build_context_block(health_context: dict, pattern_report: dict, semantic_hits: list[dict]) -> str:
    profile = health_context.get("profile", {})
    goals = health_context.get("goals", [])

    lines = [
        "=== USER PROFILE ===",
        f"Age: {profile.get('age', 'unknown')}  Gender: {profile.get('gender', 'unknown')}",
        f"Height: {profile.get('height_cm')}cm  Weight: {profile.get('weight_kg')}kg  Target: {profile.get('target_weight_kg')}kg",
        f"Activity Level: {profile.get('activity_level')}  Diet: {profile.get('diet_preference')}",
        f"Calorie Target: {profile.get('daily_calories_target')} kcal/day",
        "",
        "=== ACTIVE GOALS ===",
    ]
    for g in goals[:5]:
        lines.append(f"- {g.get('title')} ({g.get('status')}): {g.get('current_value')} / {g.get('target_value')} {g.get('unit', '')}")

    lines += [
        "",
        "=== PATTERN ANALYSIS ===",
        f"Weight trend: {json.dumps(pattern_report.get('weight_trend', {}))}",
        f"Energy trend: {json.dumps(pattern_report.get('energy_trend', {}))}",
        f"Workout consistency: {json.dumps(pattern_report.get('workout_consistency', {}))}",
        f"Calorie balance: {json.dumps(pattern_report.get('calorie_balance', {}))}",
    ]

    correlations = pattern_report.get("correlations", [])
    if correlations:
        lines.append("Key correlations:")
        for c in correlations[:5]:
            lines.append(f"  - {c['metric_a']} ↔ {c['metric_b']}: r={c['r']} ({c['strength']} {c['direction']})")

    # Recent tracking summary
    tracking = health_context.get("daily_tracking", [])[:14]
    if tracking:
        lines += ["", "=== RECENT DAILY TRACKING (last 14 days) ==="]
        for t in tracking[:14]:
            lines.append(
                f"  {t.get('date')}: sleep={t.get('sleephours')}h mood={t.get('mood')}/5 "
                f"workout={t.get('workoutminutes')}min calories={t.get('calories')} "
                f"water={t.get('watercups')}cups"
            )

    # Weight log
    weight = health_context.get("weight_logs", [])[:14]
    if weight:
        lines += ["", "=== WEIGHT LOGS (last 14 entries) ==="]
        for w in weight[:14]:
            lines.append(f"  {w.get('date')}: {w.get('weight_kg')} kg")

    # Semantic hits (most relevant historical entries)
    if semantic_hits:
        lines += ["", "=== SEMANTICALLY RELEVANT HISTORY ==="]
        for hit in semantic_hits[:8]:
            lines.append(f"  [{hit['record_type']} {hit['record_date']}] {hit['content_text'][:200]}")

    return "\n".join(lines)


# ── Multi-step reasoning prompt ───────────────────────────────────────────────

_REASONING_SYSTEM = """You are a health data analyst. Before giving a final answer, think step by step:
1. Identify what the user is really asking
2. List what data is available and most relevant
3. Identify any patterns or anomalies in the data
4. Form 1-3 hypotheses to explain what you observe
5. Score each hypothesis by evidence strength
6. Pick the best-supported answer
7. Derive actionable recommendations

Then produce the final JSON response as instructed."""


async def reason_and_respond(
    question: str,
    query_type: str,
    health_context: dict,
    pattern_report: dict,
    semantic_hits: list[dict],
    conversation_history: list[dict],
) -> dict:
    context_block = _build_context_block(health_context, pattern_report, semantic_hits)

    messages = conversation_history + [
        {
            "role": "user",
            "content": (
                f"HEALTH DATA CONTEXT:\n{context_block}\n\n"
                f"QUESTION TYPE: {query_type}\n\n"
                f"USER QUESTION: {question}"
            ),
        }
    ]

    system = _BASE_SYSTEM + "\n\n" + _REASONING_SYSTEM
    raw = await llm_service.complete(messages, system_prompt=system, temperature=0.2)

    # Parse JSON from LLM response
    try:
        # Some models wrap JSON in markdown code fences — strip them
        clean = re.sub(r"```(?:json)?\s*|\s*```", "", raw.strip())
        data = json.loads(clean)
    except json.JSONDecodeError:
        logger.warning("LLM did not return valid JSON; falling back to plain text")
        data = {
            "answer": raw,
            "reasoning_steps": [],
            "data_citations": [],
            "next_actions": [],
            "confidence": 0.5,
        }

    return data
