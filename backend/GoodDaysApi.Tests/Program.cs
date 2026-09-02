using GoodDaysApi.Services.Gmail;

var parser = new TransactionExtractionService();
var passed = 0;
var failed = 0;

void Check(string name, bool condition)
{
    if (condition)
    {
        passed++;
        Console.WriteLine($"PASS: {name}");
    }
    else
    {
        failed++;
        Console.WriteLine($"FAIL: {name}");
    }
}

Check("credit card purchase", parser.TryExtract("SBI Credit Card ending 4521 was charged INR 1,249 at Amazon on 1/9/2026", "", "", out var creditCard)
    && creditCard.InstrumentType == "CREDIT_CARD"
    && creditCard.Direction == "DEBIT"
    && creditCard.TransactionType == "PURCHASE"
    && creditCard.InstrumentLast4 == "4521"
    && creditCard.Merchant?.Contains("Amazon", StringComparison.OrdinalIgnoreCase) == true);

Check("bank account debit", parser.TryExtract("Your SBI account ending 4521 has been debited Rs. 1,249", "", "", out var bankAccount)
    && bankAccount.InstrumentType == "BANK_ACCOUNT"
    && bankAccount.Direction == "DEBIT"
    && bankAccount.InstrumentType != "CREDIT_CARD");

Check("UPI credit", parser.TryExtract("UPI payment received INR 500, UTR ABC123456789", "", "", out var upi)
    && upi.InstrumentType == "UPI"
    && upi.Direction == "CREDIT"
    && upi.ReferenceNumber == "ABC123456789");

Check("ambiguous card rejected", !parser.TryExtract("Your card ending 1234 was used for INR 500", "", "", out _));
Check("declined event identified", parser.TryExtract("Your SBI Credit Card ending 4521 transaction for INR 500 was declined", "", "", out var declined)
    && declined.TransactionStatus == "FAILED");
Check("due date rejected", !parser.TryExtract("Your credit card minimum amount due is INR 500 by 10/9/2026", "", "", out _));
Check("balance email rejected", !parser.TryExtract("Your available balance is INR 50,000 and your credit limit is INR 2,00,000", "", "", out _));
Check("promotion rejected", !parser.TryExtract("Special cashback offer: get INR 500 cashback on your next purchase", "", "", out _));
var multiple = parser.ExtractMany(
    "SBI Credit Card ending 4521 transactions",
    "",
    "Purchase at Amazon for INR 1,249. Purchase at Swiggy for INR 499.");
Check("multiple transactions detected", multiple.Count == 2
    && multiple.Any(x => x.Amount == 1249m && x.Merchant?.Contains("Amazon", StringComparison.OrdinalIgnoreCase) == true)
    && multiple.Any(x => x.Amount == 499m && x.Merchant?.Contains("Swiggy", StringComparison.OrdinalIgnoreCase) == true));

Console.WriteLine($"{passed} passed, {failed} failed");
return failed == 0 ? 0 : 1;
