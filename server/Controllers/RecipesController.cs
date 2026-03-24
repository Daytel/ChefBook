using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipeApp.Data;

namespace RecipeApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecipesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private const int PageSize = 9;

        public RecipesController(AppDbContext context) => _context = context;

        [HttpGet]
        public async Task<IActionResult> GetRecipes(
            [FromQuery] string? search,
            [FromQuery] int? maxTime,
            [FromQuery] int[]? categoryIds,
            [FromQuery] int page = 1)
        {
            var query = _context.Recipes.AsQueryable();

            if (!string.IsNullOrEmpty(search))
                query = query.Where(r =>
                    r.Title.Contains(search) ||
                    (r.Description != null && r.Description.Contains(search)) ||  // null-safe
                    r.RecipeIngredients.Any(ri =>
                        ri.Ingredient != null && ri.Ingredient.Name.Contains(search)));

            if (maxTime.HasValue)
                query = query.Where(r => r.CookingTimeMinutes <= maxTime.Value);

            if (categoryIds != null && categoryIds.Length > 0)
                query = query.Where(r =>
                    r.RecipeCategories.Any(rc => categoryIds.Contains(rc.CategoryId)));

            query = query.OrderByDescending(r => r.CreatedAt);

            var totalItems = await query.CountAsync();

            var data = await query
                .Skip((page - 1) * PageSize)
                .Take(PageSize)
                .Select(r => new {
                    id                 = r.Id,
                    title              = r.Title,
                    description        = r.Description,
                    cookingTimeMinutes = r.CookingTimeMinutes,
                    // FIX: ?. оператор вместо .PhotoUrl на потенциальном null
                    mainPhoto          = r.Photos
                                          .Where(p => p.IsMain)
                                          .Select(p => p.PhotoUrl)
                                          .FirstOrDefault()
                                        ?? r.Photos
                                          .Select(p => p.PhotoUrl)
                                          .FirstOrDefault(),
                    categories = r.RecipeCategories
                                  .Select(rc => rc.CategoryId)
                                  .ToList()
                })
                .ToListAsync();

            return Ok(new {
                totalItems,
                totalPages  = (int)Math.Ceiling((double)totalItems / PageSize),
                currentPage = page,
                data
            });
        }
    }
}
