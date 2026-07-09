namespace GoodDaysApi.Services.Ai;

public interface IAiToolsRegistry
{
    List<Tool> GetAvailableTools();
}

public class AiToolsRegistry : IAiToolsRegistry
{
    public List<Tool> GetAvailableTools()
    {
        return new List<Tool>
        {
            // ===== GOALS =====
            new Tool
            {
                Name = "create_goal",
                Description = "Create a new goal (one-time or recurring)",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>
                    {
                        ["title"] = new PropertyDef { Type = "string", Description = "Goal title" },
                        ["target"] = new PropertyDef { Type = "number", Description = "Target value" },
                        ["unit"] = new PropertyDef { Type = "string", Description = "Unit (pages, kg, reps, etc)" },
                        ["category"] = new PropertyDef { Type = "string", Description = "Category (Health, Career, Personal, etc)" },
                        ["recurring"] = new PropertyDef { Type = "boolean", Description = "Is it recurring?" },
                        ["interval"] = new PropertyDef { Type = "string", Description = "Interval if recurring (daily, weekly, monthly)" },
                        ["deadline"] = new PropertyDef { Type = "string", Description = "Deadline date (YYYY-MM-DD)" }
                    }
                }
            },
            new Tool
            {
                Name = "update_goal_progress",
                Description = "Update progress on a goal",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>
                    {
                        ["goal_id"] = new PropertyDef { Type = "number", Description = "Goal ID" },
                        ["progress_value"] = new PropertyDef { Type = "number", Description = "New progress value" }
                    }
                }
            },
            new Tool
            {
                Name = "list_goals",
                Description = "Get user's goals",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>
                    {
                        ["filter"] = new PropertyDef { Type = "string", Description = "Filter: recurring, one-time, or all" }
                    }
                }
            },

            // ===== MEALS & INGREDIENTS =====
            new Tool
            {
                Name = "create_meal_template",
                Description = "Create a new meal template",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>
                    {
                        ["name"] = new PropertyDef { Type = "string", Description = "Meal name" },
                        ["ingredients"] = new PropertyDef { Type = "array", Description = "List of ingredients" },
                        ["calories"] = new PropertyDef { Type = "number", Description = "Total calories (optional)" }
                    }
                }
            },
            new Tool
            {
                Name = "log_meal",
                Description = "Log a meal entry",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>
                    {
                        ["meal_name"] = new PropertyDef { Type = "string", Description = "Meal name" },
                        ["date"] = new PropertyDef { Type = "string", Description = "Date (YYYY-MM-DD)" },
                        ["calories"] = new PropertyDef { Type = "number", Description = "Calories (optional)" }
                    }
                }
            },
            new Tool
            {
                Name = "add_ingredient",
                Description = "Add a new ingredient to library",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>
                    {
                        ["name"] = new PropertyDef { Type = "string", Description = "Ingredient name" },
                        ["calories_per_100g"] = new PropertyDef { Type = "number", Description = "Calories per 100g" },
                        ["protein_g"] = new PropertyDef { Type = "number", Description = "Protein in grams" },
                        ["carbs_g"] = new PropertyDef { Type = "number", Description = "Carbs in grams" },
                        ["fat_g"] = new PropertyDef { Type = "number", Description = "Fat in grams" }
                    }
                }
            },
            new Tool
            {
                Name = "analyze_nutrition",
                Description = "Analyze nutrition for a time period",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>
                    {
                        ["start_date"] = new PropertyDef { Type = "string", Description = "Start date (YYYY-MM-DD)" },
                        ["end_date"] = new PropertyDef { Type = "string", Description = "End date (YYYY-MM-DD)" }
                    }
                }
            },

            // ===== WORKOUTS & EXERCISES =====
            new Tool
            {
                Name = "create_exercise",
                Description = "Add new exercise to library",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>
                    {
                        ["name"] = new PropertyDef { Type = "string", Description = "Exercise name" },
                        ["category"] = new PropertyDef { Type = "string", Description = "Category (chest, back, legs, etc)" }
                    }
                }
            },
            new Tool
            {
                Name = "log_workout",
                Description = "Log a workout session",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>
                    {
                        ["exercise_name"] = new PropertyDef { Type = "string", Description = "Exercise name" },
                        ["date"] = new PropertyDef { Type = "string", Description = "Date (YYYY-MM-DD)" },
                        ["sets"] = new PropertyDef { Type = "number", Description = "Number of sets" },
                        ["reps"] = new PropertyDef { Type = "number", Description = "Reps per set" },
                        ["weight_kg"] = new PropertyDef { Type = "number", Description = "Weight in kg (optional)" },
                        ["duration_minutes"] = new PropertyDef { Type = "number", Description = "Duration in minutes (optional)" }
                    }
                }
            },
            new Tool
            {
                Name = "log_personal_record",
                Description = "Record a new personal record",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>
                    {
                        ["exercise_name"] = new PropertyDef { Type = "string", Description = "Exercise name" },
                        ["weight_kg"] = new PropertyDef { Type = "number", Description = "Weight in kg" },
                        ["reps"] = new PropertyDef { Type = "number", Description = "Reps achieved" }
                    }
                }
            },
            new Tool
            {
                Name = "analyze_workout",
                Description = "Analyze workout performance and trends",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>
                    {
                        ["days_back"] = new PropertyDef { Type = "number", Description = "Analyze last N days" }
                    }
                }
            },

            // ===== DAILY TRACKING =====
            new Tool
            {
                Name = "log_daily_metrics",
                Description = "Log daily metrics (sleep, workout, mood, water, etc)",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>
                    {
                        ["date"] = new PropertyDef { Type = "string", Description = "Date (YYYY-MM-DD)" },
                        ["sleep_hours"] = new PropertyDef { Type = "number", Description = "Hours of sleep" },
                        ["workout_minutes"] = new PropertyDef { Type = "number", Description = "Workout minutes" },
                        ["mood"] = new PropertyDef { Type = "number", Description = "Mood 1-10" },
                        ["water_cups"] = new PropertyDef { Type = "number", Description = "Cups of water" },
                        ["calories"] = new PropertyDef { Type = "number", Description = "Calories consumed" }
                    }
                }
            },
            new Tool
            {
                Name = "get_daily_summary",
                Description = "Get daily metrics summary",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>
                    {
                        ["date"] = new PropertyDef { Type = "string", Description = "Date (YYYY-MM-DD)" }
                    }
                }
            },
            new Tool
            {
                Name = "analyze_metrics",
                Description = "Analyze trends in daily metrics",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>
                    {
                        ["metric_type"] = new PropertyDef { Type = "string", Description = "sleep, mood, workout, or all" },
                        ["days_back"] = new PropertyDef { Type = "number", Description = "Analyze last N days" }
                    }
                }
            },

            // ===== JOURNAL & NOTES =====
            new Tool
            {
                Name = "add_journal_entry",
                Description = "Write a journal entry",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>
                    {
                        ["content"] = new PropertyDef { Type = "string", Description = "Journal content" },
                        ["date"] = new PropertyDef { Type = "string", Description = "Date (YYYY-MM-DD)" },
                        ["mood"] = new PropertyDef { Type = "number", Description = "Mood 1-10 (optional)" }
                    }
                }
            },
            new Tool
            {
                Name = "analyze_journal",
                Description = "Analyze mood and themes in journal entries",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>
                    {
                        ["days_back"] = new PropertyDef { Type = "number", Description = "Analyze last N days" }
                    }
                }
            },

            // ===== EXPENSES & FINANCE =====
            new Tool
            {
                Name = "log_expense",
                Description = "Log an expense",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>
                    {
                        ["amount"] = new PropertyDef { Type = "number", Description = "Amount in currency" },
                        ["category"] = new PropertyDef { Type = "string", Description = "Category (food, transport, health, etc)" },
                        ["description"] = new PropertyDef { Type = "string", Description = "Description" },
                        ["date"] = new PropertyDef { Type = "string", Description = "Date (YYYY-MM-DD)" }
                    }
                }
            },
            new Tool
            {
                Name = "analyze_spending",
                Description = "Analyze spending patterns by category",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>
                    {
                        ["period"] = new PropertyDef { Type = "string", Description = "daily, weekly, monthly, or year" }
                    }
                }
            },
            new Tool
            {
                Name = "get_financial_summary",
                Description = "Get financial overview",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>
                    {
                        ["period"] = new PropertyDef { Type = "string", Description = "daily, weekly, or monthly" }
                    }
                }
            },

            // ===== BODY METRICS =====
            new Tool
            {
                Name = "log_body_weight",
                Description = "Log body weight",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>
                    {
                        ["weight_kg"] = new PropertyDef { Type = "number", Description = "Weight in kg" },
                        ["date"] = new PropertyDef { Type = "string", Description = "Date (YYYY-MM-DD)" }
                    }
                }
            },
            new Tool
            {
                Name = "analyze_body_progress",
                Description = "Analyze progress towards weight/fitness goals",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>
                    {
                        ["days_back"] = new PropertyDef { Type = "number", Description = "Analyze last N days" }
                    }
                }
            },

            // ===== ANALYSIS & INSIGHTS =====
            new Tool
            {
                Name = "get_weekly_stats",
                Description = "Get weekly statistics across all metrics",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>()
                }
            },
            new Tool
            {
                Name = "get_monthly_stats",
                Description = "Get monthly statistics",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>()
                }
            },
            new Tool
            {
                Name = "get_insights",
                Description = "Get AI-generated insights from user data",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>()
                }
            },
            new Tool
            {
                Name = "get_current_status",
                Description = "Get current status of all goals and metrics",
                InputSchema = new InputSchema
                {
                    Properties = new Dictionary<string, PropertyDef>()
                }
            }
        };
    }
}
