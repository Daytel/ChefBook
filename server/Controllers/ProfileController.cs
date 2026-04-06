using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipeApp.Data;
using RecipeApp.Models;

namespace RecipeApp.Controllers
{
    [ApiController]
    [Route("api/profile")]
    public class ProfileController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;

        public ProfileController(AppDbContext db, IWebHostEnvironment env)
        { _db = db; _env = env; }

        // GET /api/profile/{userId}
        [HttpGet("{userId:int}")]
        public async Task<IActionResult> GetProfile(int userId)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return NotFound(new { error = "Пользователь не найден" });

            return Ok(new {
                id            = user.Id,
                email         = user.Email,
                displayName   = user.DisplayName,
                avatarUrl     = user.AvatarUrl,
                bio           = user.Bio,
                plannerNotifEnabled = user.PlannerNotifEnabled,
                plannerNotifFreq    = user.PlannerNotifFreq ?? "daily",
                recipesCount   = await _db.Recipes.CountAsync(r => r.AuthorId == userId),
                followersCount = await _db.Subscriptions.CountAsync(s => s.AuthorId == userId)
            });
        }

        // PUT /api/profile/{userId}  — обновить имя, bio, настройки планировщика
        [HttpPut("{userId:int}")]
        public async Task<IActionResult> UpdateProfile(int userId, [FromBody] UpdateProfileRequest req)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return NotFound(new { error = "Пользователь не найден" });

            if (req.DisplayName != null) user.DisplayName = req.DisplayName.Trim();
            if (req.Bio         != null) user.Bio         = req.Bio.Trim();
            if (req.PlannerNotifEnabled.HasValue) user.PlannerNotifEnabled = req.PlannerNotifEnabled.Value;
            if (req.PlannerNotifFreq   != null)   user.PlannerNotifFreq   = req.PlannerNotifFreq;

            // Аватар: принимаем ТОЛЬКО base64 (data:image/...) — короткий путь сохраняем в БД
            // Абсолютные URL (http://...) и null — игнорируем (аватар не меняется)
            if (!string.IsNullOrEmpty(req.AvatarUrl) && req.AvatarUrl.StartsWith("data:"))
            {
                var savedPath = SaveBase64Image(req.AvatarUrl, $"avatar_{userId}");
                if (savedPath != null)
                {
                    if (!string.IsNullOrEmpty(user.AvatarUrl) && user.AvatarUrl.StartsWith("/images/"))
                        DeleteFile(user.AvatarUrl);
                    user.AvatarUrl = savedPath; // сохраняем короткий путь /images/...
                }
            }

            await _db.SaveChangesAsync();
            return Ok(new { ok = true, avatarUrl = user.AvatarUrl });
        }

        // GET /api/profile/{userId}/recipes
        [HttpGet("{userId:int}/recipes")]
        public async Task<IActionResult> GetUserRecipes(int userId)
        {
            var recipes = await _db.Recipes
                .Where(r => r.AuthorId == userId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new { id = r.Id, title = r.Title, createdAt = r.CreatedAt })
                .ToListAsync();
            return Ok(recipes);
        }

        // DELETE /api/profile/recipes/{recipeId}?userId=N
        [HttpDelete("recipes/{recipeId:int}")]
        public async Task<IActionResult> DeleteRecipe(int recipeId, [FromQuery] int userId)
        {
            var recipe = await _db.Recipes
                .Include(r => r.Photos)
                .Include(r => r.Steps)
                .FirstOrDefaultAsync(r => r.Id == recipeId && r.AuthorId == userId);
            if (recipe == null) return NotFound(new { error = "Рецепт не найден" });

            // Удаляем файлы фото с диска
            DeleteImageFiles(recipe.Photos.Select(p => p.PhotoUrl));
            DeleteImageFiles(recipe.Steps.Select(s => s.PhotoUrl).Where(u => u != null)!);

            _db.Recipes.Remove(recipe);
            await _db.SaveChangesAsync();
            return Ok(new { ok = true });
        }

        // GET /api/profile/{userId}/subscriptions  — список подписок
        [HttpGet("{userId:int}/subscriptions")]
        public async Task<IActionResult> GetSubscriptions(int userId)
        {
            var subs = await _db.Subscriptions
                .Where(s => s.FollowerId == userId)
                .Join(_db.Users, s => s.AuthorId, u => u.Id,
                    (s, u) => new {
                        authorId   = u.Id,
                        authorName = u.DisplayName ?? u.Email,
                        isNotified = s.IsNotified
                    })
                .ToListAsync();
            return Ok(subs);
        }

        // PATCH /api/profile/subscriptions/{authorId}/notify?userId=N&enabled=true
        [HttpPatch("subscriptions/{authorId:int}/notify")]
        public async Task<IActionResult> SetNotify(int authorId, [FromQuery] int userId, [FromQuery] bool enabled)
        {
            var sub = await _db.Subscriptions
                .FirstOrDefaultAsync(s => s.FollowerId == userId && s.AuthorId == authorId);
            if (sub == null) return NotFound(new { error = "Подписка не найдена" });
            sub.IsNotified = enabled;
            await _db.SaveChangesAsync();
            return Ok(new { ok = true });
        }

        private string? SaveBase64Image(string dataUrl, string baseName)
        {
            try
            {
                var commaIdx = dataUrl.IndexOf(',');
                if (commaIdx < 0) return null;
                var header  = dataUrl[..commaIdx];
                var base64  = dataUrl[(commaIdx + 1)..];
                var mime    = header.Split(':')[1].Split(';')[0];
                var ext     = mime switch { "image/png" => "png", "image/webp" => "webp", "image/gif" => "gif", _ => "jpg" };
                var fileName = $"{baseName}_{DateTime.Now:yyyyMMddHHmmss}.{ext}";
                var dir      = Path.Combine(_env.WebRootPath, "images");
                Directory.CreateDirectory(dir);
                System.IO.File.WriteAllBytes(Path.Combine(dir, fileName), Convert.FromBase64String(base64));
                return $"/images/{fileName}";
            }
            catch (Exception ex) { Console.Error.WriteLine($"SaveBase64Image: {ex.Message}"); return null; }
        }

        private void DeleteFile(string url)
        {
            var path = Path.Combine(_env.WebRootPath, url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (System.IO.File.Exists(path)) try { System.IO.File.Delete(path); } catch { }
        }

        private void DeleteImageFiles(IEnumerable<string> urls)
        {
            foreach (var url in urls) if (!string.IsNullOrEmpty(url)) DeleteFile(url);
        }
    }

    public class UpdateProfileRequest
    {
        public string? DisplayName         { get; set; }
        public string? Bio                 { get; set; }
        public string? AvatarUrl           { get; set; }
        public bool?   PlannerNotifEnabled { get; set; }
        public string? PlannerNotifFreq    { get; set; }
    }
}