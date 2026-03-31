using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipeApp.Data;
using RecipeApp.Models;

namespace RecipeApp.Controllers
{
    [ApiController]
    [Route("api/planner")]
    public class PlannerController : ControllerBase
    {
        private readonly AppDbContext _db;
        public PlannerController(AppDbContext db) => _db = db;

        // GET /api/planner/{userId}?weekStart=2024-01-01
        // Возвращает записи планировщика за неделю начиная с weekStart
        [HttpGet("{userId:int}")]
        public async Task<IActionResult> GetWeek(int userId, [FromQuery] string weekStart)
        {
            if (!DateTime.TryParse(weekStart, out var start))
                start = DateTime.Today.AddDays(-(int)DateTime.Today.DayOfWeek + 1);
            var end = start.AddDays(7);

            var entries = await _db.MenuPlanners
                .Where(p => p.UserId == userId && p.PlannedDate >= start && p.PlannedDate < end)
                .Include(p => p.Recipe).ThenInclude(r => r!.RecipeIngredients).ThenInclude(ri => ri.Ingredient)
                .Include(p => p.Recipe).ThenInclude(r => r!.Photos)
                .OrderBy(p => p.PlannedDate)
                .Select(p => new {
                    id          = p.Id,
                    plannedDate = p.PlannedDate.ToString("yyyy-MM-dd"),
                    portions    = p.Portions,
                    recipe = p.Recipe == null ? null : new {
                        id    = p.Recipe.Id,
                        title = p.Recipe.Title,
                        mainPhoto = p.Recipe.Photos
                                     .Where(ph => ph.IsMain).Select(ph => ph.PhotoUrl).FirstOrDefault()
                                   ?? p.Recipe.Photos.Select(ph => ph.PhotoUrl).FirstOrDefault(),
                        ingredients = p.Recipe.RecipeIngredients
                            .Where(ri => ri.Ingredient != null)
                            .Select(ri => new {
                                name     = ri.Ingredient!.Name,
                                quantity = ri.QuantityPerPortion,
                                unit     = ri.Unit
                            }).ToList()
                    }
                })
                .ToListAsync();

            return Ok(entries);
        }

        // POST /api/planner  — добавить рецепт в планировщик
        [HttpPost]
        public async Task<IActionResult> AddEntry([FromBody] PlannerEntryRequest req)
        {
            if (!await _db.Users.AnyAsync(u => u.Id == req.UserId))
                return Unauthorized(new { error = "Пользователь не найден" });
            if (!await _db.Recipes.AnyAsync(r => r.Id == req.RecipeId))
                return NotFound(new { error = "Рецепт не найден" });

            var entry = new MenuPlanner {
                UserId      = req.UserId,
                RecipeId    = req.RecipeId,
                PlannedDate = req.PlannedDate,
                Portions    = Math.Max(1, req.Portions)
            };
            _db.MenuPlanners.Add(entry);
            await _db.SaveChangesAsync();
            return Ok(new { id = entry.Id });
        }

        // PATCH /api/planner/{entryId}/portions  — изменить число порций
        [HttpPatch("{entryId:int}/portions")]
        public async Task<IActionResult> UpdatePortions(int entryId, [FromBody] UpdatePortionsRequest req)
        {
            var entry = await _db.MenuPlanners.FindAsync(entryId);
            if (entry == null) return NotFound(new { error = "Запись не найдена" });
            entry.Portions = Math.Max(1, req.Portions);
            await _db.SaveChangesAsync();
            return Ok(new { ok = true, portions = entry.Portions });
        }

        // DELETE /api/planner/{entryId}
        [HttpDelete("{entryId:int}")]
        public async Task<IActionResult> DeleteEntry(int entryId)
        {
            var entry = await _db.MenuPlanners.FindAsync(entryId);
            if (entry == null) return NotFound(new { error = "Запись не найдена" });
            _db.MenuPlanners.Remove(entry);
            await _db.SaveChangesAsync();
            return Ok(new { ok = true });
        }
    }

    public class PlannerEntryRequest
    {
        public int      UserId      { get; set; }
        public int      RecipeId    { get; set; }
        public DateTime PlannedDate { get; set; }
        public int      Portions    { get; set; } = 1;
    }

    public class UpdatePortionsRequest
    {
        public int Portions { get; set; }
    }
}