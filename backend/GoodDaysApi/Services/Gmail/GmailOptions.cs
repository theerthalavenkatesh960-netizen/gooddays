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
}
