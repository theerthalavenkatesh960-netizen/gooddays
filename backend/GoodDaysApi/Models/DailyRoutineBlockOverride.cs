using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("daily_routine_block_overrides")]
public class DailyRoutineBlockOverride
{
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    [Column("date")]
    public DateOnly Date { get; set; }

    [Column("routine_id")]
    public int RoutineId { get; set; }
    public DailyRoutine Routine { get; set; } = null!;

    [Column("base_block_id")]
    public int? BaseBlockId { get; set; }
    public RoutineBlock? BaseBlock { get; set; }

    [Column("title")]
    public string? Title { get; set; }

    [Column("start_time")]
    public string? StartTime { get; set; }

    [Column("end_time")]
    public string? EndTime { get; set; }

    [Column("category")]
    public string? Category { get; set; }

    [Column("color")]
    public string? Color { get; set; }

    [Column("sort_order")]
    public int? SortOrder { get; set; }

    [Column("linked_workout_plan_id")]
    public int? LinkedWorkoutPlanId { get; set; }
    public WorkoutDayPlan? LinkedWorkoutPlan { get; set; }

    [Column("meal_type")]
    public string? MealType { get; set; }

    [Column("is_deleted")]
    public bool IsDeleted { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
