using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipeApp.Data;
using RecipeApp.Models;
using System.Security.Cryptography;
using System.Text;

namespace RecipeApp.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _db;

        public AuthController(AppDbContext db) => _db = db;

        // POST /api/auth/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] AuthRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
                return BadRequest(new { error = "Введите email и пароль" });

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == req.Email.Trim().ToLower());
            if (user == null)
                return Unauthorized(new { error = "Неверный email или пароль" });

            var hash = HashPassword(req.Password);
            if (user.PasswordHash != hash)
                return Unauthorized(new { error = "Неверный email или пароль" });

            return Ok(new {
                id          = user.Id,
                email       = user.Email,
                displayName = user.DisplayName ?? user.Email,
                avatarUrl   = user.AvatarUrl
            });
        }

        // POST /api/auth/register
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] AuthRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
                return BadRequest(new { error = "Введите email и пароль" });

            if (req.Password.Length < 8)
                return BadRequest(new { error = "Пароль должен быть не менее 8 символов" });

            var email = req.Email.Trim().ToLower();
            if (await _db.Users.AnyAsync(u => u.Email == email))
                return Conflict(new { error = "Пользователь с таким email уже существует" });

            var user = new User
            {
                Email        = email,
                PasswordHash = HashPassword(req.Password),
                DisplayName  = email.Split('@')[0], // имя по умолчанию из email
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            return Ok(new {
                id          = user.Id,
                email       = user.Email,
                displayName = user.DisplayName,
                avatarUrl   = (string?)null
            });
        }

        // SHA-256 хеш пароля
        private static string HashPassword(string password)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(password));
            return Convert.ToHexString(bytes).ToLower();
        }
    }

    public class AuthRequest
    {
        public string Email    { get; set; } = "";
        public string Password { get; set; } = "";
    }
}