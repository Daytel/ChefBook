using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipeApp.Data;
using RecipeApp.Models;

namespace RecipeApp.Controllers
{
    public class CatalogController : Controller
    {
        private readonly AppDbContext _context;
        private const int PageSize = 12;

        public CatalogController(AppDbContext context) => _context = context;

        public async Task<IActionResult> Index(
            string? search, int? maxTime, int[]? categoryIds, int page = 1)
        {
            if (page < 1) page = 1;

            var query = _context.Recipes.AsQueryable();

            if (!string.IsNullOrEmpty(search))
                query = query.Where(r =>
                    r.Title.Contains(search) ||
                    (r.Description != null && r.Description.Contains(search)) ||
                    r.RecipeIngredients.Any(ri =>
                        ri.Ingredient != null && ri.Ingredient.Name.Contains(search)));

            if (maxTime.HasValue)
                query = query.Where(r => r.CookingTimeMinutes <= maxTime.Value);

            if (categoryIds != null && categoryIds.Length > 0)
                query = query.Where(r =>
                    r.RecipeCategories.Any(rc => categoryIds.Contains(rc.CategoryId)));

            query = query.OrderByDescending(r => r.CreatedAt);

            int totalItems = await query.CountAsync();

            // Include нужен только здесь — View рендерит данные серверно
            var recipes = await query
                .Include(r => r.Photos)
                .Include(r => r.RecipeIngredients).ThenInclude(ri => ri.Ingredient)
                .AsSplitQuery()   // OK: Include + AsSplitQuery без Select — допустимо
                .Skip((page - 1) * PageSize)
                .Take(PageSize)
                .ToListAsync();

            ViewBag.CurrentPage    = page;
            ViewBag.TotalPages     = (int)Math.Ceiling((double)totalItems / PageSize);
            ViewBag.TotalItems     = totalItems;
            ViewBag.AllCategories  = await _context.Categories.ToListAsync();

            return View(recipes);
        }
    }
}