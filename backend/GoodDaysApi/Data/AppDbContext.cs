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
}
