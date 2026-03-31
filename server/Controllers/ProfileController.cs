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

            var recipesCount   = await _db.Recipes.CountAsync(r => r.AuthorId == userId);
            var followersCount = await _db.Subscriptions.CountAsync(s => s.AuthorId == userId);

            return Ok(new {
                id            = user.Id,
                email         = user.Email,
                displayName   = user.DisplayName,
                avatarUrl     = user.AvatarUrl,
                bio           = user.Bio,
                plannerNotifEnabled = user.PlannerNotifEnabled,
                plannerNotifFreq    = user.PlannerNotifFreq ?? "daily",
                recipesCount,
                followersCount
            });
        }

        // PUT /api/profile/{userId}  — обновить имя, bio, настройки планировщика
        [HttpPut("{userId:int}")]
        public async Task<IActionResult> UpdateProfile(int userId, [FromBody] UpdateProfileRequest req)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return NotFound(new { error = "Пользователь не найден" });

            if (req.DisplayName != null) user.DisplayName         = req.DisplayName.Trim();
            if (req.Bio         != null) user.Bio                 = req.Bio.Trim();
            if (req.PlannerNotifEnabled.HasValue) user.PlannerNotifEnabled = req.PlannerNotifEnabled.Value;
            if (req.PlannerNotifFreq   != null)   user.PlannerNotifFreq   = req.PlannerNotifFreq;

            await _db.SaveChangesAsync();
            return Ok(new { ok = true });
        }

        // GET /api/profile/{userId}/recipes  — рецепты пользователя
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

        private void DeleteImageFiles(IEnumerable<string> urls)
        {
            foreach (var url in urls)
            {
                if (string.IsNullOrEmpty(url) || !url.StartsWith("/images/")) continue;
                var path = Path.Combine(_env.WebRootPath, url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                if (System.IO.File.Exists(path))
                    try { System.IO.File.Delete(path); } catch { /* ignore */ }
            }
        }
    }

    public class UpdateProfileRequest
    {
        public string? DisplayName         { get; set; }
        public string? Bio                 { get; set; }
        public bool?   PlannerNotifEnabled { get; set; }
        public string? PlannerNotifFreq    { get; set; }
    }
}