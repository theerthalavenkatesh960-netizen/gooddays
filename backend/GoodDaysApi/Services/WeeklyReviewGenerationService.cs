using GoodDaysApi.Data;
using GoodDaysApi.Models;
using Microsoft.EntityFrameworkCore;

namespace GoodDaysApi.Services;

public class WeeklyReviewGenerationService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<WeeklyReviewGenerationService> _logger;

    public WeeklyReviewGenerationService(
        IServiceProvider serviceProvider,
        ILogger<WeeklyReviewGenerationService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var nowUtc = DateTime.UtcNow;

            // IST = UTC+5:30. Sunday 20:00 IST = Sunday 14:30 UTC.
            // Fire when UTC time is Sunday 14:xx (i.e. 14:30–15:00 IST window).
            if (nowUtc.DayOfWeek == DayOfWeek.Sunday && nowUtc.Hour == 14 && nowUtc.Minute >= 30)
            {
                await GenerateForAllUsersAsync(nowUtc.Date, stoppingToken);
                // Sleep 2 h to avoid re-firing in the same window
                await Task.Delay(TimeSpan.FromHours(2), stoppingToken);
            }

            await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken);
        }
    }

    private async Task GenerateForAllUsersAsync(DateTime runDateUtc, CancellationToken ct)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        try
        {
            var weekStart = ResolveWeekStart(runDateUtc);
            var users = await db.Users.AsNoTracking().Select(u => u.Id).ToListAsync(ct);

            foreach (var userId in users)
            {
                ct.ThrowIfCancellationRequested();
                await GenerateForUserAsync(db, userId, weekStart, ct);
            }

            await db.SaveChangesAsync(ct);
            _logger.LogInformation("Weekly reviews generated (IST schedule) for week starting {WeekStart}", weekStart.ToString("yyyy-MM-dd"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate scheduled weekly reviews");
        }
    }

    private async Task GenerateForUserAsync(AppDbContext db, int userId, DateTime weekStart, CancellationToken ct)
    {
        try
        {
            var weekEnd = weekStart.AddDays(7);

            var tasksCompleted = await db.Tasks
                .Where(t => t.UserId == userId && t.CompletedAt >= weekStart && t.CompletedAt < weekEnd)
                .CountAsync(ct);
            var workoutDays = await db.WorkoutDayPlans
                .Where(p => p.UserId == userId && p.Date >= weekStart && p.Date < weekEnd && p.IsCompleted)
                .CountAsync(ct);
            var moodAvg = await db.DailyTrackings
                .Where(t => t.UserId == userId && t.Date >= weekStart && t.Date < weekEnd)
                .Select(t => (decimal?)t.Mood)
                .AverageAsync(ct) ?? 0;
            var totalSpend = await db.Expenses
                .Where(e => e.UserId == userId && e.Date >= weekStart && e.Date < weekEnd)
                .SumAsync(e => (decimal?)e.Amount, ct) ?? 0;

            var review = await db.WeeklyReviews
                .FirstOrDefaultAsync(w => w.UserId == userId && w.WeekStartDate == weekStart, ct);

            if (review is null)
            {
                review = new WeeklyReview
                {
                    UserId = userId,
                    WeekStartDate = weekStart,
                    CreatedAt = DateTime.UtcNow,
                };
                db.WeeklyReviews.Add(review);
            }

            review.TasksCompleted = tasksCompleted;
            review.WorkoutDays = workoutDays;
            review.MoodAvg = Math.Round(moodAvg, 1);
            review.TotalSpend = totalSpend;
            review.StudyHours = review.StudyHours;
            review.UpdatedAt = DateTime.UtcNow;

            _logger.LogInformation("Generated weekly review for user {UserId}, week {WeekStart}", userId, weekStart.ToString("yyyy-MM-dd"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate weekly review for user {UserId}", userId);
        }
    }

    private static DateTime ResolveWeekStart(DateTime date)
    {
        var dayOfWeek = (int)date.DayOfWeek;
        return date.AddDays(dayOfWeek == 0 ? -6 : -(dayOfWeek - 1));
    }
}
