using GoodDaysApi.Models;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<DailyTask> Tasks { get; set; } = null!;
    public DbSet<Expense> Expenses { get; set; } = null!;
    public DbSet<ConnectedEmailAccount> ConnectedEmailAccounts { get; set; } = null!;
    public DbSet<SyncedEmail> SyncedEmails { get; set; } = null!;
    public DbSet<GamificationEntry> GamificationEntries { get; set; } = null!;
    public DbSet<DailyTracking> DailyTrackings { get; set; } = null!;
    public DbSet<DailyNote> DailyNotes { get; set; } = null!;

    // Financial Life Tracker entities
    public DbSet<FinancialGoal> FinancialGoals { get; set; } = null!;
    public DbSet<InvestmentBucket> InvestmentBuckets { get; set; } = null!;
    public DbSet<BucketContribution> BucketContributions { get; set; } = null!;
    public DbSet<FinanceBudgetProfile> FinanceBudgetProfiles { get; set; } = null!;
    public DbSet<FinanceFixedExpense> FinanceFixedExpenses { get; set; } = null!;
    public DbSet<MonthlyIncomeOverride> MonthlyIncomeOverrides { get; set; } = null!;
    public DbSet<MonthlyFixedExpenseOverride> MonthlyFixedExpenseOverrides { get; set; } = null!;
    public DbSet<MonthlyTask> MonthlyTasks { get; set; } = null!;
    public DbSet<MonthlyTaskCompletion> MonthlyTaskCompletions { get; set; } = null!;
    public DbSet<FinancialRule> FinancialRules { get; set; } = null!;
    public DbSet<MonthlySnapshot> MonthlySnapshots { get; set; } = null!;
    public DbSet<CreditCard> CreditCards { get; set; } = null!;
    public DbSet<CardExpense> CardExpenses { get; set; } = null!;

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
    public DbSet<GoalChecklistItem> GoalChecklistItems { get; set; } = null!;
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
    public DbSet<MasterMealTemplate> MasterMealTemplates { get; set; } = null!;
    public DbSet<WeeklyMealPlan> WeeklyMealPlans { get; set; } = null!;
    public DbSet<DailyMealLog> DailyMealLogs { get; set; } = null!;

    // Water tracking entities
    public DbSet<DailyWaterLog> DailyWaterLogs { get; set; } = null!;

    // Quick log entities
    public DbSet<QuickLogEntry> QuickLogEntries { get; set; } = null!;

    // Body metrics
    public DbSet<BodyWeightLog> BodyWeightLogs { get; set; } = null!;

    // AI planner entities
    public DbSet<UserAiSetting> UserAiSettings { get; set; } = null!;
    public DbSet<UserHealthProfile> UserHealthProfiles { get; set; } = null!;
    public DbSet<UserOnboarding> UserOnboardings { get; set; } = null!;

    // Vehicle tracker entities
    public DbSet<Vehicle> Vehicles { get; set; } = null!;
    public DbSet<VehicleRefill> VehicleRefills { get; set; } = null!;
    public DbSet<VehicleService> VehicleServices { get; set; } = null!;
    public DbSet<VehicleIssue> VehicleIssues { get; set; } = null!;

    // Daily routine entities
    public DbSet<DailyRoutine> DailyRoutines { get; set; } = null!;
    public DbSet<RoutineBlock> RoutineBlocks { get; set; } = null!;
    public DbSet<RoutineBlockTemplate> RoutineBlockTemplates { get; set; } = null!;
    public DbSet<RoutineBlockMealLink> RoutineBlockMealLinks { get; set; } = null!;
    public DbSet<WeeklyRoutineSchedule> WeeklyRoutineSchedules { get; set; } = null!;
    public DbSet<DailyRoutineLog> DailyRoutineLogs { get; set; } = null!;
    public DbSet<DailyRoutineSkip> DailyRoutineSkips { get; set; } = null!;
    public DbSet<DailyRoutineBlockOverride> DailyRoutineBlockOverrides { get; set; } = null!;
    public DbSet<DailyRoutineOverrideLog> DailyRoutineOverrideLogs { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>().ToTable("user_profiles");
        modelBuilder.Entity<DailyTask>().ToTable("tasks");
        modelBuilder.Entity<Expense>().ToTable("expenses");
        modelBuilder.Entity<ConnectedEmailAccount>().ToTable("connected_email_accounts");
        modelBuilder.Entity<SyncedEmail>().ToTable("synced_emails");
        modelBuilder.Entity<GamificationEntry>().ToTable("gamification_entries");
        modelBuilder.Entity<DailyTracking>().ToTable("daily_tracking");
        modelBuilder.Entity<DailyNote>().ToTable("daily_notes");

        // Financial Life Tracker table mappings
        modelBuilder.Entity<FinancialGoal>().ToTable("financial_goals");
        modelBuilder.Entity<InvestmentBucket>().ToTable("investment_buckets");
        modelBuilder.Entity<BucketContribution>().ToTable("bucket_contributions");
        modelBuilder.Entity<FinanceBudgetProfile>().ToTable("finance_budget_profiles");
        modelBuilder.Entity<FinanceFixedExpense>().ToTable("finance_fixed_expenses");
        modelBuilder.Entity<MonthlyIncomeOverride>().ToTable("finance_monthly_income_overrides");
        modelBuilder.Entity<MonthlyFixedExpenseOverride>().ToTable("finance_fixed_expense_overrides");
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
        modelBuilder.Entity<GoalChecklistItem>().ToTable("goal_checklist_items");
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
        modelBuilder.Entity<MasterMealTemplate>().ToTable("master_meal_templates");
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

        // AI planner table mappings
        modelBuilder.Entity<UserAiSetting>().ToTable("user_ai_settings");
        modelBuilder.Entity<UserHealthProfile>().ToTable("user_health_profiles");
        modelBuilder.Entity<UserOnboarding>().ToTable("user_onboarding");

        modelBuilder.Entity<UserAiSetting>()
            .HasOne(s => s.User)
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserAiSetting>()
            .HasIndex(s => s.UserId)
            .IsUnique();

        modelBuilder.Entity<UserHealthProfile>()
            .HasOne(p => p.User)
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserHealthProfile>()
            .HasIndex(p => p.UserId)
            .IsUnique();

        modelBuilder.Entity<UserOnboarding>()
            .HasOne(o => o.User)
            .WithMany()
            .HasForeignKey(o => o.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserOnboarding>()
            .HasIndex(o => o.UserId)
            .IsUnique();

        // Daily routine table mappings
        modelBuilder.Entity<DailyRoutine>().ToTable("daily_routines");
        modelBuilder.Entity<RoutineBlock>().ToTable("routine_blocks");
        modelBuilder.Entity<RoutineBlockTemplate>().ToTable("routine_block_templates");
        modelBuilder.Entity<RoutineBlockMealLink>().ToTable("routine_block_meal_links");
        modelBuilder.Entity<WeeklyRoutineSchedule>().ToTable("weekly_routine_schedule");
        modelBuilder.Entity<DailyRoutineLog>().ToTable("daily_routine_logs");
        modelBuilder.Entity<DailyRoutineSkip>().ToTable("daily_routine_skips");
        modelBuilder.Entity<DailyRoutineBlockOverride>().ToTable("daily_routine_block_overrides");
        modelBuilder.Entity<DailyRoutineOverrideLog>().ToTable("daily_routine_override_logs");

        modelBuilder.Entity<DailyRoutine>()
            .HasOne(r => r.User).WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<RoutineBlock>()
            .HasOne(b => b.Routine).WithMany(r => r.Blocks).HasForeignKey(b => b.RoutineId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<RoutineBlock>()
            .HasOne(b => b.LinkedWorkoutPlan).WithMany().HasForeignKey(b => b.LinkedWorkoutPlanId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<RoutineBlock>()
            .HasOne(b => b.Template).WithMany().HasForeignKey(b => b.TemplateId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<RoutineBlockTemplate>()
            .HasIndex(t => new { t.UserId, t.Title }).IsUnique();
        modelBuilder.Entity<RoutineBlockMealLink>()
            .HasOne(l => l.RoutineBlock).WithMany(b => b.MealLinks).HasForeignKey(l => l.RoutineBlockId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<RoutineBlockMealLink>()
            .HasOne(l => l.MealTemplate).WithMany().HasForeignKey(l => l.MealTemplateId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<RoutineBlockMealLink>()
            .HasIndex(l => new { l.RoutineBlockId, l.MealTemplateId }).IsUnique();
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
        modelBuilder.Entity<DailyRoutineBlockOverride>()
            .HasOne(o => o.User).WithMany().HasForeignKey(o => o.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<DailyRoutineBlockOverride>()
            .HasOne(o => o.Routine).WithMany().HasForeignKey(o => o.RoutineId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<DailyRoutineBlockOverride>()
            .HasOne(o => o.BaseBlock).WithMany().HasForeignKey(o => o.BaseBlockId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<DailyRoutineBlockOverride>()
            .HasOne(o => o.LinkedWorkoutPlan).WithMany().HasForeignKey(o => o.LinkedWorkoutPlanId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<DailyRoutineBlockOverride>()
            .HasIndex(o => new { o.UserId, o.Date, o.RoutineId, o.BaseBlockId });
        modelBuilder.Entity<DailyRoutineOverrideLog>()
            .HasOne(l => l.User).WithMany().HasForeignKey(l => l.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<DailyRoutineOverrideLog>()
            .HasOne(l => l.Override).WithMany().HasForeignKey(l => l.OverrideId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<DailyRoutineOverrideLog>()
            .HasIndex(l => new { l.UserId, l.OverrideId, l.Date }).IsUnique();

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

        modelBuilder.Entity<Expense>()
            .HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Expense>()
            .HasIndex(e => new { e.UserId, e.GmailMessageId })
            .HasDatabaseName("ix_expenses_user_gmail_message_id");

        modelBuilder.Entity<Expense>()
            .HasIndex(e => new { e.UserId, e.ExternalReference })
            .HasDatabaseName("ix_expenses_user_external_reference");

        modelBuilder.Entity<Expense>()
            .HasIndex(e => new { e.UserId, e.SourceType, e.IsReviewed })
            .HasDatabaseName("ix_expenses_user_source_reviewed");

        modelBuilder.Entity<ConnectedEmailAccount>()
            .HasOne(a => a.User)
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ConnectedEmailAccount>()
            .HasIndex(a => new { a.UserId, a.Provider })
            .IsUnique();

        modelBuilder.Entity<SyncedEmail>()
            .HasOne(s => s.User)
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SyncedEmail>()
            .HasIndex(s => new { s.UserId, s.GmailMessageId })
            .IsUnique();

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

        modelBuilder.Entity<BucketContribution>()
            .HasOne(c => c.Bucket)
            .WithMany(b => b.Contributions)
            .HasForeignKey(c => c.BucketId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<BucketContribution>()
            .HasIndex(c => new { c.BucketId, c.ContributionDate });

        modelBuilder.Entity<InvestmentBucket>()
            .HasOne(b => b.User)
            .WithMany()
            .HasForeignKey(b => b.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<InvestmentBucket>()
            .HasIndex(b => new { b.UserId, b.IsActive });

        modelBuilder.Entity<FinanceBudgetProfile>()
            .HasOne(p => p.User)
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<FinanceBudgetProfile>()
            .HasIndex(p => p.UserId)
            .IsUnique();

        modelBuilder.Entity<FinanceFixedExpense>()
            .HasOne(e => e.Profile)
            .WithMany(p => p.FixedExpenses)
            .HasForeignKey(e => e.ProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<FinanceFixedExpense>()
            .HasIndex(e => new { e.ProfileId, e.SortOrder });

        modelBuilder.Entity<MonthlyIncomeOverride>()
            .HasOne(o => o.Profile)
            .WithMany(p => p.MonthlyIncomeOverrides)
            .HasForeignKey(o => o.ProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<MonthlyIncomeOverride>()
            .HasIndex(o => new { o.ProfileId, o.Month, o.Year })
            .IsUnique();

        modelBuilder.Entity<MonthlyFixedExpenseOverride>()
            .HasOne(o => o.FixedExpense)
            .WithMany(e => e.MonthlyOverrides)
            .HasForeignKey(o => o.FixedExpenseId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<MonthlyFixedExpenseOverride>()
            .HasIndex(o => new { o.FixedExpenseId, o.Month, o.Year })
            .IsUnique();

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
        modelBuilder.Entity<GoalChecklistItem>()
            .HasOne(i => i.Goal).WithMany(g => g.ChecklistItems).HasForeignKey(i => i.GoalId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<GoalChecklistItem>()
            .HasIndex(i => new { i.GoalId, i.Position });
        modelBuilder.Entity<GoalChecklistItem>()
            .HasIndex(i => new { i.GoalId, i.IsCompleted });
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

        // Vehicle tracker table mappings
        modelBuilder.Entity<Vehicle>().ToTable("vehicles");
        modelBuilder.Entity<VehicleRefill>().ToTable("vehicle_refills");
        modelBuilder.Entity<VehicleService>().ToTable("vehicle_services");
        modelBuilder.Entity<VehicleIssue>().ToTable("vehicle_issues");

        // Vehicle relationships
        modelBuilder.Entity<VehicleRefill>()
            .HasOne(r => r.Vehicle).WithMany(v => v.Refills).HasForeignKey(r => r.VehicleId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<VehicleService>()
            .HasOne(s => s.Vehicle).WithMany(v => v.Services).HasForeignKey(s => s.VehicleId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<VehicleIssue>()
            .HasOne(i => i.Vehicle).WithMany(v => v.Issues).HasForeignKey(i => i.VehicleId).OnDelete(DeleteBehavior.Cascade);
    }
}
