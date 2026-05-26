using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("routine_blocks")]
public class RoutineBlock
{
    [Column("id")]
    public int Id { get; set; }

    [Column("routine_id")]
    public int RoutineId { get; set; }
    public DailyRoutine Routine { get; set; } = null!;

    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Column("start_time")]
    public string StartTime { get; set; } = "09:00";

    [Column("end_time")]
    public string EndTime { get; set; } = "10:00";

    [Column("category")]
    public string? Category { get; set; }

    [Column("color")]
    public string? Color { get; set; }

    [Column("sort_order")]
    public int SortOrder { get; set; } = 0;

    [Column("linked_workout_plan_id")]
    public int? LinkedWorkoutPlanId { get; set; }
    public WorkoutDayPlan? LinkedWorkoutPlan { get; set; }

    [Column("meal_type")]
    public string? MealType { get; set; }

    [Column("template_id")]
    public int? TemplateId { get; set; }
    public RoutineBlockTemplate? Template { get; set; }

    public List<RoutineBlockMealLink> MealLinks { get; set; } = new();

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
