using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using WarehouseAPI.Auth;
using WarehouseAPI.Data;
using WarehouseAPI.Services;

var builder = WebApplication.CreateBuilder(args);

// ============================================================
// DATABASE CONTEXTS
// ============================================================

// PostgreSQL — Transactional (OLTP)
var pgConn = builder.Configuration.GetConnectionString("PostgreSQL")
    ?? "Host=localhost;Port=5432;Database=warehouse;Username=app_user;Password=Warehouse@2026!";

// Log the resolved connection (without password) so we can verify env vars are picked up
var pgConnSanitized = System.Text.RegularExpressions.Regex.Replace(pgConn, @"Password=[^;]*", "Password=***");
Console.WriteLine($"[startup] PostgreSQL connection: {pgConnSanitized}");

builder.Services.AddDbContext<WarehouseDbContext>(options => options.UseNpgsql(pgConn));

// SQL Server — Data Warehouse (OLAP) — optional, fails gracefully
var sqlServerConn = builder.Configuration.GetConnectionString("SqlServer");
if (!string.IsNullOrEmpty(sqlServerConn))
{
    builder.Services.AddDbContext<DataWarehouseDbContext>(options =>
        options.UseSqlServer(sqlServerConn));
}
else
{
    // Register with SqlServer pointing to localhost — will fail gracefully
    // Analytics endpoints return empty arrays when DW is unavailable
    builder.Services.AddDbContext<DataWarehouseDbContext>(options =>
        options.UseSqlServer("Server=localhost;Database=WarehouseDW;Trusted_Connection=True;TrustServerCertificate=True;"));
}

// ============================================================
// AUTHENTICATION & AUTHORIZATION
// ============================================================

var jwtKey = builder.Configuration["Jwt:Key"] ?? "DefaultDevKey_ChangeInProduction_AtLeast32Chars!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "WarehouseAPI";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "WarehouseApp";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

// ============================================================
// SERVICES
// ============================================================

builder.Services.AddSingleton<IJwtService, JwtService>();

// Use LDAP auth if AD server is configured, otherwise use dev auth.
// Use IsNullOrWhiteSpace so a value like " " from env doesn't accidentally enable LDAP.
var adServer = builder.Configuration["AD:Server"]?.Trim();
if (!string.IsNullOrWhiteSpace(adServer))
{
    Console.WriteLine($"[startup] Auth mode: Active Directory (server={adServer})");
    builder.Services.AddSingleton<ILdapService, LdapService>();
}
else
{
    Console.WriteLine("[startup] Auth mode: Development (no AD configured)");
    builder.Services.AddSingleton<ILdapService, DevAuthService>();
}

builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IShipmentService, ShipmentService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();

// ============================================================
// API CONFIGURATION
// ============================================================

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// CORS — allow frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
                ?? ["http://localhost:5173", "http://localhost:3000", "http://localhost:80"])
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

var app = builder.Build();

// ============================================================
// MIDDLEWARE PIPELINE
// ============================================================

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    // Serve Swagger UI at /swagger
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "Warehouse API v1");
    });
}

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new
{
    Status = "Healthy",
    Timestamp = DateTime.UtcNow,
    Version = "1.0.0"
}));

// ============================================================
// VERIFY DATABASE CONNECTIVITY AT STARTUP (all environments)
// ============================================================

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<WarehouseDbContext>();
    try
    {
        var canConnect = await dbContext.Database.CanConnectAsync();
        if (canConnect)
        {
            app.Logger.LogInformation("PostgreSQL connection verified successfully.");
        }
        else
        {
            app.Logger.LogError("PostgreSQL CanConnect returned false. Check POSTGRES_HOST/POSTGRES_PASSWORD env vars.");
        }
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "PostgreSQL connection FAILED at startup. Connection string: {Conn}", pgConnSanitized);
    }
}

app.Run();
