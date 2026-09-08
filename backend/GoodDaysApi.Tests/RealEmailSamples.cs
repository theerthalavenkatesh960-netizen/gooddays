using GoodDaysApi.Services.Gmail;

namespace GoodDaysApi.Tests;

// Bodies below are real Gmail formats (identifiers altered); they are the accuracy contract for the parser.
public static class RealEmailSamples
{
    public const string HdfcUpiDebit = @"Dear Customer,

Greetings from HDFC Bank!

Rs.22666.00 is debited from your account ending 0530 towards VPA maganti.s@axl (MAGANTI V S S KRISHNA SANDEEP) on 02-09-26.

UPI transaction reference no.: 270770299058.

If you did not authorize this transaction, please report it immediately at:
a. When in India (Toll free): 1800 258 6161";

    public const string HdfcUpiCredit = @"Dear Customer,

Greetings from HDFC Bank!

We're writing to inform you that Rs.2750.00 has been successfully credited to your HDFC Bank account ending in 0530.

Transaction Details:
a. Date: 21-08-26
b. Sender: RAGHUSALA PREM KUMAR (VPA: 6309511323@axl)
c. UPI Reference No.: 353872310038";

    public const string HdfcNachEmi = @"Dear Customer,

Rs.13709.00 has been debited from HDFC Bank Account Number XXXXXXXXXX0530 towards Kisetsu Saison Finance India Pvt Ltd/PRP598211 with UMRN HDFC7011002251027036 on 05-Aug-2026.

Assuring you of our best services at all times.

If you have not done above transaction, please immediately call on 18002586161 to report such transaction.";

    public const string AmazonPayFastag = @"Hi Venkatesh,

Your toll payment of Rs.76.0 at Toll gate BasanthnagarTollplaza was successful, your wallet balance is Rs.1856.35.

View Order Details
Paid on		Amount
	Amazon.in	₹76.0
Updated Amazon Pay balance	₹1856.35
Money	₹1856.35
Gifts, Cashbacks and Refunds	₹0.00
Order Details
	FASTag toll payment
Order Id	P04-2340134-0890023
Order Date	26-Apr-2026";

    public const string ZerodhaDeposit = @"Hi Venkatesh
₹390000.00 has been deposited to Zerodha equity from account 0530 through UPI on 16 Mar 2026. Your transaction Reference number is 307710620756.

Amount	390000.00
Reference Number	307710620756
Date	16 Mar 2026";

    public const string AxisCreditCard = @"30-08-2026

Dear Venkatesh Theerthala,

Here's the summary of your Axis Bank Credit Card Transaction:
	
Transaction Amount:
INR 67547
	
Merchant Name:
FLIPKART IN
	
Axis Bank Credit Card No.
XX3949
	
Date & Time:
30-08-2026, 20:01:12 IST
	
Available Limit*:
INR 112598
	
Total Credit Limit*:
INR 189000";

    public const string SbiCardUpiSpend = @"Dear Cardholder,

This is to inform you that,

Rs.3,706.08 spent on your SBI Credit Card ending with 0697 at AXISMAXLIFEINSURANCE on 01-09-26 via UPI (Ref No. 624425455781). Trxn. not done by you? Report at https://sbicard.com/Dispute . If you have not authorized this transaction please contact the SBI Card helpline.";

    public const string AmazonPayToMerchant = @"Hi Venkatesh,

Your payment to SWIGGY was Approved

Paid to	Amount
SWIGGY	₹335.0
Seller	SWIGGY
SWIGGY Id	swiggy-271083812000097
Transaction ID	P04-2645487-7059995
Payment date	Saturday, 29 August, 2026 18:33:33 PM IST";

    public const string SwiggyOrderItemised = @"Order ID: 246264634176998

BILL DETAILS
Paya Shorba Full x1		₹275
Coriander (kothimeera) Chicken x1		₹495
Restaurant Packaging		₹25
Platform fee with GST		₹17.58
Discount Applied (SWIGGYIT)		- ₹49.99
Taxes		₹37.75
Paid Via Credit/Debit card		₹800";
}
