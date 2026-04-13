using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Auth;
using WarehouseAPI.Data;
using WarehouseAPI.DTOs;

namespace WarehouseAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ILdapService _ldap;
    private readonly IJwtService _jwt;
    private readonly WarehouseDbContext _db;
    private readonly ILogger<AuthController> _logger;

    public AuthController(ILdapService ldap, IJwtService jwt, WarehouseDbContext db, ILogger<AuthController> logger)
    {
        _ldap = ldap;
        _jwt = jwt;
        _db = db;
        _logger = logger;
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), 200)]
    [ProducesResponseType(typeof(ApiError), 401)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        // Authenticate via LDAP (or dev mode)
        if (!_ldap.Authenticate(request.Username, request.Password))
        {
            return Unauthorized(new ApiError("Invalid username or password"));
        }

        // Find or create user record
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == request.Username);
        if (user is null)
        {
            // Auto-provision user on first login
            user = new Models.User
            {
                Username = request.Username,
                Email = $"{request.Username}@capstone.local",
                FullName = request.Username, // Will be updated from AD later
                Role = "Staff",
                AdUsername = request.Username
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
            _logger.LogInformation("Auto-provisioned new user: {Username}", request.Username);
        }

        var token = _jwt.GenerateToken(user.Username, user.FullName, user.Role);
        var expiresAt = DateTime.UtcNow.AddHours(8);

        return Ok(new LoginResponse(token, user.Username, user.FullName, user.Role, expiresAt));
    }

    [HttpGet("status")]
    public IActionResult Status()
    {
        return Ok(new
        {
            LdapAvailable = _ldap.IsAvailable(),
            Mode = _ldap.IsAvailable() ? "Active Directory" : "Development (no AD)"
        });
    }
}
