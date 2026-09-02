using GoodDaysApi.Services.Gmail.Models;

namespace GoodDaysApi.Services.Gmail;

public interface ITransactionExtractionService
{
    bool TryExtract(string subject, string snippet, string body, out ExtractedTransaction transaction);
    IReadOnlyList<ExtractedTransaction> ExtractMany(string subject, string snippet, string body);
}
