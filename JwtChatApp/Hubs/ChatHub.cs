using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace JwtChatApp.Hubs;

[Authorize]
public class ChatHub : Hub
{
    public async Task SendMessage(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return;

        var name = Context.User?.Identity?.Name ?? "user";
        await Clients.All.SendAsync("ReceiveMessage", name, text.Trim());
    }
}
