using GoodDaysApi.Models;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<DailyTask> Tasks { get; set; } = null!;
    public DbSet<Expense> Expenses { get; set; } = null!;
    public DbSet<SelfCareLog> SelfCareLogs { get; set; } = null!;
    public DbSet<SelfCareTemplate> SelfCareTemplates { get; set; } = null!;
    public DbSet<StudySession> StudySessions { get; set; } = null!;
    public DbSet<GamificationEntry> GamificationEntries { get; set; } = null!;
    public DbSet<DailyTracking> DailyTrackings { get; set; } = null!;
    public DbSet<DailyNote> DailyNotes { get; set; } = null!;

    // Financial Life Tracker entities
    public DbSet<FinancialGoal> FinancialGoals { get; set; } = null!;
    public DbSet<InvestmentBucket> InvestmentBuckets { get; set; } = null!;
    public DbSet<MonthlyTask> MonthlyTasks { get; set; } = null!;
    public DbSet<MonthlyTaskCompletion> MonthlyTaskCompletions { get; set; } = null!;
    public DbSet<FinancialRule> FinancialRules { get; set; } = null!;
    public DbSet<MonthlySnapshot> MonthlySnapshots { get; set; } = null!;

    // Workout tracker entities
    public DbSet<Exercise> Exercises { get; set; } = null!;
    public DbSet<WorkoutSplitPreset> WorkoutSplitPresets { get; set; } = null!;
    public DbSet<WorkoutDayPlan> WorkoutDayPlans { get; set; } = null!;
    public DbSet<WorkoutSet> WorkoutSets { get; set; } = null!;
    public DbSet<WorkoutDayImage> WorkoutDayImages { get; set; } = null!;
    public DbSet<PersonalRecord> PersonalRecords { get; set; } = null!;

    // Goal tracker entities
    public DbSet<Goal> Goals { get; set; } = null!;
    public DbSet<GoalNote> GoalNotes { get; set; } = null!;
    public DbSet<GoalDailyLog> GoalDailyLogs { get; set; } = null!;
    public DbSet<Flashcard> Flashcards { get; set; } = null!;

    // Reminder entities
    public DbSet<Reminder> Reminders { get; set; } = null!;
    public DbSet<ReminderLog> ReminderLogs { get; set; } = null!;

    // Journal entities
    public DbSet<JournalEntry> JournalEntries { get; set; } = null!;

    // Weekly Review entities
    public DbSet<WeeklyReview> WeeklyReviews { get; set; } = null!;

    // Meal planner entities
    public DbSet<MealIngredient> MealIngredients { get; set; } = null!;
    public DbSet<MealTemplate> MealTemplates { get; set; } = null!;
    public DbSet<WeeklyMealPlan> WeeklyMealPlans { get; set; } = null!;
    public DbSet<DailyMealLog> DailyMealLogs { get; set; } = null!;

    // Water tracking entities
    public DbSet<DailyWaterLog> DailyWaterLogs { get; set; } = null!;

    // Quick log entities
    public DbSet<QuickLogEntry> QuickLogEntries { get; set; } = null!;

    // Daily routine entities
    public DbSet<DailyRoutine> DailyRoutines { get; set; } = null!;
    public DbSet<RoutineBlock> RoutineBlocks { get; set; } = null!;
    public DbSet<WeeklyRoutineSchedule> WeeklyRoutineSchedules { get; set; } = null!;
    public DbSet<DailyRoutineLog> DailyRoutineLogs { get; set; } = null!;
    public DbSet<DailyRoutineSkip> DailyRoutineSkips { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>().ToTable("user_profiles");
        modelBuilder.Entity<DailyTask>().ToTable("tasks");
        modelBuilder.Entity<Expense>().ToTable("expenses");
        modelBuilder.Entity<SelfCareLog>().ToTable("self_care_logs");
        modelBuilder.Entity<SelfCareTemplate>().ToTable("self_care_template");
        modelBuilder.Entity<StudySession>().ToTable("study_sessions");
        modelBuilder.Entity<GamificationEntry>().ToTable("gamification_entries");
        modelBuilder.Entity<DailyTracking>().ToTable("daily_tracking");
        modelBuilder.Entity<DailyNote>().ToTable("daily_notes");

        // Financial Life Tracker table mappings
        modelBuilder.Entity<FinancialGoal>().ToTable("financial_goals");
        modelBuilder.Entity<InvestmentBucket>().ToTable("investment_buckets");
        modelBuilder.Entity<MonthlyTask>().ToTable("monthly_tasks");
        modelBuilder.Entity<MonthlyTaskCompletion>().ToTable("monthly_task_completions");
        modelBuilder.Entity<FinancialRule>().ToTable("financial_rules");
        modelBuilder.Entity<MonthlySnapshot>().ToTable("monthly_snapshots");

        // Workout tracker table mappings
        modelBuilder.Entity<Exercise>().ToTable("exercises");
        modelBuilder.Entity<WorkoutSplitPreset>().ToTable("workout_split_presets");
        modelBuilder.Entity<WorkoutDayPlan>().ToTable("workout_day_plans");
        modelBuilder.Entity<WorkoutSet>().ToTable("workout_sets");
        modelBuilder.Entity<WorkoutDayImage>().ToTable("workout_day_images");
        modelBuilder.Entity<PersonalRecord>().ToTable("personal_records");

        // Goal tracker table mappings
        modelBuilder.Entity<Goal>().ToTable("goals");
        modelBuilder.Entity<GoalNote>().ToTable("goal_notes");
        modelBuilder.Entity<GoalDailyLog>().ToTable("goal_daily_logs");
        modelBuilder.Entity<Flashcard>().ToTable("flashcards");

        // Reminder table mappings
        modelBuilder.Entity<Reminder>().ToTable("reminders");
        modelBuilder.Entity<ReminderLog>().ToTable("reminder_logs");

        // Journal & Weekly Review table mappings
        modelBuilder.Entity<JournalEntry>().ToTable("journal_entries");
        modelBuilder.Entity<WeeklyReview>().ToTable("weekly_reviews");

        // Meal planner table mappings
        modelBuilder.Entity<MealIngredient>().ToTable("meal_ingredients");
        modelBuilder.Entity<MealTemplate>().ToTable("meal_templates");
        modelBuilder.Entity<WeeklyMealPlan>().ToTable("weekly_meal_plans");
        modelBuilder.Entity<DailyMealLog>().ToTable("daily_meal_logs");
        modelBuilder.Entity<DailyMealLog>()
            .HasIndex(m => new { m.UserId, m.Date }).IsUnique();

        // Water tracking table mappings
        modelBuilder.Entity<DailyWaterLog>().ToTable("daily_water_logs");
        modelBuilder.Entity<DailyWaterLog>()
            .HasIndex(w => new { w.UserId, w.Date }).IsUnique();

        // Quick log table mappings
        modelBuilder.Entity<QuickLogEntry>().ToTable("quick_log_entries");

        // Daily routine table mappings
        modelBuilder.Entity<DailyRoutine>().ToTable("daily_routines");
        modelBuilder.Entity<RoutineBlock>().ToTable("routine_blocks");
        modelBuilder.Entity<WeeklyRoutineSchedule>().ToTable("weekly_routine_schedule");
        modelBuilder.Entity<DailyRoutineLog>().ToTable("daily_routine_logs");
        modelBuilder.Entity<DailyRoutineSkip>().ToTable("daily_routine_skips");

        modelBuilder.Entity<DailyRoutine>()
            .HasOne(r => r.User).WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<RoutineBlock>()
            .HasOne(b => b.Routine).WithMany(r => r.Blocks).HasForeignKey(b => b.RoutineId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<WeeklyRoutineSchedule>()
            .HasOne(s => s.User).WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<WeeklyRoutineSchedule>()
            .HasOne(s => s.Routine).WithMany().HasForeignKey(s => s.RoutineId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<WeeklyRoutineSchedule>()
            .HasIndex(s => new { s.UserId, s.DayOfWeek }).IsUnique();
        modelBuilder.Entity<DailyRoutineLog>()
            .HasOne(l => l.User).WithMany().HasForeignKey(l => l.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<DailyRoutineLog>()
            .HasOne(l => l.RoutineBlock).WithMany().HasForeignKey(l => l.RoutineBlockId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<DailyRoutineLog>()
            .HasIndex(l => new { l.UserId, l.RoutineBlockId, l.Date }).IsUnique();
        modelBuilder.Entity<DailyRoutineSkip>()
            .HasOne(s => s.User).WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<DailyRoutineSkip>()
            .HasIndex(s => new { s.UserId, s.Date }).IsUnique();

        // Ensure emails are unique for login
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Email).IsRequired();
            entity.Property(u => u.PasswordHash).IsRequired();
        });

        // Configure relationships to User with cascade deletes
        modelBuilder.Entity<DailyTask>()
            .HasOne(d => d.User)
            .WithMany()
            .HasForeignKey(d => d.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SelfCareTemplate>()
            .HasOne(t => t.User)
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SelfCareLog>()
            .HasOne(s => s.User)
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Expense>()
            .HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StudySession>()
            .HasOne(s => s.User)
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<GamificationEntry>()
            .HasOne(g => g.User)
            .WithMany()
            .HasForeignKey(g => g.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configure Financial Life Tracker relationships
        modelBuilder.Entity<MonthlyTask>()
            .HasOne(t => t.Bucket)
            .WithMany(b => b.Tasks)
            .HasForeignKey(t => t.BucketId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<MonthlyTaskCompletion>()
            .HasOne(c => c.Task)
            .WithMany(t => t.Completions)
            .HasForeignKey(c => c.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        // Unique constraint for monthly snapshots
        modelBuilder.Entity<MonthlySnapshot>()
            .HasIndex(s => new { s.Month, s.Year })
            .IsUnique();

        // Unique constraint for task completions per month
        modelBuilder.Entity<MonthlyTaskCompletion>()
            .HasIndex(c => new { c.TaskId, c.Month, c.Year })
            .IsUnique();

        // Workout relationships
        modelBuilder.Entity<WorkoutDayPlan>()
            .HasOne(w => w.User).WithMany().HasForeignKey(w => w.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<WorkoutSet>()
            .HasOne(s => s.WorkoutDayPlan).WithMany(p => p.Sets).HasForeignKey(s => s.WorkoutDayPlanId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<WorkoutDayImage>()
            .HasOne(i => i.WorkoutDayPlan).WithMany(p => p.Images).HasForeignKey(i => i.WorkoutDayPlanId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<PersonalRecord>()
            .HasIndex(pr => new { pr.UserId, pr.ExerciseId }).IsUnique();

        // Goal relationships
        modelBuilder.Entity<Goal>()
            .HasOne(g => g.User).WithMany().HasForeignKey(g => g.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<GoalNote>()
            .HasOne(n => n.Goal).WithMany(g => g.Notes).HasForeignKey(n => n.GoalId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<GoalDailyLog>()
            .HasOne(l => l.Goal).WithMany(g => g.DailyLogs).HasForeignKey(l => l.GoalId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<GoalDailyLog>()
            .HasIndex(l => new { l.GoalId, l.Date }).IsUnique();
        modelBuilder.Entity<Flashcard>()
            .HasOne(f => f.Goal).WithMany(g => g.Flashcards).HasForeignKey(f => f.GoalId).OnDelete(DeleteBehavior.Cascade);

        // Reminder relationships
        modelBuilder.Entity<Reminder>()
            .HasOne(r => r.User).WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ReminderLog>()
            .HasOne(l => l.Reminder).WithMany(r => r.Logs).HasForeignKey(l => l.ReminderId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ReminderLog>()
            .HasIndex(l => new { l.ReminderId, l.Date }).IsUnique();

        // Journal & Weekly Review
        modelBuilder.Entity<JournalEntry>()
            .HasOne(j => j.User).WithMany().HasForeignKey(j => j.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<WeeklyReview>()
            .HasOne(w => w.User).WithMany().HasForeignKey(w => w.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<WeeklyReview>()
            .HasIndex(w => new { w.UserId, w.WeekStartDate }).IsUnique();
    }
}
