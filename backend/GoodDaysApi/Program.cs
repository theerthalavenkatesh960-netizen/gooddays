using GoodDaysApi.Data;
using GoodDaysApi.Services;
using GoodDaysApi.Services.Ai;
using GoodDaysApi.Services.Gmail;
using GoodDaysApi.Services.Financial;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Swashbuckle.AspNetCore.SwaggerGen; 
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();

// Enable CORS — allow all origins so the Netlify-hosted SPA can reach this API.
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var connectionString = builder.Configuration.GetConnectionString("Default");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "A PostgreSQL connection string must be provided via 'ConnectionStrings:Default'.");
}

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(connectionString)
       .UseSnakeCaseNamingConvention());

builder.Services.Configure<GmailOptions>(builder.Configuration.GetSection("Google"));

// Register Financial Services
builder.Services.AddScoped<IFinancialService, FinancialService>();
builder.Services.AddHostedService<MonthlyTaskGeneratorService>();

// Register User Seeder Service
builder.Services.AddScoped<GoodDaysApi.Services.IUserSeederService, GoodDaysApi.Services.UserSeederService>();

// Register Clerk Auth Service
builder.Services.AddScoped<GoodDaysApi.Services.IClerkAuthService, GoodDaysApi.Services.ClerkAuthService>();

// Register Gmail finance sync services
builder.Services.AddSingleton<ITokenEncryptionService, TokenEncryptionService>();
builder.Services.AddScoped<GoodDaysApi.Services.Gmail.Repositories.IConnectedEmailAccountRepository, GoodDaysApi.Services.Gmail.Repositories.ConnectedEmailAccountRepository>();
builder.Services.AddScoped<GoodDaysApi.Services.Gmail.Repositories.ISyncedEmailRepository, GoodDaysApi.Services.Gmail.Repositories.SyncedEmailRepository>();
builder.Services.AddScoped<ITransactionExtractionService, TransactionExtractionService>();
builder.Services.AddScoped<IGmailService, GmailService>();
builder.Services.AddScoped<IGmailSyncService, GmailSyncService>();
builder.Services.AddScoped<GoodDaysApi.Services.Gmail.ICardMatchingService, GoodDaysApi.Services.Gmail.CardMatchingService>();
builder.Services.AddScoped<GoodDaysApi.Services.Gmail.ICardStatementExtractionService, GoodDaysApi.Services.Gmail.CardStatementExtractionService>();
builder.Services.AddScoped<GoodDaysApi.Services.Gmail.IOrderExtractionService, GoodDaysApi.Services.Gmail.OrderExtractionService>();
builder.Services.AddScoped<GoodDaysApi.Services.Gmail.IOrderMatchingService, GoodDaysApi.Services.Gmail.OrderMatchingService>();
builder.Services.AddScoped<GoodDaysApi.Services.Gmail.IMerchantAliasService, GoodDaysApi.Services.Gmail.MerchantAliasService>();
builder.Services.AddScoped<GoodDaysApi.Services.Gmail.ISenderReliabilityService, GoodDaysApi.Services.Gmail.SenderReliabilityService>();
builder.Services.AddHostedService<GmailSyncBackgroundWorker>();

// Register AI Service
builder.Services.AddScoped<AiService>();

// Register meal services
builder.Services.AddScoped<MealMacroCalculatorService>();
builder.Services.AddScoped<WeeklyGoalAdjustmentService>();
builder.Services.AddHostedService<WeeklyReviewGenerationService>();

// Register AI Chat Services
builder.Services.AddScoped<IAiToolsRegistry, AiToolsRegistry>();
builder.Services.AddScoped<IAiChatService, AiChatService>();
builder.Services.AddScoped<IAiToolExecutor, AiToolExecutor>();


// Register LLM Provider based on configuration
builder.Services.AddScoped<ILlmProvider>(provider =>
{
    var config = provider.GetRequiredService<IConfiguration>();
    var userSettings = provider.GetRequiredService<AppDbContext>().UserAiSettings.AsNoTracking().FirstOrDefault();
    
    var providerType = userSettings?.Provider ?? config.GetValue<string>("Ai:Provider") ?? "local-llama";
    var localEndpoint = userSettings?.LocalEndpoint ?? config.GetValue<string>("Ai:LocalEndpoint") ?? "http://localhost:11434";
    var localModel = userSettings?.LocalModel ?? config.GetValue<string>("Ai:LocalModel") ?? "llama3.1:8b";
    var claudeApiKey = userSettings?.ClaudeApiKey ?? config.GetValue<string>("Ai:ClaudeApiKey");
    var claudeModel = userSettings?.ClaudeModel ?? config.GetValue<string>("Ai:ClaudeModel") ?? "claude-3-5-sonnet-latest";

    if (providerType == "claude" && !string.IsNullOrWhiteSpace(claudeApiKey))
    {
        return new ClaudeLlmProvider(claudeApiKey, claudeModel);
    }
    
    return new LocalLlmProvider(localEndpoint, localModel);
});

// Register Onboarding Service
builder.Services.AddScoped<IOnboardingService, OnboardingService>();

var jwtKey = builder.Configuration["Jwt:Key"] ?? "change_this_to_a_secure_random_key";
var key = Encoding.ASCII.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRouting();
app.UseCors("FrontendPolicy");
app.UseAuthentication();
app.UseAuthorization();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));
app.MapControllers();

app.Run();

public partial class Program { }
