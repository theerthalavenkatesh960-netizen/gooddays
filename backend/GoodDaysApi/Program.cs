using GoodDaysApi.Data;
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
        o.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles);
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

// Register Gmail finance sync services
builder.Services.AddSingleton<ITokenEncryptionService, TokenEncryptionService>();
builder.Services.AddScoped<GoodDaysApi.Services.Gmail.Repositories.IConnectedEmailAccountRepository, GoodDaysApi.Services.Gmail.Repositories.ConnectedEmailAccountRepository>();
builder.Services.AddScoped<GoodDaysApi.Services.Gmail.Repositories.ISyncedEmailRepository, GoodDaysApi.Services.Gmail.Repositories.SyncedEmailRepository>();
builder.Services.AddScoped<ITransactionExtractionService, TransactionExtractionService>();
builder.Services.AddScoped<IGmailService, GmailService>();
builder.Services.AddScoped<IGmailSyncService, GmailSyncService>();
builder.Services.AddHostedService<GmailSyncBackgroundWorker>();

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
