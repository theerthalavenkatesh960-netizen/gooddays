using GoodDaysApi.Services.Gmail.Models;

namespace GoodDaysApi.Services.Gmail;

public interface ITransactionExtractionService
{
    bool TryExtract(string subject, string snippet, string body, out ExtractedTransaction transaction, string? from = null);
    IReadOnlyList<ExtractedTransaction> ExtractMany(string subject, string snippet, string body, string? from = null);
    bool HasMonetaryAmount(string subject, string snippet, string body);
}
