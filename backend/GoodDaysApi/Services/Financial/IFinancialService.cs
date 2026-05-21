using GoodDaysApi.DTOs.Financial;

namespace GoodDaysApi.Services.Financial;

public interface IFinancialService
{
    // Buckets
    Task<List<FinancialBucketDto>> GetAllBucketsAsync(int userId);
    Task<FinancialBucketDto?> GetBucketByIdAsync(Guid id, int userId);
    Task<FinancialBucketDto> CreateBucketAsync(CreateFinancialBucketRequest request, int userId);
    Task<FinancialBucketDto?> UpdateBucketAsync(Guid id, UpdateFinancialBucketRequest request, int userId);
    Task<bool> DeleteBucketAsync(Guid id, int userId);
    Task<FinancialBucketDto?> AddBucketContributionAsync(Guid bucketId, CreateBucketContributionRequest request, int userId);
    Task<FinancialBucketDto?> DeleteBucketContributionAsync(Guid bucketId, Guid contributionId, int userId);

    // Tasks
    Task<List<TaskDto>> GetAllTasksAsync();
    Task<Dictionary<string, List<TaskDto>>> GetTasksByMonthAsync(int month, int year);
    Task<TaskDto> CreateTaskAsync(CreateFinanceTaskRequest request);
    Task<TaskDto?> UpdateTaskAsync(Guid id, UpdateFinanceTaskRequest request);
    Task<bool> CompleteTaskAsync(Guid id, CompleteFinanceTaskRequest request);
    Task<bool> UncompleteTaskAsync(Guid id);
    Task<bool> DeleteTaskAsync(Guid id);

    // Dashboard
    Task<DashboardDto> GetDashboardDataAsync();
    Task<List<MonthlyHistoryDto>> GetMonthlyHistoryAsync();

    // Rules
    Task<GroupedRulesDto> GetGroupedRulesAsync();
    Task<RuleDto> CreateRuleAsync(CreateRuleRequest request);
    Task<RuleDto?> UpdateRuleAsync(Guid id, UpdateRuleRequest request);
    Task<bool> DeleteRuleAsync(Guid id);

    // Snapshots
    Task<List<MonthlySnapshotDto>> GetAllSnapshotsAsync();
    Task<MonthlySnapshotDto?> GetSnapshotAsync(int month, int year);
    Task<MonthlySnapshotDto> UpsertSnapshotAsync(CreateSnapshotRequest request);
}