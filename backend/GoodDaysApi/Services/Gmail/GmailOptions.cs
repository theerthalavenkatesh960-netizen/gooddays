namespace GoodDaysApi.Services.Gmail;

public class GmailOptions
{
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = string.Empty;
    public string FrontendRedirectAfterCallback { get; set; } = string.Empty;
    public string OAuthStateSecret { get; set; } = string.Empty;
    public string[] FinanceSenderAllowlist { get; set; } = Array.Empty<string>();
    public string[] BlockedSenderPatterns { get; set; } = Array.Empty<string>();
    public string[] TrustedOrderDomains { get; set; } = Array.Empty<string>();
    public string[] WalletSenderAllowlist { get; set; } = Array.Empty<string>();
    public string[] InvestmentSenderAllowlist { get; set; } = Array.Empty<string>();
    public int ListPageSize { get; set; } = 100;
    public int MaxPagesPerQuery { get; set; } = 2;
    public int MaxMessagesPerSync { get; set; } = 120;
    public int MaxSyncDurationSeconds { get; set; } = 45;
    public int InitialSyncDays { get; set; } = 120;
    public int MaxFullSyncDurationSeconds { get; set; } = 600;
}
