"""
Health data fetcher — reads directly from GoodDays PostgreSQL tables.
Returns structured dicts ready for the reasoning and embedding layers.
"""
from datetime import date, timedelta
from typing import Optional
from app.db.connection import get_pool
import json


async def get_user_profile(user_id: int) -> dict:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT up.id, up.name, up.email,
                   hp.age, hp.gender, hp.height_cm, hp.weight_kg,
                   hp.target_weight_kg, hp.target_date, hp.daily_calories_target,
                   hp.diet_preference, hp.activity_level, hp.medical_conditions,
                   hp.budget_per_week,
                   ais.provider, ais.local_model, ais.claude_model
            FROM user_profiles up
            LEFT JOIN user_health_profiles hp ON hp.user_id = up.id
            LEFT JOIN user_ai_settings ais ON ais.user_id = up.id
            WHERE up.id = $1
            """,
            user_id,
        )
        return dict(row) if row else {}


async def get_daily_tracking(user_id: int, days: int = 90) -> list[dict]:
    pool = get_pool()
    since = date.today() - timedelta(days=days)
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT date, sleephours, workoutminutes, phoneminutes,
                   sunlight, mood, watercups, watergoalcups, calories, note
            FROM daily_tracking
            WHERE user_id = $1 AND date >= $2
            ORDER BY date DESC
            """,
            user_id, since,
        )
        return [dict(r) for r in rows]


async def get_weight_logs(user_id: int, days: int = 180) -> list[dict]:
    pool = get_pool()
    since = date.today() - timedelta(days=days)
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT date, weight_kg, note
            FROM body_weight_logs
            WHERE user_id = $1 AND date >= $2
            ORDER BY date DESC
            """,
            user_id, since,
        )
        return [dict(r) for r in rows]


async def get_workout_history(user_id: int, days: int = 90) -> list[dict]:
    """Returns workout days with per-exercise set details."""
    pool = get_pool()
    since = date.today() - timedelta(days=days)
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT wdp.date, wdp.day_label, wdp.is_completed, wdp.notes AS plan_notes,
                   ws.set_number, ws.reps, ws.weight_kg, ws.duration_seconds,
                   ws.is_completed AS set_done, ws.notes AS set_notes,
                   e.name AS exercise_name, e.muscle_group
            FROM workout_day_plans wdp
            LEFT JOIN workout_sets ws ON ws.workout_day_plan_id = wdp.id
            LEFT JOIN exercises e ON e.id = ws.exercise_id
            WHERE wdp.user_id = $1 AND wdp.date >= $2
            ORDER BY wdp.date DESC, ws.set_number ASC
            """,
            user_id, since,
        )
        # Group sets under each workout day
        days_map: dict = {}
        for r in rows:
            d = str(r["date"])
            if d not in days_map:
                days_map[d] = {
                    "date": d,
                    "day_label": r["day_label"],
                    "is_completed": r["is_completed"],
                    "notes": r["plan_notes"],
                    "exercises": [],
                }
            if r["exercise_name"]:
                days_map[d]["exercises"].append({
                    "name": r["exercise_name"],
                    "muscle_group": r["muscle_group"],
                    "set_number": r["set_number"],
                    "reps": r["reps"],
                    "weight_kg": float(r["weight_kg"]) if r["weight_kg"] else None,
                    "duration_s": r["duration_seconds"],
                    "done": r["set_done"],
                    "notes": r["set_notes"],
                })
        return list(days_map.values())


async def get_personal_records(user_id: int) -> list[dict]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT e.name AS exercise_name, e.muscle_group,
                   pr.max_weight_kg, pr.reps, pr.achieved_at
            FROM personal_records pr
            JOIN exercises e ON e.id = pr.exercise_id
            WHERE pr.user_id = $1
            ORDER BY pr.achieved_at DESC
            """,
            user_id,
        )
        return [dict(r) for r in rows]


async def get_meal_logs(user_id: int, days: int = 90) -> list[dict]:
    """Returns daily meal logs with macro totals resolved from ingredients."""
    pool = get_pool()
    since = date.today() - timedelta(days=days)
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT dml.date, dml.meal_ids_json,
                   mt.name AS meal_name, mt.timing,
                   mt.ingredients_json
            FROM daily_meal_logs dml
            CROSS JOIN LATERAL jsonb_array_elements_text(dml.meal_ids_json) mid(meal_id)
            JOIN meal_templates mt ON mt.id = mid.meal_id::int
            WHERE dml.user_id = $1 AND dml.date >= $2
            ORDER BY dml.date DESC
            """,
            user_id, since,
        )
        days_map: dict = {}
        for r in rows:
            d = str(r["date"])
            if d not in days_map:
                days_map[d] = {"date": d, "meals": []}
            ingredients = json.loads(r["ingredients_json"] or "[]")
            total_cal = sum(
                i.get("caloriesKcal", 0) * (i.get("qty", 1) / max(i.get("defaultQty", 1), 0.01))
                for i in ingredients
            )
            days_map[d]["meals"].append({
                "name": r["meal_name"],
                "timing": r["timing"],
                "estimated_calories": round(total_cal),
            })
        return list(days_map.values())


async def get_journal_entries(user_id: int, days: int = 60) -> list[dict]:
    pool = get_pool()
    since = date.today() - timedelta(days=days)
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT date, title, body, mood_tag
            FROM journal_entries
            WHERE user_id = $1 AND date >= $2
            ORDER BY date DESC
            """,
            user_id, since,
        )
        return [dict(r) for r in rows]


async def get_goals(user_id: int) -> list[dict]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT g.id, g.title, g.category, g.goal_type,
                   g.target_value, g.current_value, g.unit,
                   g.start_date, g.deadline_date, g.status,
                   (
                     SELECT json_agg(json_build_object(
                       'date', gdl.date, 'value', gdl.value_delta
                     ) ORDER BY gdl.date DESC)
                     FROM goal_daily_logs gdl WHERE gdl.goal_id = g.id
                     LIMIT 30
                   ) AS recent_logs
            FROM goals g
            WHERE g.user_id = $1
            ORDER BY g.status, g.deadline_date ASC NULLS LAST
            """,
            user_id,
        )
        return [dict(r) for r in rows]


async def get_routine_completion(user_id: int, days: int = 30) -> dict:
    """Returns per-day routine completion rates for the last N days."""
    pool = get_pool()
    since = date.today() - timedelta(days=days)
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT date,
                   COUNT(*) AS total_blocks,
                   SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
            FROM daily_routine_logs
            WHERE user_id = $1 AND date >= $2
            GROUP BY date
            ORDER BY date DESC
            """,
            user_id, since,
        )
        return {
            str(r["date"]): {
                "total": r["total_blocks"],
                "completed": r["completed"],
                "rate": round(r["completed"] / r["total_blocks"], 2) if r["total_blocks"] else 0,
            }
            for r in rows
        }


async def get_all_health_context(user_id: int) -> dict:
    """
    Aggregate all health data for a user in one call.
    Used by the reasoning engine to build comprehensive context.
    """
    profile, tracking, weight, workouts, prs, meals, journal, goals, routine = (
        await get_user_profile(user_id),
        await get_daily_tracking(user_id),
        await get_weight_logs(user_id),
        await get_workout_history(user_id),
        await get_personal_records(user_id),
        await get_meal_logs(user_id),
        await get_journal_entries(user_id),
        await get_goals(user_id),
        await get_routine_completion(user_id),
    )
    return {
        "profile": profile,
        "daily_tracking": tracking,
        "weight_logs": weight,
        "workout_history": workouts,
        "personal_records": prs,
        "meal_logs": meals,
        "journal_entries": journal,
        "goals": goals,
        "routine_completion": routine,
    }
