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
        private const int TEMP_USER_ID = 1;

        public RecipeInteractionController(AppDbContext db) => _db = db;

        // GET /api/recipes/{id} — полные данные рецепта
        [HttpGet("recipes/{id:int}")]
        public async Task<IActionResult> GetRecipe(int id)
        {
            var recipe = await _db.Recipes
                .Include(r => r.Author)
                .Include(r => r.Photos)
                .Include(r => r.Steps)
                .Include(r => r.RecipeIngredients).ThenInclude(ri => ri.Ingredient)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (recipe == null)
                return NotFound(new { error = "Рецепт не найден" });

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
                    .Select(p => new { p.PhotoUrl, p.IsMain })
                    .ToList(),
                steps = recipe.Steps
                    .OrderBy(s => s.StepNumber)
                    .Select(s => new { s.StepNumber, s.Instruction, s.PhotoUrl })
                    .ToList(),
                ingredients = recipe.RecipeIngredients
                    .Where(ri => ri.Ingredient != null)
                    .Select(ri => new {
                        name     = ri.Ingredient!.Name,
                        quantity = ri.QuantityPerPortion,
                        unit     = ri.Unit
                    })
                    .ToList()
            });
        }

        // GET /api/recipes/{id}/ingredients — для модалки «Состав»
        [HttpGet("recipes/{id:int}/ingredients")]
        public async Task<IActionResult> GetIngredients(int id)
        {
            var recipe = await _db.Recipes
                .Include(r => r.RecipeIngredients).ThenInclude(ri => ri.Ingredient)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (recipe == null)
                return NotFound(new { error = "Рецепт не найден" });

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

        // POST /api/favorites/toggle/{recipeId}
        [HttpPost("favorites/toggle/{recipeId:int}")]
        public async Task<IActionResult> ToggleFavorite(int recipeId)
        {
            if (!await _db.Recipes.AnyAsync(r => r.Id == recipeId))
                return NotFound(new { error = "Рецепт не найден" });

            var existing = await _db.Favorites.FindAsync(TEMP_USER_ID, recipeId);
            bool isFavorite;
            if (existing != null) { _db.Favorites.Remove(existing); isFavorite = false; }
            else { _db.Favorites.Add(new Favorite { UserId = TEMP_USER_ID, RecipeId = recipeId }); isFavorite = true; }

            await _db.SaveChangesAsync();
            return Ok(new { isFavorite });
        }

        // GET /api/favorites/check/{recipeId}
        [HttpGet("favorites/check/{recipeId:int}")]
        public async Task<IActionResult> CheckFavorite(int recipeId)
        {
            var isFavorite = await _db.Favorites
                .AnyAsync(f => f.UserId == TEMP_USER_ID && f.RecipeId == recipeId);
            return Ok(new { isFavorite });
        }

        // POST /api/subscriptions/toggle/{authorId}
        [HttpPost("subscriptions/toggle/{authorId:int}")]
        public async Task<IActionResult> ToggleSubscription(int authorId)
        {
            if (!await _db.Users.AnyAsync(u => u.Id == authorId))
                return NotFound(new { error = "Автор не найден" });

            var existing = await _db.Subscriptions
                .FindAsync(TEMP_USER_ID, authorId);
            bool isSubscribed;
            if (existing != null) { _db.Subscriptions.Remove(existing); isSubscribed = false; }
            else { _db.Subscriptions.Add(new Subscription { FollowerId = TEMP_USER_ID, AuthorId = authorId, IsNotified = true }); isSubscribed = true; }

            await _db.SaveChangesAsync();
            return Ok(new { isSubscribed });
        }

        // GET /api/subscriptions/check/{authorId}
        [HttpGet("subscriptions/check/{authorId:int}")]
        public async Task<IActionResult> CheckSubscription(int authorId)
        {
            var isSubscribed = await _db.Subscriptions
                .AnyAsync(s => s.FollowerId == TEMP_USER_ID && s.AuthorId == authorId);
            return Ok(new { isSubscribed });
        }

        // POST /api/comments
        [HttpPost("comments")]
        public async Task<IActionResult> AddComment([FromBody] AddCommentRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Text))
                return BadRequest(new { error = "Комментарий не может быть пустым" });
            if (request.Text.Length > 1000)
                return BadRequest(new { error = "Комментарий слишком длинный (макс. 1000 символов)" });
            if (!await _db.Recipes.AnyAsync(r => r.Id == request.RecipeId))
                return NotFound(new { error = "Рецепт не найден" });

            var comment = new RecipeComment {
                UserId      = TEMP_USER_ID,
                RecipeId    = request.RecipeId,
                CommentText = request.Text.Trim(),
                CreatedAt   = DateTime.Now
            };
            _db.RecipeComments.Add(comment);
            await _db.SaveChangesAsync();

            var author = await _db.Users.FindAsync(TEMP_USER_ID);
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

    public class AddCommentRequest
    {
        public int    RecipeId { get; set; }
        public string Text     { get; set; } = "";
    }
}
