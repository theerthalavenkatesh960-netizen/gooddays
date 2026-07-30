"""
Pattern Detection Service
--------------------------
Runs statistical analysis on a user's health data to surface:
  - Correlations between metrics (e.g. sleep vs mood, workout vs weight)
  - Trend detection (weight plateau, energy decline, improving strength)
  - Anomalies (unusual spikes/dips in metrics)
  - Behavioural patterns (skips on specific days, consistency scores)
"""
from __future__ import annotations

from typing import Optional
import logging

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)


# ── Correlation analysis ──────────────────────────────────────────────────────

def compute_correlations(tracking: list[dict]) -> list[dict]:
    """
    Compute pairwise Pearson correlations between daily metrics.
    Returns significant correlations (|r| > 0.3, p < 0.05).
    """
    if len(tracking) < 14:
        return []

    df = pd.DataFrame(tracking)
    numeric_cols = ["sleephours", "mood", "workoutminutes", "calories", "watercups"]
    df_num = df[numeric_cols].apply(pd.to_numeric, errors="coerce").dropna(how="all")

    results = []
    cols = [c for c in numeric_cols if c in df_num.columns and df_num[c].notna().sum() >= 7]
    for i, a in enumerate(cols):
        for b in cols[i + 1:]:
            pair = df_num[[a, b]].dropna()
            if len(pair) < 7:
                continue
            r, p = stats.pearsonr(pair[a], pair[b])
            if abs(r) >= 0.3 and p < 0.05:
                results.append({
                    "metric_a": a,
                    "metric_b": b,
                    "r": round(r, 3),
                    "p": round(p, 4),
                    "direction": "positive" if r > 0 else "negative",
                    "strength": "strong" if abs(r) > 0.6 else "moderate",
                })

    return sorted(results, key=lambda x: -abs(x["r"]))


# ── Trend detection ───────────────────────────────────────────────────────────

def detect_weight_trend(weight_logs: list[dict]) -> dict:
    """
    Detect if weight is declining, plateaued, or increasing.
    Returns slope (kg/week), trend label, and plateau flag.
    """
    if len(weight_logs) < 5:
        return {"trend": "insufficient_data", "slope_kg_per_week": 0.0, "plateau": False}

    df = pd.DataFrame(weight_logs).sort_values("date")
    df["days_from_start"] = (pd.to_datetime(df["date"]) - pd.to_datetime(df["date"].iloc[0])).dt.days
    df["weight_kg"] = pd.to_numeric(df["weight_kg"], errors="coerce")
    df = df.dropna(subset=["weight_kg"])

    if len(df) < 3:
        return {"trend": "insufficient_data", "slope_kg_per_week": 0.0, "plateau": False}

    slope, intercept, r, p, _ = stats.linregress(df["days_from_start"], df["weight_kg"])
    slope_per_week = round(slope * 7, 3)

    # Plateau: slope near-zero AND recent 2-week std dev < 0.5kg
    recent = df.tail(14)
    recent_std = float(recent["weight_kg"].std()) if len(recent) > 3 else 1.0
    plateau = abs(slope_per_week) < 0.15 and recent_std < 0.5

    trend = "plateau" if plateau else ("declining" if slope_per_week < 0 else "increasing")

    return {
        "trend": trend,
        "slope_kg_per_week": slope_per_week,
        "r_squared": round(r ** 2, 3),
        "plateau": plateau,
        "recent_std": round(recent_std, 3),
    }


def detect_energy_trend(tracking: list[dict], window: int = 7) -> dict:
    """Detect if user's mood/energy has been trending low recently."""
    if len(tracking) < window:
        return {"low_energy_streak": 0, "avg_mood": None}

    df = pd.DataFrame(tracking).sort_values("date", ascending=False)
    df["mood"] = pd.to_numeric(df["mood"], errors="coerce")
    recent = df.head(window).dropna(subset=["mood"])

    avg_mood = round(float(recent["mood"].mean()), 2) if len(recent) > 0 else None
    low_streak = int((recent["mood"] <= 2).sum())

    return {
        "low_energy_streak": low_streak,
        "avg_mood_last_7d": avg_mood,
        "alert": low_streak >= 3,
    }


# ── Workout patterns ──────────────────────────────────────────────────────────

def analyze_workout_consistency(workout_history: list[dict], days: int = 30) -> dict:
    """
    Computes workout frequency, missed day patterns, and volume trend.
    """
    if not workout_history:
        return {"workouts_per_week": 0, "completion_rate": 0.0, "missed_days": []}

    df = pd.DataFrame(workout_history)
    df["date"] = pd.to_datetime(df["date"])
    df = df[df["date"] >= pd.Timestamp.now() - pd.Timedelta(days=days)]

    total_planned = len(df)
    completed = int(df["is_completed"].sum()) if "is_completed" in df.columns else 0
    weeks = max(days / 7, 1)

    # Day-of-week skip pattern
    df["dow"] = df["date"].dt.day_name()
    all_dow = df["dow"].value_counts()
    skip_pattern = df[df["is_completed"] == False]["dow"].value_counts().to_dict() if total_planned > 0 else {}  # noqa: E712

    return {
        "workouts_per_week": round(total_planned / weeks, 1),
        "completion_rate": round(completed / total_planned, 2) if total_planned else 0,
        "commonly_skipped_day": max(skip_pattern, key=skip_pattern.get) if skip_pattern else None,
    }


# ── Calorie balance ───────────────────────────────────────────────────────────

def analyze_calorie_balance(tracking: list[dict], target_calories: Optional[int]) -> dict:
    """
    Checks if user is consistently above, below, or near calorie target.
    """
    if not tracking or not target_calories:
        return {"avg_calories": None, "deficit_surplus": None, "consistency": None}

    df = pd.DataFrame(tracking)
    df["calories"] = pd.to_numeric(df["calories"], errors="coerce")
    df = df.dropna(subset=["calories"])
    df = df[df["calories"] > 0]

    if len(df) < 3:
        return {"avg_calories": None, "deficit_surplus": None, "consistency": None}

    avg = float(df["calories"].mean())
    deficit = round(target_calories - avg, 1)
    consistency = round(1 - df["calories"].std() / avg, 2) if avg > 0 else 0

    return {
        "avg_calories": round(avg, 1),
        "target_calories": target_calories,
        "avg_deficit_surplus": deficit,
        "status": "deficit" if deficit > 0 else "surplus",
        "consistency_score": max(0.0, min(1.0, consistency)),
    }


# ── Consolidated pattern report ───────────────────────────────────────────────

def build_pattern_report(health_context: dict) -> dict:
    """
    Runs all pattern detectors and returns a unified report.
    This is passed to the reasoning engine as structured insight.
    """
    profile = health_context.get("profile", {})
    tracking = health_context.get("daily_tracking", [])
    weight = health_context.get("weight_logs", [])
    workouts = health_context.get("workout_history", [])

    return {
        "correlations": compute_correlations(tracking),
        "weight_trend": detect_weight_trend(weight),
        "energy_trend": detect_energy_trend(tracking),
        "workout_consistency": analyze_workout_consistency(workouts),
        "calorie_balance": analyze_calorie_balance(
            tracking, profile.get("daily_calories_target")
        ),
    }
