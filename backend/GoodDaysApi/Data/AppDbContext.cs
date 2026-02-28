using GoodDaysApi.Models;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }
    public DbSet<DailyTask> Tasks { get; set; }
    public DbSet<Expense> Expenses { get; set; }
    public DbSet<SelfCareActivity> SelfCareActivities { get; set; }
    public DbSet<ThesisEntry> ThesisEntries { get; set; }
    public DbSet<StudySession> StudySessions { get; set; }
    public DbSet<GamificationEntry> GamificationEntries { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // map entities to the names used in the Supabase migrations
        modelBuilder.Entity<User>().ToTable("user_profiles");
        modelBuilder.Entity<DailyTask>().ToTable("tasks");
        modelBuilder.Entity<Expense>().ToTable("expenses");
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

        modelBuilder.Entity<Expense>()
            .HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SelfCareActivity>()
            .HasOne(s => s.User)
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ThesisEntry>()
            .HasOne(t => t.User)
            .WithMany()
            .HasForeignKey(t => t.UserId)
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
