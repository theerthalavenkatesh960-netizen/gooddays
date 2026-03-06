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
    public DbSet<ThesisPatient> ThesisPatients { get; set; } = null!;
    public DbSet<ThesisProtocol> ThesisProtocols { get; set; } = null!;
    public DbSet<ThesisFollowup> ThesisFollowups { get; set; } = null!;
    public DbSet<ThesisDocument> ThesisDocuments { get; set; } = null!;
    public DbSet<ThesisDeadline> ThesisDeadlines { get; set; } = null!;
    public DbSet<StudyGroup> StudyGroups { get; set; } = null!;
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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Existing table mappings
        modelBuilder.Entity<User>().ToTable("users");
        modelBuilder.Entity<DailyTask>().ToTable("daily_tasks");
        modelBuilder.Entity<Expense>().ToTable("expenses");
        modelBuilder.Entity<SelfCareLog>().ToTable("self_care_logs");
        modelBuilder.Entity<SelfCareTemplate>().ToTable("self_care_template");
        modelBuilder.Entity<StudySession>().ToTable("study_sessions");
        modelBuilder.Entity<ThesisPatient>().ToTable("thesis_patients");
        modelBuilder.Entity<ThesisProtocol>().ToTable("thesis_protocols");
        modelBuilder.Entity<ThesisFollowup>().ToTable("thesis_followups");
        modelBuilder.Entity<ThesisDocument>().ToTable("thesis_documents");
        modelBuilder.Entity<ThesisDeadline>().ToTable("thesis_deadlines");
        modelBuilder.Entity<StudyGroup>().ToTable("study_groups");
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

        modelBuilder.Entity<ThesisPatient>()
            .HasOne(p => p.User)
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configure thesis relationships
        modelBuilder.Entity<ThesisPatient>()
            .HasMany(p => p.Followups)
            .WithOne(f => f.Patient)
            .HasForeignKey(f => f.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ThesisFollowup>()
            .HasOne(f => f.Patient)
            .WithMany(p => p.Followups)
            .HasForeignKey(f => f.PatientId)
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
    }
}
