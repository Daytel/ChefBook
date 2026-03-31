using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipeApp.Data;

namespace RecipeApp.Controllers
{
    [ApiController]
    [Route("api/saved")]
    public class SavedController : ControllerBase
    {
        private readonly AppDbContext _db;
        public SavedController(AppDbContext db) => _db = db;

        // GET /api/saved/{userId}  — избранные рецепты пользователя
        [HttpGet("{userId:int}")]
        public async Task<IActionResult> GetSaved(int userId)
        {
            var favorites = await _db.Favorites
                .Where(f => f.UserId == userId)
                .Join(_db.Recipes, f => f.RecipeId, r => r.Id, (f, r) => r)
                .Include(r => r.Photos)
                .Include(r => r.Author)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new {
                    id                 = r.Id,
                    title              = r.Title,
                    description        = r.Description,
                    cookingTimeMinutes = r.CookingTimeMinutes,
                    mainPhoto          = r.Photos
                                          .Where(p => p.IsMain).Select(p => p.PhotoUrl).FirstOrDefault()
                                        ?? r.Photos.Select(p => p.PhotoUrl).FirstOrDefault(),
                    authorId   = r.Author != null ? r.Author.Id : 0,
                    authorName = r.Author != null ? (r.Author.DisplayName ?? r.Author.Email) : "Автор",
                    authorAvatarUrl = r.Author != null ? r.Author.AvatarUrl : null,
                    authorBio       = r.Author != null ? r.Author.Bio : null
                })
                .ToListAsync();

            return Ok(favorites);
        }
    }
}