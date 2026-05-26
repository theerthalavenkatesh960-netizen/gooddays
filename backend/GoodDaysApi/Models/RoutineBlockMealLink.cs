using System.ComponentModel.DataAnnotations.Schema;

namespace GoodDaysApi.Models;

[Table("routine_block_meal_links")]
public class RoutineBlockMealLink
{
    [Column("id")]
    public int Id { get; set; }

    [Column("routine_block_id")]
    public int RoutineBlockId { get; set; }
    public RoutineBlock RoutineBlock { get; set; } = null!;

    [Column("meal_template_id")]
    public int MealTemplateId { get; set; }
    public MealTemplate MealTemplate { get; set; } = null!;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
