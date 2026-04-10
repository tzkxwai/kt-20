using JwtChatApp.Contracts;
using JwtChatApp.Options;
using JwtChatApp.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace JwtChatApp.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<IdentityUser> _userManager;
    private readonly ITokenService _tokenService;
    private readonly JwtSettings _jwt;

    public AuthController(
        UserManager<IdentityUser> userManager,
        ITokenService tokenService,
        IOptions<JwtSettings> jwt)
    {
        _userManager = userManager;
        _tokenService = tokenService;
        _jwt = jwt.Value;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        var user = new IdentityUser { UserName = request.Email, Email = request.Email };
        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        var token = await _tokenService.CreateTokenAsync(user, ct);
        return Ok(new AuthResponse
        {
            Token = token,
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(_jwt.ExpiresMinutes),
            UserName = user.UserName ?? request.Email
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null || !await _userManager.CheckPasswordAsync(user, request.Password))
            return Unauthorized(new { error = "Неверный email или пароль." });

        var token = await _tokenService.CreateTokenAsync(user, ct);
        return Ok(new AuthResponse
        {
            Token = token,
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(_jwt.ExpiresMinutes),
            UserName = user.UserName ?? request.Email
        });
    }
}
