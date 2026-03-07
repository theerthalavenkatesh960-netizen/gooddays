using GoodDaysApi.DTOs.Financial;

namespace GoodDaysApi.Services.Financial;

public interface IFinancialService
{
    // Buckets
    Task<List<BucketDto>> GetAllBucketsAsync();
    Task<BucketDto?> GetBucketByIdAsync(Guid id);
    Task<BucketDto> CreateBucketAsync(CreateBucketRequest request);
    Task<BucketDto?> UpdateBucketAsync(Guid id, UpdateBucketRequest request);
    Task<bool> DeleteBucketAsync(Guid id);

    // Tasks
    Task<List<TaskDto>> GetAllTasksAsync();
    Task<Dictionary<string, List<TaskDto>>> GetTasksByMonthAsync(int month, int year);
    Task<TaskDto> CreateTaskAsync(CreateTaskRequest request);
    Task<TaskDto?> UpdateTaskAsync(Guid id, UpdateTaskRequest request);
    Task<bool> CompleteTaskAsync(Guid id, CompleteTaskRequest request);
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