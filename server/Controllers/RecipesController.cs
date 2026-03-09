using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipeApp.Data;
using RecipeApp.Models;

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
            var query = _context.Recipes
                .Include(r => r.Photos)
                .Include(r => r.RecipeIngredients).ThenInclude(ri => ri.Ingredient)
                .AsQueryable();

            // 1. Фильтрация (Задание 2)
            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(r => r.Title.Contains(search) || 
                                         r.Description.Contains(search) ||
                                         r.RecipeIngredients.Any(ri => ri.Ingredient.Name.Contains(search)));
            }

            if (maxTime.HasValue)
                query = query.Where(r => r.CookingTimeMinutes <= maxTime.Value);

            if (categoryIds != null && categoryIds.Length > 0)
                query = query.Where(r => r.RecipeCategories.Any(rc => categoryIds.Contains(rc.CategoryId)));

            // 2. Сортировка: Сначала новые (по убыванию ID или даты)
            query = query.OrderByDescending(r => r.Id);

            // 3. Пагинация (Задание 3)
            var totalItems = await query.CountAsync();
            var recipes = await query
                .Skip((page - 1) * PageSize)
                .Take(PageSize)
                .Select(r => new {
                    r.Id,
                    r.Title,
                    r.Description,
                    r.CookingTimeMinutes,
                    MainPhoto = r.Photos.FirstOrDefault(p => p.IsMain).PhotoUrl,
                    Categories = r.RecipeCategories.Select(rc => rc.CategoryId)
                })
                .ToListAsync();

            return Ok(new {
                TotalItems = totalItems,
                TotalPages = (int)Math.Ceiling((double)totalItems / PageSize),
                CurrentPage = page,
                Data = recipes
            });
        }
    }
}