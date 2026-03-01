using GoodDaysApi.Models;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }
    public DbSet<DailyTask> Tasks { get; set; }
    public DbSet<Expense> Expenses { get; set; }
    // legacy name kept for compatibility; primary table is SelfCareLogs
    public DbSet<SelfCareLog> SelfCareLogs { get; set; }
    public DbSet<StudySession> StudySessions { get; set; }
    public DbSet<GamificationEntry> GamificationEntries { get; set; }
    public DbSet<SelfCareTemplate> SelfCareTemplates { get; set; }
    public DbSet<DailyTracking> DailyTrackings { get; set; }
    public DbSet<DailyNote> DailyNotes { get; set; }
    // Thesis system new tables
    public DbSet<ThesisProtocol> ThesisProtocols { get; set; }
    public DbSet<ThesisPatient> ThesisPatients { get; set; }
    public DbSet<ThesisFollowup> ThesisFollowups { get; set; }
    public DbSet<ThesisDocument> ThesisDocuments { get; set; }
    public DbSet<ThesisDeadline> ThesisDeadlines { get; set; }
    public DbSet<StudyGroup> StudyGroups { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // map entities to the names used in the Supabase migrations
        modelBuilder.Entity<User>().ToTable("user_profiles");
        modelBuilder.Entity<DailyTask>().ToTable("tasks");
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
        // other entities follow default pluralization unless you need a custom name

        // ensure emails are unique for login
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Email).IsRequired();
            entity.Property(u => u.PasswordHash).IsRequired();
        });

        // configure relationships to User with cascade deletes
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

        // configure thesis relationships
        modelBuilder.Entity<ThesisPatient>()
            .HasMany(p => p.Followups)
            .WithOne(f => f.Patient)
            .HasForeignKey(f => f.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

        // also configure the inverse explicitly to avoid EF generating a shadow property
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
    }
}
