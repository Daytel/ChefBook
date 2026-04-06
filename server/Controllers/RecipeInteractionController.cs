using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipeApp.Data;
using RecipeApp.Models;

namespace RecipeApp.Controllers
{
    [ApiController]
    [Route("api")]
    public class RecipeInteractionController : ControllerBase
    {
        private readonly AppDbContext _db;

        public RecipeInteractionController(AppDbContext db) => _db = db;

        // GET /api/recipes/{id}
        [HttpGet("recipes/{id:int}")]
        public async Task<IActionResult> GetRecipe(int id)
        {
            var recipe = await _db.Recipes
                .Include(r => r.Author)
                .Include(r => r.Photos)
                .Include(r => r.Steps)
                .Include(r => r.RecipeIngredients).ThenInclude(ri => ri.Ingredient)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (recipe == null) return NotFound(new { error = "Рецепт не найден" });

            return Ok(new {
                id                 = recipe.Id,
                title              = recipe.Title,
                description        = recipe.Description,
                cookingTimeMinutes = recipe.CookingTimeMinutes,
                author = new {
                    id        = recipe.Author?.Id,
                    name      = recipe.Author?.DisplayName ?? "Автор",
                    avatarUrl = recipe.Author?.AvatarUrl,
                    bio       = recipe.Author?.Bio
                },
                photos = recipe.Photos
                    .OrderByDescending(p => p.IsMain)
                    .Select(p => new { p.PhotoUrl, p.IsMain }).ToList(),
                steps = recipe.Steps
                    .OrderBy(s => s.StepNumber)
                    .Select(s => new { s.StepNumber, s.Instruction, s.PhotoUrl }).ToList(),
                ingredients = recipe.RecipeIngredients
                    .Where(ri => ri.Ingredient != null)
                    .Select(ri => new {
                        name     = ri.Ingredient!.Name,
                        quantity = ri.QuantityPerPortion,
                        unit     = ri.Unit
                    }).ToList()
            });
        }

        // GET /api/recipes/{id}/ingredients
        [HttpGet("recipes/{id:int}/ingredients")]
        public async Task<IActionResult> GetIngredients(int id)
        {
            var recipe = await _db.Recipes
                .Include(r => r.RecipeIngredients).ThenInclude(ri => ri.Ingredient)
                .FirstOrDefaultAsync(r => r.Id == id);
            if (recipe == null) return NotFound(new { error = "Рецепт не найден" });
            return Ok(new {
                recipeTitle = recipe.Title,
                ingredients = recipe.RecipeIngredients
                    .Where(ri => ri.Ingredient != null)
                    .Select(ri => new {
                        name     = ri.Ingredient!.Name,
                        quantity = ri.QuantityPerPortion,
                        unit     = ri.Unit
                    }).ToList()
            });
        }

        // POST /api/favorites/toggle/{recipeId}  body: { userId }
        [HttpPost("favorites/toggle/{recipeId:int}")]
        public async Task<IActionResult> ToggleFavorite(int recipeId, [FromBody] UserIdRequest req)
        {
            if (req.UserId <= 0) return Unauthorized(new { error = "Требуется авторизация" });
            if (!await _db.Recipes.AnyAsync(r => r.Id == recipeId))
                return NotFound(new { error = "Рецепт не найден" });

            var existing = await _db.Favorites.FindAsync(req.UserId, recipeId);
            bool isFavorite;
            if (existing != null) { _db.Favorites.Remove(existing); isFavorite = false; }
            else { _db.Favorites.Add(new Favorite { UserId = req.UserId, RecipeId = recipeId }); isFavorite = true; }

            await _db.SaveChangesAsync();
            return Ok(new { isFavorite });
        }

        // GET /api/favorites/check/{recipeId}?userId=N
        [HttpGet("favorites/check/{recipeId:int}")]
        public async Task<IActionResult> CheckFavorite(int recipeId, [FromQuery] int userId)
        {
            if (userId <= 0) return Ok(new { isFavorite = false });
            var isFavorite = await _db.Favorites
                .AnyAsync(f => f.UserId == userId && f.RecipeId == recipeId);
            return Ok(new { isFavorite });
        }

        // POST /api/subscriptions/toggle/{authorId}  body: { userId }
        [HttpPost("subscriptions/toggle/{authorId:int}")]
        public async Task<IActionResult> ToggleSubscription(int authorId, [FromBody] UserIdRequest req)
        {
            if (req.UserId <= 0) return Unauthorized(new { error = "Требуется авторизация" });
            if (!await _db.Users.AnyAsync(u => u.Id == authorId))
                return NotFound(new { error = "Автор не найден" });

            var existing = await _db.Subscriptions.FindAsync(req.UserId, authorId);
            bool isSubscribed;
            if (existing != null) { _db.Subscriptions.Remove(existing); isSubscribed = false; }
            else { _db.Subscriptions.Add(new Subscription { FollowerId = req.UserId, AuthorId = authorId, IsNotified = true }); isSubscribed = true; }

            await _db.SaveChangesAsync();
            return Ok(new { isSubscribed });
        }

        // GET /api/subscriptions/check/{authorId}?userId=N
        [HttpGet("subscriptions/check/{authorId:int}")]
        public async Task<IActionResult> CheckSubscription(int authorId, [FromQuery] int userId)
        {
            if (userId <= 0) return Ok(new { isSubscribed = false });
            var isSubscribed = await _db.Subscriptions
                .AnyAsync(s => s.FollowerId == userId && s.AuthorId == authorId);
            return Ok(new { isSubscribed });
        }

        // POST /api/comments  body: { userId, recipeId, text }
        [HttpPost("comments")]
        public async Task<IActionResult> AddComment([FromBody] AddCommentRequest request)
        {
            if (request.UserId <= 0) return Unauthorized(new { error = "Требуется авторизация" });
            if (string.IsNullOrWhiteSpace(request.Text))
                return BadRequest(new { error = "Комментарий не может быть пустым" });
            if (request.Text.Length > 1000)
                return BadRequest(new { error = "Слишком длинный (макс. 1000 символов)" });
            if (!await _db.Recipes.AnyAsync(r => r.Id == request.RecipeId))
                return NotFound(new { error = "Рецепт не найден" });

            var comment = new RecipeComment {
                UserId      = request.UserId,
                RecipeId    = request.RecipeId,
                CommentText = request.Text.Trim(),
                CreatedAt   = DateTime.Now
            };
            _db.RecipeComments.Add(comment);
            await _db.SaveChangesAsync();

            var author = await _db.Users.FindAsync(request.UserId);
            return Ok(new {
                id         = comment.Id,
                authorName = author?.DisplayName ?? "Гость",
                text       = comment.CommentText,
                createdAt  = comment.CreatedAt.ToString("dd.MM.yyyy HH:mm")
            });
        }

        // GET /api/comments/{recipeId}
        [HttpGet("comments/{recipeId:int}")]
        public async Task<IActionResult> GetComments(int recipeId)
        {
            var comments = await _db.RecipeComments
                .Where(c => c.RecipeId == recipeId)
                .OrderByDescending(c => c.CreatedAt)
                .Join(_db.Users, c => c.UserId, u => u.Id,
                    (c, u) => new {
                        id         = c.Id,
                        authorName = u.DisplayName ?? "Гость",
                        text       = c.CommentText,
                        createdAt  = c.CreatedAt.ToString("dd.MM.yyyy HH:mm")
                    })
                .ToListAsync();
            return Ok(comments);
        }
    }

    public class UserIdRequest           { public int UserId    { get; set; } }
    public class AddCommentRequest       { public int UserId { get; set; } public int RecipeId { get; set; } public string Text { get; set; } = ""; }
}