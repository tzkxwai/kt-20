using Microsoft.AspNetCore.Identity;

namespace JwtChatApp.Services;

public interface ITokenService
{
    Task<string> CreateTokenAsync(IdentityUser user, CancellationToken cancellationToken = default);
}
