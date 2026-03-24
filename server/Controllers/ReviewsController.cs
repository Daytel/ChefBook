using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipeApp.Data;
using RecipeApp.Models;

namespace RecipeApp.Controllers
{
    [ApiController]
    [Route("api")]
    public class ReviewsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private const int TEMP_USER_ID = 1;

        public ReviewsController(AppDbContext db) => _db = db;

        // GET /api/authors/{id} — данные автора для страницы отзывов
        [HttpGet("authors/{id:int}")]
        public async Task<IActionResult> GetAuthor(int id)
        {
            var author = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (author == null)
                return NotFound(new { error = "Автор не найден" });

            var recipesCount   = await _db.Recipes.CountAsync(r => r.AuthorId == id);
            var followersCount = await _db.Subscriptions.CountAsync(s => s.AuthorId == id);

            return Ok(new {
                id             = author.Id,
                name           = author.DisplayName ?? "Автор",
                bio            = author.Bio,
                avatarUrl      = author.AvatarUrl,
                recipesCount,
                followersCount
            });
        }

        // GET /api/author-reviews/{authorId} — список отзывов об авторе
        [HttpGet("author-reviews/{authorId:int}")]
        public async Task<IActionResult> GetReviews(int authorId)
        {
            var reviews = await _db.AuthorReviews
                .Where(r => r.AuthorId == authorId)
                .OrderByDescending(r => r.Id)
                .Join(_db.Users,
                    r => r.ReviewerId,
                    u => u.Id,
                    (r, u) => new {
                        id           = r.Id,
                        reviewerName = u.DisplayName ?? "Пользователь",
                        text         = r.ReviewText,
                        createdAt    = ""
                    })
                .ToListAsync();

            return Ok(reviews);
        }

        // POST /api/author-reviews — добавить отзыв об авторе
        [HttpPost("author-reviews")]
        public async Task<IActionResult> AddReview([FromBody] AddReviewRequest req)
        {
            if (TEMP_USER_ID == 0)
                return Unauthorized(new { error = "Оставлять отзывы могут только зарегистрированные пользователи" });

            if (string.IsNullOrWhiteSpace(req.Text))
                return BadRequest(new { error = "Текст отзыва не может быть пустым" });
            if (req.Text.Length > 2000)
                return BadRequest(new { error = "Отзыв слишком длинный (макс. 2000 символов)" });
            if (!await _db.Users.AnyAsync(u => u.Id == req.AuthorId))
                return NotFound(new { error = "Автор не найден" });

            var review = new AuthorReview {
                ReviewerId = TEMP_USER_ID,
                AuthorId   = req.AuthorId,
                ReviewText = req.Text.Trim()
            };
            _db.AuthorReviews.Add(review);
            await _db.SaveChangesAsync();

            var reviewer = await _db.Users.FindAsync(TEMP_USER_ID);
            return Ok(new {
                id           = review.Id,
                reviewerName = reviewer?.DisplayName ?? "Пользователь",
                text         = review.ReviewText,
                createdAt    = ""
            });
        }
    }

    public class AddReviewRequest
    {
        public int    AuthorId { get; set; }
        public string Text     { get; set; } = "";
    }
}