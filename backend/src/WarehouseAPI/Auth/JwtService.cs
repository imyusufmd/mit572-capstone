using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace WarehouseAPI.Auth;

public interface IJwtService
{
    string GenerateToken(string username, string fullName, string role);
}

public class JwtService : IJwtService
{
    private readonly IConfiguration _config;

    public JwtService(IConfiguration config)
    {
        _config = config;
    }

    public string GenerateToken(string username, string fullName, string role)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Key"] ?? "DefaultDevKey_ChangeInProduction_AtLeast32Chars!"));

        var claims = new[]
        {
            new Claim(ClaimTypes.Name, username),
            new Claim("full_name", fullName),
            new Claim(ClaimTypes.Role, role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"] ?? "WarehouseAPI",
            audience: _config["Jwt:Audience"] ?? "WarehouseApp",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(
                double.TryParse(_config["Jwt:ExpiresInHours"], out var hours) ? hours : 8),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
