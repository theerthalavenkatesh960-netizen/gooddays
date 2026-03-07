using GoodDaysApi.DTOs.Financial;

namespace GoodDaysApi.Services.Financial;

public interface IFinancialService
{
    // Buckets
    Task<List<FinanceBucketDto>> GetAllBucketsAsync();
    Task<FinanceBucketDto?> GetBucketByIdAsync(Guid id);
    Task<FinanceBucketDto> CreateBucketAsync(CreateFinanceBucketRequest request);
    Task<FinanceBucketDto?> UpdateBucketAsync(Guid id, UpdateFinanceBucketRequest request);
    Task<bool> DeleteBucketAsync(Guid id);

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