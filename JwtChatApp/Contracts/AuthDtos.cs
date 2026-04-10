using System.ComponentModel.DataAnnotations;

namespace JwtChatApp.Contracts;

public class RegisterRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = "";

    [Required]
    [MinLength(4)]
    public string Password { get; set; } = "";
}

public class LoginRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = "";

    [Required]
    public string Password { get; set; } = "";
}

public class AuthResponse
{
    public string Token { get; set; } = "";
    public DateTime ExpiresAtUtc { get; set; }
    public string UserName { get; set; } = "";
}
