using GoodDaysApi.Data;
using GoodDaysApi.DTOs.Financial;
using GoodDaysApi.Models;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace GoodDaysApi.Services.Financial;

public class FinancialService : IFinancialService
{
    private readonly AppDbContext _db;

    public FinancialService(AppDbContext db)
    {
        _db = db;
    }

    // ========== BUCKETS ==========
    public async Task<List<FinancialBucketDto>> GetAllBucketsAsync(int userId = 0)
    {
        var now = DateTime.UtcNow;
        var currentMonth = now.Month;
        var currentYear = now.Year;

        var buckets = await _db.InvestmentBuckets
            .Where(b => b.IsActive && (userId <= 0 || b.UserId == userId))
            .Include(b => b.Tasks.Where(t => t.IsActive))
            .Include(b => b.Contributions)
            .OrderBy(b => b.SortOrder)
            .ToListAsync();

        var result = new List<FinancialBucketDto>();

        foreach (var bucket in buckets)
        {
            var activeTasks = bucket.Tasks.Where(t => t.IsActive).ToList();
            var taskIds = activeTasks.Select(t => t.Id).ToList();

            var completions = await _db.MonthlyTaskCompletions
                .Where(c => taskIds.Contains(c.TaskId) && c.Month == currentMonth && c.Year == currentYear)
                .ToListAsync();

            var totalTasks = activeTasks.Count;
            var completedTasks = completions.Count(c => c.IsCompleted);
            var completionPercent = totalTasks > 0 ? (decimal)completedTasks / totalTasks * 100 : 0;

            result.Add(new FinancialBucketDto
            {
                Id = bucket.Id,
                Name = bucket.Name,
                Category = bucket.Category,
                MonthlyTarget = bucket.MonthlyTarget,
                TargetAmount = bucket.TargetAmount,
                CurrentAmount = bucket.CurrentAmount,
                Frequency = bucket.Frequency,
                PeriodMonths = bucket.PeriodMonths,
                InvestedIn = bucket.InvestedIn,
                ColorHex = bucket.ColorHex,
                Icon = bucket.Icon,
                SortOrder = bucket.SortOrder,
                CompletionPercent = Math.Round(completionPercent, 2),
                TasksTotal = totalTasks,
                TasksCompleted = completedTasks,
                Contributions = bucket.Contributions
                    .OrderByDescending(c => c.ContributionDate)
                    .Select(c => new BucketContributionDto
                    {
                        Id = c.Id,
                        BucketId = c.BucketId,
                        Amount = c.Amount,
                        Note = c.Note,
                        ContributionDate = c.ContributionDate
                    })
                    .ToList()
            });
        }

        return result;
    }

    public async Task<FinancialBucketDto?> GetBucketByIdAsync(Guid id, int userId = 0)
    {
        var now = DateTime.UtcNow;
        var currentMonth = now.Month;
        var currentYear = now.Year;

        var bucket = await _db.InvestmentBuckets
            .Include(b => b.Tasks.Where(t => t.IsActive))
            .Include(b => b.Contributions)
            .FirstOrDefaultAsync(b => b.Id == id && b.IsActive && (userId <= 0 || b.UserId == userId));

        if (bucket == null) return null;

        var tasks = new List<TaskDto>();
        foreach (var task in bucket.Tasks)
        {
            var completion = await _db.MonthlyTaskCompletions
                .FirstOrDefaultAsync(c => c.TaskId == task.Id && c.Month == currentMonth && c.Year == currentYear);

            tasks.Add(new TaskDto
            {
                Id = task.Id,
                BucketId = task.BucketId,
                Title = task.Title,
                Description = task.Description,
                TaskType = task.TaskType,
                Amount = task.Amount,
                IsRecurring = task.IsRecurring,
                RecurrenceDay = task.RecurrenceDay,
                IsCompleted = completion?.IsCompleted ?? false,
                CompletedAt = completion?.CompletedAt,
                ActualAmount = completion?.ActualAmount,
                Notes = completion?.Notes
            });
        }

        var totalTasks = tasks.Count;
        var completedTasks = tasks.Count(t => t.IsCompleted);
        var completionPercent = totalTasks > 0 ? (decimal)completedTasks / totalTasks * 100 : 0;

        return new FinancialBucketDto
        {
            Id = bucket.Id,
            Name = bucket.Name,
            Category = bucket.Category,
            MonthlyTarget = bucket.MonthlyTarget,
            TargetAmount = bucket.TargetAmount,
            CurrentAmount = bucket.CurrentAmount,
            Frequency = bucket.Frequency,
            PeriodMonths = bucket.PeriodMonths,
            InvestedIn = bucket.InvestedIn,
            ColorHex = bucket.ColorHex,
            Icon = bucket.Icon,
            SortOrder = bucket.SortOrder,
            CompletionPercent = Math.Round(completionPercent, 2),
            TasksTotal = totalTasks,
            TasksCompleted = completedTasks,
            Tasks = tasks,
            Contributions = bucket.Contributions
                .OrderByDescending(c => c.ContributionDate)
                .Select(c => new BucketContributionDto
                {
                    Id = c.Id,
                    BucketId = c.BucketId,
                    Amount = c.Amount,
                    Note = c.Note,
                    ContributionDate = c.ContributionDate
                })
                .ToList()
        };
    }

    public async Task<FinancialBucketDto> CreateBucketAsync(CreateFinancialBucketRequest request, int userId)
    {
        var bucket = new InvestmentBucket
        {
            UserId = userId,
            Name = request.Name,
            Category = request.Category,
            MonthlyTarget = request.MonthlyTarget,
            TargetAmount = request.TargetAmount,
            CurrentAmount = request.CurrentAmount,
            Frequency = request.Frequency,
            PeriodMonths = request.PeriodMonths,
            InvestedIn = request.InvestedIn,
            ColorHex = request.ColorHex,
            Icon = request.Icon,
            SortOrder = request.SortOrder
        };

        _db.InvestmentBuckets.Add(bucket);
        await _db.SaveChangesAsync();

        return new FinancialBucketDto
        {
            Id = bucket.Id,
            Name = bucket.Name,
            Category = bucket.Category,
            MonthlyTarget = bucket.MonthlyTarget,
            TargetAmount = bucket.TargetAmount,
            CurrentAmount = bucket.CurrentAmount,
            Frequency = bucket.Frequency,
            PeriodMonths = bucket.PeriodMonths,
            InvestedIn = bucket.InvestedIn,
            ColorHex = bucket.ColorHex,
            Icon = bucket.Icon,
            SortOrder = bucket.SortOrder,
            CompletionPercent = 0,
            TasksTotal = 0,
            TasksCompleted = 0,
            Contributions = new List<BucketContributionDto>()
        };
    }

    public async Task<FinancialBucketDto?> UpdateBucketAsync(Guid id, UpdateFinancialBucketRequest request, int userId)
    {
        var bucket = await _db.InvestmentBuckets.FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);
        if (bucket == null) return null;

        if (request.Name != null) bucket.Name = request.Name;
        if (request.Category != null) bucket.Category = request.Category;
        if (request.MonthlyTarget.HasValue) bucket.MonthlyTarget = request.MonthlyTarget.Value;
        if (request.TargetAmount.HasValue) bucket.TargetAmount = request.TargetAmount.Value;
        if (request.CurrentAmount.HasValue) bucket.CurrentAmount = request.CurrentAmount.Value;
        if (request.Frequency != null) bucket.Frequency = request.Frequency;
        if (request.PeriodMonths.HasValue) bucket.PeriodMonths = request.PeriodMonths.Value;
        if (request.InvestedIn != null) bucket.InvestedIn = request.InvestedIn;
        if (request.ColorHex != null) bucket.ColorHex = request.ColorHex;
        if (request.Icon != null) bucket.Icon = request.Icon;
        if (request.SortOrder.HasValue) bucket.SortOrder = request.SortOrder.Value;

        await _db.SaveChangesAsync();

        return await GetBucketByIdAsync(id, userId);
    }

    public async Task<bool> DeleteBucketAsync(Guid id, int userId)
    {
        var bucket = await _db.InvestmentBuckets.FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);
        if (bucket == null) return false;

        bucket.IsActive = false;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<FinancialBucketDto?> AddBucketContributionAsync(Guid bucketId, CreateBucketContributionRequest request, int userId)
    {
        var bucket = await _db.InvestmentBuckets.FirstOrDefaultAsync(b => b.Id == bucketId && b.IsActive && b.UserId == userId);
        if (bucket == null) return null;

        var contribution = new BucketContribution
        {
            BucketId = bucketId,
            Amount = request.Amount,
            Note = request.Note,
            ContributionDate = request.ContributionDate ?? DateTime.UtcNow
        };

        _db.BucketContributions.Add(contribution);
        await _db.SaveChangesAsync();

        bucket.CurrentAmount = await _db.BucketContributions
            .Where(c => c.BucketId == bucketId)
            .SumAsync(c => c.Amount);
        await _db.SaveChangesAsync();

        return await GetBucketByIdAsync(bucketId, userId);
    }

    public async Task<FinancialBucketDto?> DeleteBucketContributionAsync(Guid bucketId, Guid contributionId, int userId)
    {
        var ownsBucket = await _db.InvestmentBuckets.AnyAsync(b => b.Id == bucketId && b.UserId == userId && b.IsActive);
        if (!ownsBucket) return null;

        var contribution = await _db.BucketContributions
            .FirstOrDefaultAsync(c => c.Id == contributionId && c.BucketId == bucketId);
        if (contribution == null) return null;

        _db.BucketContributions.Remove(contribution);
        await _db.SaveChangesAsync();

        var bucket = await _db.InvestmentBuckets.FirstOrDefaultAsync(b => b.Id == bucketId && b.IsActive);
        if (bucket == null) return null;

        bucket.CurrentAmount = await _db.BucketContributions
            .Where(c => c.BucketId == bucketId)
            .SumAsync(c => c.Amount);
        await _db.SaveChangesAsync();

        return await GetBucketByIdAsync(bucketId, userId);
    }

    // ========== TASKS ==========
    public async Task<List<TaskDto>> GetAllTasksAsync()
    {
        var now = DateTime.UtcNow;
        var currentMonth = now.Month;
        var currentYear = now.Year;

        var tasks = await _db.MonthlyTasks
            .Where(t => t.IsActive)
            .ToListAsync();

        var result = new List<TaskDto>();

        foreach (var task in tasks)
        {
            var completion = await _db.MonthlyTaskCompletions
                .FirstOrDefaultAsync(c => c.TaskId == task.Id && c.Month == currentMonth && c.Year == currentYear);

            result.Add(new TaskDto
            {
                Id = task.Id,
                BucketId = task.BucketId,
                Title = task.Title,
                Description = task.Description,
                TaskType = task.TaskType,
                Amount = task.Amount,
                IsRecurring = task.IsRecurring,
                RecurrenceDay = task.RecurrenceDay,
                IsCompleted = completion?.IsCompleted ?? false,
                CompletedAt = completion?.CompletedAt,
                ActualAmount = completion?.ActualAmount,
                Notes = completion?.Notes
            });
        }

        return result;
    }

    public async Task<Dictionary<string, List<TaskDto>>> GetTasksByMonthAsync(int month, int year)
    {
        var tasks = await _db.MonthlyTasks
            .Where(t => t.IsActive)
            .Include(t => t.Bucket)
            .ToListAsync();

        var result = new Dictionary<string, List<TaskDto>>();

        foreach (var task in tasks)
        {
            var completion = await _db.MonthlyTaskCompletions
                .FirstOrDefaultAsync(c => c.TaskId == task.Id && c.Month == month && c.Year == year);

            var taskDto = new TaskDto
            {
                Id = task.Id,
                BucketId = task.BucketId,
                Title = task.Title,
                Description = task.Description,
                TaskType = task.TaskType,
                Amount = task.Amount,
                IsRecurring = task.IsRecurring,
                RecurrenceDay = task.RecurrenceDay,
                IsCompleted = completion?.IsCompleted ?? false,
                CompletedAt = completion?.CompletedAt,
                ActualAmount = completion?.ActualAmount,
                Notes = completion?.Notes
            };

            var bucketName = task.Bucket?.Name ?? "Unknown";
            if (!result.ContainsKey(bucketName))
                result[bucketName] = new List<TaskDto>();

            result[bucketName].Add(taskDto);
        }

        return result;
    }

    public async Task<TaskDto> CreateTaskAsync(CreateFinanceTaskRequest request)
    {
        var task = new MonthlyTask
        {
            BucketId = request.BucketId,
            Title = request.Title,
            Description = request.Description,
            TaskType = request.TaskType,
            Amount = request.Amount,
            IsRecurring = request.IsRecurring,
            RecurrenceDay = request.RecurrenceDay
        };

        _db.MonthlyTasks.Add(task);
        await _db.SaveChangesAsync();

        // Auto-create completion for current month if recurring
        if (task.IsRecurring)
        {
            var now = DateTime.UtcNow;
            await EnsureTaskCompletionAsync(task.Id, now.Month, now.Year);
        }

        return new TaskDto
        {
            Id = task.Id,
            BucketId = task.BucketId,
            Title = task.Title,
            Description = task.Description,
            TaskType = task.TaskType,
            Amount = task.Amount,
            IsRecurring = task.IsRecurring,
            RecurrenceDay = task.RecurrenceDay,
            IsCompleted = false
        };
    }

    public async Task<TaskDto?> UpdateTaskAsync(Guid id, UpdateFinanceTaskRequest request)
    {
        var task = await _db.MonthlyTasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task == null) return null;

        if (request.Title != null) task.Title = request.Title;
        if (request.Description != null) task.Description = request.Description;
        if (request.TaskType != null) task.TaskType = request.TaskType;
        if (request.Amount.HasValue) task.Amount = request.Amount.Value;
        if (request.IsRecurring.HasValue) task.IsRecurring = request.IsRecurring.Value;
        if (request.RecurrenceDay.HasValue) task.RecurrenceDay = request.RecurrenceDay.Value;

        await _db.SaveChangesAsync();

        var now = DateTime.UtcNow;
        var completion = await _db.MonthlyTaskCompletions
            .FirstOrDefaultAsync(c => c.TaskId == id && c.Month == now.Month && c.Year == now.Year);

        return new TaskDto
        {
            Id = task.Id,
            BucketId = task.BucketId,
            Title = task.Title,
            Description = task.Description,
            TaskType = task.TaskType,
            Amount = task.Amount,
            IsRecurring = task.IsRecurring,
            RecurrenceDay = task.RecurrenceDay,
            IsCompleted = completion?.IsCompleted ?? false,
            CompletedAt = completion?.CompletedAt,
            ActualAmount = completion?.ActualAmount,
            Notes = completion?.Notes
        };
    }

    public async Task<bool> CompleteTaskAsync(Guid id, CompleteFinanceTaskRequest request)
    {
        var now = DateTime.UtcNow;
        var currentMonth = now.Month;
        var currentYear = now.Year;

        var completion = await _db.MonthlyTaskCompletions
            .FirstOrDefaultAsync(c => c.TaskId == id && c.Month == currentMonth && c.Year == currentYear);

        if (completion == null)
        {
            completion = new MonthlyTaskCompletion
            {
                TaskId = id,
                Month = currentMonth,
                Year = currentYear,
                IsCompleted = true,
                CompletedAt = now,
                ActualAmount = request.ActualAmount,
                Notes = request.Notes
            };
            _db.MonthlyTaskCompletions.Add(completion);
        }
        else
        {
            completion.IsCompleted = true;
            completion.CompletedAt = now;
            completion.ActualAmount = request.ActualAmount;
            completion.Notes = request.Notes;
        }

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UncompleteTaskAsync(Guid id)
    {
        var now = DateTime.UtcNow;
        var currentMonth = now.Month;
        var currentYear = now.Year;

        var completion = await _db.MonthlyTaskCompletions
            .FirstOrDefaultAsync(c => c.TaskId == id && c.Month == currentMonth && c.Year == currentYear);

        if (completion == null) return false;

        completion.IsCompleted = false;
        completion.CompletedAt = null;
        completion.ActualAmount = null;
        completion.Notes = null;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteTaskAsync(Guid id)
    {
        var task = await _db.MonthlyTasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task == null) return false;

        task.IsActive = false;
        await _db.SaveChangesAsync();
        return true;
    }

    // ========== DASHBOARD ==========
    public async Task<DashboardDto> GetDashboardDataAsync()
    {
        var now = DateTime.UtcNow;
        var currentMonth = now.Month;
        var currentYear = now.Year;

        var buckets = await GetAllBucketsAsync();
        
        // Calculate overall completion
        var totalTasks = buckets.Sum(b => b.TasksTotal);
        var completedTasks = buckets.Sum(b => b.TasksCompleted);
        var overallCompletion = totalTasks > 0 ? (decimal)completedTasks / totalTasks * 100 : 0;

        // Calculate streak
        var streak = await CalculateStreakAsync();

        // Get snapshot
        var snapshot = await GetSnapshotAsync(currentMonth, currentYear);

        // Get all active rules
        var allRules = await _db.FinancialRules
            .Where(r => r.IsActive)
            .OrderBy(r => r.SortOrder)
            .Select(r => new RuleDto
            {
                Id = r.Id,
                Title = r.Title,
                Description = r.Description,
                Category = r.Category,
                DisplayStyle = r.DisplayStyle,
                IsActive = r.IsActive,
                SortOrder = r.SortOrder
            })
            .ToListAsync();

        // Get upcoming tasks (next 7 days)
        var upcomingTasks = await GetUpcomingTasksAsync();

        // Get missed tasks from previous month
        var missedTasks = await GetMissedTasksAsync();

        // Load tasks for each bucket
        foreach (var bucket in buckets)
        {
            var fullBucket = await GetBucketByIdAsync(bucket.Id);
            bucket.Tasks = fullBucket?.Tasks;
        }

        return new DashboardDto
        {
            CurrentMonth = now.ToString("MMMM yyyy", CultureInfo.InvariantCulture),
            OverallCompletionPercent = Math.Round(overallCompletion, 2),
            Streak = streak,
            Buckets = buckets,
            MonthlySnapshot = snapshot,
            Rules = allRules,
            UpcomingTasks = upcomingTasks,
            MissedTasks = missedTasks
        };
    }

    public async Task<List<MonthlyHistoryDto>> GetMonthlyHistoryAsync()
    {
        var now = DateTime.UtcNow;
        var result = new List<MonthlyHistoryDto>();

        for (int i = 11; i >= 0; i--)
        {
            var targetDate = now.AddMonths(-i);
            var month = targetDate.Month;
            var year = targetDate.Year;

            var completionPercent = await CalculateMonthCompletionAsync(month, year);
            var snapshot = await _db.MonthlySnapshots
                .FirstOrDefaultAsync(s => s.Month == month && s.Year == year);

            result.Add(new MonthlyHistoryDto
            {
                Month = targetDate.ToString("MMM", CultureInfo.InvariantCulture),
                Year = year,
                MonthNumber = month,
                CompletionPercent = completionPercent,
                TotalInvested = snapshot?.TotalInvested ?? 0
            });
        }

        return result;
    }

    // ========== RULES ==========
    public async Task<GroupedRulesDto> GetGroupedRulesAsync()
    {
        var rules = await _db.FinancialRules
            .Where(r => r.IsActive)
            .OrderBy(r => r.SortOrder)
            .ToListAsync();

        return new GroupedRulesDto
        {
            Investment = rules.Where(r => r.Category == "INVESTMENT").Select(MapToRuleDto).ToList(),
            Trading = rules.Where(r => r.Category == "TRADING").Select(MapToRuleDto).ToList(),
            Mindset = rules.Where(r => r.Category == "MINDSET").Select(MapToRuleDto).ToList(),
            Lifestyle = rules.Where(r => r.Category == "LIFESTYLE").Select(MapToRuleDto).ToList()
        };
    }

    public async Task<RuleDto> CreateRuleAsync(CreateRuleRequest request)
    {
        var rule = new FinancialRule
        {
            Title = request.Title,
            Description = request.Description,
            Category = request.Category,
            DisplayStyle = request.DisplayStyle,
            SortOrder = request.SortOrder
        };

        _db.FinancialRules.Add(rule);
        await _db.SaveChangesAsync();

        return MapToRuleDto(rule);
    }

    public async Task<RuleDto?> UpdateRuleAsync(Guid id, UpdateRuleRequest request)
    {
        var rule = await _db.FinancialRules.FirstOrDefaultAsync(r => r.Id == id);
        if (rule == null) return null;

        if (request.Title != null) rule.Title = request.Title;
        if (request.Description != null) rule.Description = request.Description;
        if (request.Category != null) rule.Category = request.Category;
        if (request.DisplayStyle != null) rule.DisplayStyle = request.DisplayStyle;
        if (request.IsActive.HasValue) rule.IsActive = request.IsActive.Value;
        if (request.SortOrder.HasValue) rule.SortOrder = request.SortOrder.Value;

        await _db.SaveChangesAsync();
        return MapToRuleDto(rule);
    }

    public async Task<bool> DeleteRuleAsync(Guid id)
    {
        var rule = await _db.FinancialRules.FirstOrDefaultAsync(r => r.Id == id);
        if (rule == null) return false;

        rule.IsActive = false;
        await _db.SaveChangesAsync();
        return true;
    }

    // ========== SNAPSHOTS ==========
    public async Task<List<MonthlySnapshotDto>> GetAllSnapshotsAsync()
    {
        var snapshots = await _db.MonthlySnapshots
            .OrderByDescending(s => s.Year)
            .ThenByDescending(s => s.Month)
            .ToListAsync();

        return snapshots.Select(MapToSnapshotDto).ToList();
    }

    public async Task<MonthlySnapshotDto?> GetSnapshotAsync(int month, int year)
    {
        var snapshot = await _db.MonthlySnapshots
            .FirstOrDefaultAsync(s => s.Month == month && s.Year == year);

        return snapshot != null ? MapToSnapshotDto(snapshot) : null;
    }

    public async Task<MonthlySnapshotDto> UpsertSnapshotAsync(CreateSnapshotRequest request)
    {
        var existing = await _db.MonthlySnapshots
            .FirstOrDefaultAsync(s => s.Month == request.Month && s.Year == request.Year);

        if (existing != null)
        {
            existing.TotalIncome = request.TotalIncome;
            existing.TotalExpenses = request.TotalExpenses;
            existing.TotalInvested = request.TotalInvested;
            existing.EmergencyFundBalance = request.EmergencyFundBalance;
            existing.TravelFundBalance = request.TravelFundBalance;
            existing.PortfolioEstimatedValue = request.PortfolioEstimatedValue;
            existing.Notes = request.Notes;
        }
        else
        {
            existing = new MonthlySnapshot
            {
                Month = request.Month,
                Year = request.Year,
                TotalIncome = request.TotalIncome,
                TotalExpenses = request.TotalExpenses,
                TotalInvested = request.TotalInvested,
                EmergencyFundBalance = request.EmergencyFundBalance,
                TravelFundBalance = request.TravelFundBalance,
                PortfolioEstimatedValue = request.PortfolioEstimatedValue,
                Notes = request.Notes
            };
            _db.MonthlySnapshots.Add(existing);
        }

        await _db.SaveChangesAsync();
        return MapToSnapshotDto(existing);
    }

    // ========== HELPER METHODS ==========
    private async Task EnsureTaskCompletionAsync(Guid taskId, int month, int year)
    {
        var exists = await _db.MonthlyTaskCompletions
            .AnyAsync(c => c.TaskId == taskId && c.Month == month && c.Year == year);

        if (!exists)
        {
            _db.MonthlyTaskCompletions.Add(new MonthlyTaskCompletion
            {
                TaskId = taskId,
                Month = month,
                Year = year,
                IsCompleted = false
            });
            await _db.SaveChangesAsync();
        }
    }

    private async Task<decimal> CalculateMonthCompletionAsync(int month, int year)
    {
        var tasks = await _db.MonthlyTasks.Where(t => t.IsActive).ToListAsync();
        var taskIds = tasks.Select(t => t.Id).ToList();

        var completions = await _db.MonthlyTaskCompletions
            .Where(c => taskIds.Contains(c.TaskId) && c.Month == month && c.Year == year)
            .ToListAsync();

        if (tasks.Count == 0) return 0;

        var completedCount = completions.Count(c => c.IsCompleted);
        return (decimal)completedCount / tasks.Count * 100;
    }

    private async Task<int> CalculateStreakAsync()
    {
        var now = DateTime.UtcNow;
        var streak = 0;

        for (int i = 1; i <= 12; i++)
        {
            var targetDate = now.AddMonths(-i);
            var completion = await CalculateMonthCompletionAsync(targetDate.Month, targetDate.Year);

            if (completion >= 100)
                streak++;
            else
                break;
        }

        return streak;
    }

    private async Task<List<TaskDto>> GetUpcomingTasksAsync()
    {
        var now = DateTime.UtcNow;
        var currentDay = now.Day;

        var tasks = await _db.MonthlyTasks
            .Where(t => t.IsActive && t.IsRecurring && t.RecurrenceDay.HasValue &&
                        t.RecurrenceDay >= currentDay && t.RecurrenceDay <= currentDay + 7)
            .ToListAsync();

        var result = new List<TaskDto>();
        foreach (var task in tasks)
        {
            var completion = await _db.MonthlyTaskCompletions
                .FirstOrDefaultAsync(c => c.TaskId == task.Id && c.Month == now.Month && c.Year == now.Year);

            if (completion?.IsCompleted != true)
            {
                result.Add(new TaskDto
                {
                    Id = task.Id,
                    BucketId = task.BucketId,
                    Title = task.Title,
                    Amount = task.Amount,
                    RecurrenceDay = task.RecurrenceDay,
                    IsCompleted = false
                });
            }
        }

        return result;
    }

    private async Task<List<TaskDto>> GetMissedTasksAsync()
    {
        var now = DateTime.UtcNow;
        var prevMonth = now.AddMonths(-1);

        var tasks = await _db.MonthlyTasks
            .Where(t => t.IsActive)
            .ToListAsync();

        var result = new List<TaskDto>();
        foreach (var task in tasks)
        {
            var completion = await _db.MonthlyTaskCompletions
                .FirstOrDefaultAsync(c => c.TaskId == task.Id && c.Month == prevMonth.Month && c.Year == prevMonth.Year);

            if (completion != null && !completion.IsCompleted)
            {
                result.Add(new TaskDto
                {
                    Id = task.Id,
                    BucketId = task.BucketId,
                    Title = task.Title,
                    Amount = task.Amount,
                    IsCompleted = false
                });
            }
        }

        return result;
    }

    private static RuleDto MapToRuleDto(FinancialRule rule) => new()
    {
        Id = rule.Id,
        Title = rule.Title,
        Description = rule.Description,
        Category = rule.Category,
        DisplayStyle = rule.DisplayStyle,
        IsActive = rule.IsActive,
        SortOrder = rule.SortOrder
    };

    private static MonthlySnapshotDto MapToSnapshotDto(MonthlySnapshot snapshot)
    {
        var savingsRate = snapshot.TotalIncome > 0
            ? snapshot.TotalInvested / snapshot.TotalIncome * 100
            : 0;

        return new MonthlySnapshotDto
        {
            Id = snapshot.Id,
            Month = snapshot.Month,
            Year = snapshot.Year,
            TotalIncome = snapshot.TotalIncome,
            TotalExpenses = snapshot.TotalExpenses,
            TotalInvested = snapshot.TotalInvested,
            EmergencyFundBalance = snapshot.EmergencyFundBalance,
            TravelFundBalance = snapshot.TravelFundBalance,
            PortfolioEstimatedValue = snapshot.PortfolioEstimatedValue,
            Notes = snapshot.Notes,
            SavingsRate = Math.Round(savingsRate, 2)
        };
    }
}