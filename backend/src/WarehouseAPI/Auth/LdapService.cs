using System.DirectoryServices.Protocols;
using System.Net;

namespace WarehouseAPI.Auth;

public interface ILdapService
{
    /// <summary>
    /// Authenticate a user against Active Directory via LDAP bind.
    /// Returns true if credentials are valid.
    /// </summary>
    bool Authenticate(string username, string password);

    /// <summary>
    /// Check if the LDAP/AD server is reachable.
    /// </summary>
    bool IsAvailable();
}

/// <summary>
/// LDAP authentication service for Active Directory.
/// Binds to the AD server on Windows Server 2022 (VM2).
/// </summary>
public class LdapService : ILdapService
{
    private readonly IConfiguration _config;
    private readonly ILogger<LdapService> _logger;

    public LdapService(IConfiguration config, ILogger<LdapService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public bool Authenticate(string username, string password)
    {
        var server = _config["AD:Server"];
        var domain = _config["AD:Domain"] ?? "capstone.local";
        var port = int.TryParse(_config["AD:Port"], out var p) ? p : 389;

        if (string.IsNullOrEmpty(server))
        {
            _logger.LogWarning("AD server not configured. LDAP authentication unavailable.");
            return false;
        }

        try
        {
            var identifier = new LdapDirectoryIdentifier(server, port);
            var credential = new NetworkCredential($"{username}@{domain}", password);

            using var connection = new LdapConnection(identifier, credential, AuthType.Basic);
            connection.SessionOptions.ProtocolVersion = 3;
            connection.Bind(); // Throws if credentials are invalid

            _logger.LogInformation("LDAP authentication successful for user: {Username}", username);
            return true;
        }
        catch (LdapException ex)
        {
            _logger.LogWarning("LDAP authentication failed for user: {Username}. Error: {Error}", username, ex.Message);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during LDAP authentication for user: {Username}", username);
            return false;
        }
    }

    public bool IsAvailable()
    {
        var server = _config["AD:Server"];
        return !string.IsNullOrEmpty(server);
    }
}

/// <summary>
/// Development-mode authentication service that bypasses LDAP.
/// Always authenticates successfully for local development.
/// </summary>
public class DevAuthService : ILdapService
{
    private readonly ILogger<DevAuthService> _logger;

    public DevAuthService(ILogger<DevAuthService> logger)
    {
        _logger = logger;
    }

    public bool Authenticate(string username, string password)
    {
        _logger.LogWarning("DEV MODE: Bypassing LDAP authentication for user: {Username}", username);
        // In dev mode, accept any non-empty credentials
        return !string.IsNullOrWhiteSpace(username) && !string.IsNullOrWhiteSpace(password);
    }

    public bool IsAvailable() => true;
}
