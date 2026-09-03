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

void CheckFn(string name, Func<bool> assertion)
{
    try
    {
        Check(name, assertion());
    }
    catch (Exception ex)
    {
        failed++;
        Console.WriteLine($"FAIL: {name} ({ex.GetType().Name})");
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

var orderParser = new OrderExtractionService();
Check("generic order merchant from sender", orderParser.TryExtract(
    "Your booking is confirmed",
    "Order ID BMS12345 total INR 799",
    "Your order from BookMyShow is confirmed on 2/9/2026",
    out var bookMyShowOrder,
    "alerts@bookmyshow.com")
    && bookMyShowOrder.Merchant == "BookMyShow"
    && bookMyShowOrder.TotalAmount == 799m);
Check("trusted order sender can provide merchant", orderParser.TryExtract(
    "Your order is confirmed",
    "Order ID AP12345 total INR 299",
    "Order confirmed on 2/9/2026",
    out var apolloOrder,
    "orders@apollo247.com",
    new[] { "apollo247.com" })
    && apolloOrder.Merchant == "Apollo247");
Check("untrusted order sender without merchant text rejected", !orderParser.TryExtract(
    "Your order is confirmed",
    "Order ID XX12345 total INR 299",
    "Order confirmed on 2/9/2026",
    out _,
    "orders@example-random.com",
    new[] { "apollo247.com" }));

Check("amazon pay wallet top-up funded by credit card", parser.TryExtract(
    "Amazon Pay wallet loaded",
    "",
    "Added INR 1000 to Amazon Pay wallet from HDFC Credit Card ending 1234 on 3/9/2026",
    out var walletTopUp)
    && walletTopUp.TransactionType == "TRANSFER"
    && walletTopUp.InstrumentType == "CREDIT_CARD"
    && walletTopUp.SourceInstrumentType == "CREDIT_CARD"
    && walletTopUp.SourceInstrumentLast4 == "1234"
    && walletTopUp.DestinationInstrumentType == "WALLET"
    && walletTopUp.DestinationInstrumentName == "Amazon Pay");

Check("amazon pay wallet spend stays wallet", parser.TryExtract(
    "Amazon Pay payment successful",
    "",
    "Paid INR 349 to Apollo using Amazon Pay balance on 3/9/2026",
    out var walletSpend)
    && walletSpend.InstrumentType == "WALLET"
    && walletSpend.SourceInstrumentType == "WALLET"
    && walletSpend.ProviderOrBank == "Amazon Pay"
    && walletSpend.InstrumentType != "CREDIT_CARD");

// Regression suite for real-world Indian bank formats that previously fell through to NEEDS_REVIEW.

Check("real HDFC alert with available balance in same email", parser.TryExtract(
    "Alert: Update on your HDFC Bank Account",
    "",
    "Dear Customer, Rs.500.00 has been debited from account XX1234 to VPA merchant@upi on 03-09-26. Your UPI transaction reference number is 123456789012. Avl Bal: Rs.12,345.67",
    out var hdfcAlert)
    && hdfcAlert.Amount == 500m
    && hdfcAlert.Direction == "DEBIT"
    && hdfcAlert.TransactionStatus == "COMPLETED");

Check("html email with rupee entity is parsed", parser.TryExtract(
    "Transaction alert",
    "",
    "<html><body><table><tr><td>Your HDFC Bank Credit Card ending 4521 has been charged &#8377;2,499.00 at BigBasket</td></tr></table></body></html>",
    out var htmlEmail)
    && htmlEmail.Amount == 2499m
    && htmlEmail.InstrumentType == "CREDIT_CARD"
    && htmlEmail.InstrumentLast4 == "4521");

Check("a/c shorthand recognised as bank account", parser.TryExtract(
    "Transaction alert",
    "",
    "Your A/c XX9876 is debited by Rs.1,500.00 on 03-09-26",
    out var acShorthand)
    && acShorthand.InstrumentType == "BANK_ACCOUNT"
    && acShorthand.Amount == 1500m);

Check("fraud footer does not flip completed to failed", parser.TryExtract(
    "Transaction alert",
    "",
    "Your ICICI Bank Credit Card XX4444 has been charged Rs.799.00 at Netflix. If you have not performed this transaction, report unauthorised activity immediately.",
    out var footerEmail)
    && footerEmail.TransactionStatus == "COMPLETED"
    && footerEmail.Amount == 799m);

Check("suffix currency format is parsed", parser.TryExtract(
    "Transaction alert",
    "",
    "Your Axis Bank Debit Card ending 7788 was used for 349.00 INR at Swiggy",
    out var suffixAmount)
    && suffixAmount.Amount == 349m
    && suffixAmount.InstrumentType == "DEBIT_CARD");

Check("statement-only email still rejected", !parser.TryExtract(
    "Your credit card statement is ready",
    "",
    "Total amount due Rs.15,000.00. Minimum amount due Rs.750.00. Payment due date 20-09-26. Available credit limit Rs.85,000.00",
    out _));

// ── Real Gmail formats ────────────────────────────────────────────────────

Check("REAL: HDFC UPI debit from account", parser.TryExtract(
    "You have done a UPI txn. Check details!", "", GoodDaysApi.Tests.RealEmailSamples.HdfcUpiDebit, out var rHdfcDebit)
    && rHdfcDebit.Amount == 22666m
    && rHdfcDebit.Direction == "DEBIT"
    && rHdfcDebit.InstrumentType == "BANK_ACCOUNT"
    && rHdfcDebit.InstrumentLast4 == "0530"
    && rHdfcDebit.ReferenceNumber == "270770299058");

Check("REAL: HDFC UPI credit to account", parser.TryExtract(
    "Money received in your account", "", GoodDaysApi.Tests.RealEmailSamples.HdfcUpiCredit, out var rHdfcCredit)
    && rHdfcCredit.Amount == 2750m
    && rHdfcCredit.Direction == "CREDIT"
    && rHdfcCredit.InstrumentType == "BANK_ACCOUNT"
    && rHdfcCredit.InstrumentLast4 == "0530");

Check("REAL: HDFC NACH EMI debit", parser.TryExtract(
    "Debit alert", "", GoodDaysApi.Tests.RealEmailSamples.HdfcNachEmi, out var rNach)
    && rNach.Amount == 13709m
    && rNach.Direction == "DEBIT"
    && rNach.InstrumentType == "BANK_ACCOUNT"
    && rNach.InstrumentLast4 == "0530"
    && rNach.TransactionDateUtc?.Year == 2026);

CheckFn("REAL: Amazon Pay FASTag toll is single wallet debit", () =>
{
    var many = parser.ExtractMany("Toll payment successful", "", GoodDaysApi.Tests.RealEmailSamples.AmazonPayFastag);
    return many.Count == 1
        && many[0].Amount == 76m
        && many[0].Direction == "DEBIT"
        && many[0].InstrumentType == "WALLET";
});

Check("REAL: Zerodha deposit is a transfer out of account", parser.TryExtract(
    "Funds added", "", GoodDaysApi.Tests.RealEmailSamples.ZerodhaDeposit, out var rZerodha)
    && rZerodha.Amount == 390000m
    && rZerodha.InstrumentType == "BANK_ACCOUNT"
    && rZerodha.InstrumentLast4 == "0530"
    && rZerodha.TransactionType == "TRANSFER");

Check("REAL: Axis label-value credit card txn", parser.TryExtract(
    "Transaction alert on Axis Bank Credit Card", "", GoodDaysApi.Tests.RealEmailSamples.AxisCreditCard, out var rAxis)
    && rAxis.Amount == 67547m
    && rAxis.InstrumentType == "CREDIT_CARD"
    && rAxis.InstrumentLast4 == "3949"
    && rAxis.Merchant?.Contains("FLIPKART", StringComparison.OrdinalIgnoreCase) == true);

CheckFn("REAL: Axis email yields exactly one transaction", () =>
    parser.ExtractMany("Transaction alert", "", GoodDaysApi.Tests.RealEmailSamples.AxisCreditCard).Count == 1);

Check("REAL: SBI card spend via UPI stays a credit card", parser.TryExtract(
    "Transaction alert", "", GoodDaysApi.Tests.RealEmailSamples.SbiCardUpiSpend, out var rSbi)
    && rSbi.Amount == 3706.08m
    && rSbi.InstrumentType == "CREDIT_CARD"
    && rSbi.InstrumentLast4 == "0697"
    && rSbi.ReferenceNumber == "624425455781"
    && rSbi.Merchant?.Contains("AXISMAXLIFE", StringComparison.OrdinalIgnoreCase) == true);

Check("REAL: Amazon Pay payment to merchant", parser.TryExtract(
    "Your payment to SWIGGY was Approved", "", GoodDaysApi.Tests.RealEmailSamples.AmazonPayToMerchant, out var rApay, "payments-messages@amazon.in")
    && rApay.Amount == 335m
    && rApay.Direction == "DEBIT"
    && rApay.InstrumentType == "WALLET");

CheckFn("REAL: Swiggy itemised bill picks total paid", () =>
{
    var order = new OrderExtractionService();
    return order.TryExtract("Order delivered", "", GoodDaysApi.Tests.RealEmailSamples.SwiggyOrderItemised, out var o, "noreply@swiggy.in", new[] { "swiggy.in" })
        && o.TotalAmount == 800m;
});

// ── Learned issuer knowledge ──────────────────────────────────────────────

Check("INTEL: NACH mandate debit is classified as EMI", parser.TryExtract(
    "Debit alert", "", GoodDaysApi.Tests.RealEmailSamples.HdfcNachEmi, out var iEmi, "nachautoemailer@hdfcbank.bank.in")
    && iEmi.TransactionType == "BILL_PAYMENT"
    && iEmi.SuggestedCategory == "EMI"
    && iEmi.ProviderOrBank == "HDFC");

Check("INTEL: UMRN alone implies recurring mandate without sender hint", parser.TryExtract(
    "Debit alert", "", GoodDaysApi.Tests.RealEmailSamples.HdfcNachEmi, out var iUmrn)
    && iUmrn.TransactionType == "BILL_PAYMENT");

CheckFn("INTEL: issuer profile fills institution the body never states", () =>
{
    parser.TryExtract("Transaction alert", "", "Rs.500.00 spent on your Credit Card ending 1234 at BigBazaar on 01-09-26", out var withSender, "onlinesbicard@sbicard.com");
    parser.TryExtract("Transaction alert", "", "Rs.500.00 spent on your Credit Card ending 1234 at BigBazaar on 01-09-26", out var withoutSender);
    return withSender.ProviderOrBank == "SBI Card"
        && withoutSender.ProviderOrBank == null
        && withSender.ConfidenceScore > withoutSender.ConfidenceScore;
});

// ── Transaction detail richness ───────────────────────────────────────────

Check("DETAIL: UPI debit captures payee name and VPA", parser.TryExtract(
    "UPI txn", "", GoodDaysApi.Tests.RealEmailSamples.HdfcUpiDebit, out var dUpi, "alerts@hdfcbank.bank.in")
    && dUpi.CounterpartyName == "MAGANTI V S S KRISHNA SANDEEP"
    && dUpi.CounterpartyIdentifier == "maganti.s@axl");

Check("DETAIL: UPI credit captures sender name", parser.TryExtract(
    "Money received", "", GoodDaysApi.Tests.RealEmailSamples.HdfcUpiCredit, out var dCredit, "alerts@hdfcbank.bank.in")
    && dCredit.CounterpartyName?.Contains("RAGHUSALA", StringComparison.OrdinalIgnoreCase) == true);

Check("DETAIL: NACH debit captures biller as counterparty", parser.TryExtract(
    "Debit alert", "", GoodDaysApi.Tests.RealEmailSamples.HdfcNachEmi, out var dNach, "nachautoemailer@hdfcbank.bank.in")
    && dNach.CounterpartyName?.Contains("Kisetsu", StringComparison.OrdinalIgnoreCase) == true);

CheckFn("DETAIL: display title includes merchant and instrument", () =>
{
    var title = TransactionExtractionService.BuildDisplayTitle("FLIPKART IN", "Axis", "CREDIT_CARD", "3949", "PURCHASE", "DEBIT");
    return title == "FLIPKART IN · Axis Credit Card ••3949";
});

CheckFn("DETAIL: title falls back to a readable type when merchant is unknown", () =>
    TransactionExtractionService.BuildDisplayTitle(null, "HDFC", "BANK_ACCOUNT", "0530", "BILL_PAYMENT", "DEBIT")
        == "Auto-debit · HDFC A/c ••0530");

CheckFn("DETAIL: order line items are extracted with quantity and amount", () =>
{
    var order = new OrderExtractionService();
    var items = order.ExtractItems("Order delivered", "", GoodDaysApi.Tests.RealEmailSamples.SwiggyOrderItemised);
    return items.Count >= 2
        && items.Any(i => i.Name.Contains("Paya Shorba", StringComparison.OrdinalIgnoreCase) && i.Quantity == 1 && i.Amount == 275m)
        && items.Any(i => i.Name.Contains("Chicken", StringComparison.OrdinalIgnoreCase) && i.Amount == 495m)
        && !items.Any(i => i.Name.Contains("Taxes", StringComparison.OrdinalIgnoreCase));
});

Console.WriteLine($"{passed} passed, {failed} failed");
return failed == 0 ? 0 : 1;
