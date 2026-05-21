namespace GoodDaysApi.Services.Gmail;

public class GmailSyncBackgroundWorker : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(15);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<GmailSyncBackgroundWorker> _logger;

    public GmailSyncBackgroundWorker(IServiceScopeFactory scopeFactory, ILogger<GmailSyncBackgroundWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Gmail sync background worker started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var syncService = scope.ServiceProvider.GetRequiredService<IGmailSyncService>();
                var created = await syncService.SyncAllConnectedAsync(stoppingToken);
                _logger.LogInformation("Gmail sync cycle completed. Created {Created} new transactions.", created);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Gmail sync background worker cycle failed.");
            }

            await Task.Delay(Interval, stoppingToken);
        }

        _logger.LogInformation("Gmail sync background worker stopped.");
    }
}
