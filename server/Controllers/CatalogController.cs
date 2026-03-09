using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipeApp.Data;
using RecipeApp.Models;
using System.Linq;

namespace RecipeApp.Controllers
{
    public class CatalogController : Controller
    {
        private readonly AppDbContext _context;
        private const int PageSize = 9;

        public CatalogController(AppDbContext context) => _context = context;

        public async Task<IActionResult> Index(string search, int? maxTime, int[] categoryIds, int page = 1)
        {
            if (page < 1) page = 1;

            var query = _context.Recipes
                .Include(r => r.Photos)
                .Include(r => r.RecipeIngredients).ThenInclude(ri => ri.Ingredient)
                .AsQueryable();

            // 1. Фильтрация
            if (!string.IsNullOrEmpty(search))
                query = query.Where(r => r.Title.Contains(search) || r.Description.Contains(search) || 
                                         r.RecipeIngredients.Any(ri => ri.Ingredient.Name.Contains(search)));

            if (maxTime.HasValue)
                query = query.Where(r => r.CookingTimeMinutes <= maxTime.Value);

            if (categoryIds != null && categoryIds.Length > 0)
                query = query.Where(r => r.RecipeCategories.Any(rc => categoryIds.Contains(rc.CategoryId)));

            // 2. Сортировка (от новых к старым)
            query = query.OrderByDescending(r => r.CreatedAt);

            // 3. Пагинация
            int totalItems = await query.CountAsync();
            var recipes = await query
                .Skip((page - 1) * PageSize)
                .Take(PageSize)
                .ToListAsync();

            // Передача данных во View
            ViewBag.CurrentPage = page;
            ViewBag.TotalPages = (int)Math.Ceiling((double)totalItems / PageSize);
            ViewBag.AllCategories = await _context.Categories.ToListAsync();

            return View(recipes);
        }
    }
}