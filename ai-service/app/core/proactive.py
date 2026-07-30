"""
Proactive Insight Service
--------------------------
Runs trigger-based checks on a user's health data and returns
insights the user hasn't explicitly asked for (but should know about).

Triggers:
  - Weight plateau for 2+ weeks
  - Low energy/mood for 3+ consecutive days
  - Missed workouts pattern
  - Calorie surplus vs goal
  - Goal deadline approaching with slow progress
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Optional
import logging

from app.api.models import ProactiveInsight, DataCitation

logger = logging.getLogger(__name__)


def _weight_plateau_check(weight_trend: dict, weight_logs: list[dict]) -> Optional[ProactiveInsight]:
    if not weight_trend or not weight_trend.get("plateau"):
        return None
    recent = weight_logs[:7]
    citations = [DataCitation(date=str(w["date"]), metric="weight_kg", value=w["weight_kg"]) for w in recent[:3]]
    return ProactiveInsight(
        type="weight_plateau",
        title="Weight has plateaued",
        description=(
            f"Your weight hasn't changed meaningfully in the past 2 weeks "
            f"(std dev: {weight_trend.get('recent_std')} kg). "
            "This often happens when your body adapts to current calories or exercise volume."
        ),
        supporting_data=citations,
        recommended_action="Consider a progressive overload in workouts, or a 200-300 kcal calorie adjustment.",
        urgency="medium",
    )


def _low_energy_check(energy_trend: dict, tracking: list[dict]) -> Optional[ProactiveInsight]:
    streak = energy_trend.get("low_energy_streak", 0)
    if streak < 3:
        return None
    recent = [t for t in tracking[:7] if t.get("mood", 5) <= 2]
    citations = [DataCitation(date=str(t["date"]), metric="mood", value=t["mood"]) for t in recent[:3]]
    return ProactiveInsight(
        type="low_energy_streak",
        title=f"Low energy for {streak} days in a row",
        description=(
            f"You've logged a mood score of 2 or below for {streak} consecutive days. "
            "This could indicate fatigue, under-eating, or overtraining."
        ),
        supporting_data=citations,
        recommended_action="Consider a rest day, boosting sleep, or increasing calorie intake temporarily.",
        urgency="high" if streak >= 5 else "medium",
    )


def _calorie_surplus_check(calorie_balance: dict) -> Optional[ProactiveInsight]:
    avg = calorie_balance.get("avg_deficit_surplus")
    if avg is None or avg >= 0:
        return None
    if abs(avg) < 200:
        return None
    return ProactiveInsight(
        type="calorie_surplus",
        title="Consistently eating above target",
        description=(
            f"You're averaging {abs(avg):.0f} kcal above your daily target. "
            "If weight loss is your goal, this will slow progress."
        ),
        supporting_data=[],
        recommended_action="Review portion sizes on high-calorie days, particularly dinners.",
        urgency="medium",
    )


def _workout_missed_check(workout_consistency: dict) -> Optional[ProactiveInsight]:
    rate = workout_consistency.get("completion_rate", 1.0)
    skipped_day = workout_consistency.get("commonly_skipped_day")
    if rate >= 0.75:
        return None
    return ProactiveInsight(
        type="low_workout_completion",
        title=f"Workout completion is low ({int(rate*100)}%)",
        description=(
            f"You've only completed {int(rate*100)}% of planned workouts recently."
            + (f" You most often skip on {skipped_day}s." if skipped_day else "")
        ),
        supporting_data=[],
        recommended_action="Reduce planned workout days temporarily or reschedule away from low-motivation days.",
        urgency="medium",
    )


def _goal_deadline_check(goals: list[dict]) -> list[ProactiveInsight]:
    insights = []
    today = date.today()
    for g in goals:
        if g.get("status") != "active" or not g.get("deadline_date"):
            continue
        deadline = g["deadline_date"]
        if isinstance(deadline, str):
            from datetime import datetime
            deadline = datetime.strptime(deadline, "%Y-%m-%d").date()
        days_left = (deadline - today).days
        if days_left > 30 or days_left < 0:
            continue
        target = g.get("target_value") or 0
        current = g.get("current_value") or 0
        progress_pct = (current / target * 100) if target else 0
        if progress_pct < 60:
            insights.append(ProactiveInsight(
                type="goal_deadline_risk",
                title=f"Goal at risk: {g.get('title')}",
                description=(
                    f"Only {days_left} days left to reach '{g.get('title')}'. "
                    f"You're at {progress_pct:.0f}% of your target."
                ),
                supporting_data=[],
                recommended_action=f"Increase daily focus on '{g.get('title')}' to stay on track.",
                urgency="high" if days_left <= 7 else "medium",
            ))
    return insights


def generate_proactive_insights(health_context: dict, pattern_report: dict) -> list[ProactiveInsight]:
    """Entry point — runs all trigger checks and returns relevant insights."""
    insights = []

    weight_insight = _weight_plateau_check(
        pattern_report.get("weight_trend", {}),
        health_context.get("weight_logs", []),
    )
    if weight_insight:
        insights.append(weight_insight)

    energy_insight = _low_energy_check(
        pattern_report.get("energy_trend", {}),
        health_context.get("daily_tracking", []),
    )
    if energy_insight:
        insights.append(energy_insight)

    calorie_insight = _calorie_surplus_check(pattern_report.get("calorie_balance", {}))
    if calorie_insight:
        insights.append(calorie_insight)

    workout_insight = _workout_missed_check(pattern_report.get("workout_consistency", {}))
    if workout_insight:
        insights.append(workout_insight)

    goal_insights = _goal_deadline_check(health_context.get("goals", []))
    insights.extend(goal_insights)

    return insights
