using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipeApp.Data;
using RecipeApp.Models;

namespace RecipeApp.Controllers
{
    [ApiController]
    [Route("api")]
    public class AddRecipeController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;

        public AddRecipeController(AppDbContext db, IWebHostEnvironment env)
        { _db = db; _env = env; }

        // POST /api/recipes — создать новый рецепт
        [HttpPost("recipes")]
        public async Task<IActionResult> CreateRecipe([FromBody] CreateRecipeRequest req)
        {
            if (req.UserId <= 0 || !await _db.Users.AnyAsync(u => u.Id == req.UserId))
                return Unauthorized(new { error = "Войдите в аккаунт, чтобы добавить рецепт" });
            if (string.IsNullOrWhiteSpace(req.Title))
                return BadRequest(new { error = "Название обязательно" });
            if (req.Title.Length > 30)
                return BadRequest(new { error = "Название не должно превышать 30 символов" });
            if (req.CookingTimeMinutes < 1 || req.CookingTimeMinutes > 1440)
                return BadRequest(new { error = "Время приготовления: от 1 до 1440 минут" });
            if (req.Ingredients == null || req.Ingredients.Count == 0)
                return BadRequest(new { error = "Укажите минимум один ингредиент" });
            if (req.Steps == null || req.Steps.Count == 0)
                return BadRequest(new { error = "Укажите минимум один шаг" });

            // Создаём рецепт
            var recipe = new Recipe {
                AuthorId           = req.UserId,
                Title              = req.Title.Trim(),
                Description        = req.Description?.Trim(),
                CookingTimeMinutes = req.CookingTimeMinutes,
                CreatedAt          = DateTime.Now,
            };
            _db.Recipes.Add(recipe);
            await _db.SaveChangesAsync();

            await SaveRelations(recipe.Id, req);
            await _db.SaveChangesAsync();
            return Ok(new { id = recipe.Id, title = recipe.Title });
        }

        // PUT /api/recipes/{id} — обновить рецепт
        [HttpPut("recipes/{id:int}")]
        public async Task<IActionResult> UpdateRecipe(int id, [FromBody] CreateRecipeRequest req)
        {
            var recipe = await _db.Recipes
                .Include(r => r.Photos)
                .Include(r => r.Steps)
                .Include(r => r.RecipeIngredients)
                .Include(r => r.RecipeCategories)
                .FirstOrDefaultAsync(r => r.Id == id && r.AuthorId == req.UserId);

            if (recipe == null)
                return NotFound(new { error = "Рецепт не найден или нет доступа" });
            if (string.IsNullOrWhiteSpace(req.Title))
                return BadRequest(new { error = "Название обязательно" });
            if (req.CookingTimeMinutes < 1 || req.CookingTimeMinutes > 1440)
                return BadRequest(new { error = "Время приготовления: от 1 до 1440 минут" });

            recipe.Title              = req.Title.Trim();
            recipe.Description        = req.Description?.Trim();
            recipe.CookingTimeMinutes = req.CookingTimeMinutes;

            // Удаляем старые файлы которые не переиспользуются
            var newUrls = new HashSet<string>(
                (req.Photos ?? []).Select(p => p.DataUrl ?? "")
                .Concat(req.Steps.Select(s => s.Img ?? ""))
                .Where(u => u.StartsWith("/images/")));

            foreach (var url in recipe.Photos.Select(p => p.PhotoUrl)
                .Concat(recipe.Steps.Select(s => s.PhotoUrl).Where(u => u != null)!))
                if (url.StartsWith("/images/") && !newUrls.Contains(url))
                    DeleteFile(url);

            _db.RecipePhotos.RemoveRange(recipe.Photos);
            _db.RecipeSteps.RemoveRange(recipe.Steps);
            _db.RecipeIngredients.RemoveRange(recipe.RecipeIngredients);
            _db.RecipeCategories.RemoveRange(recipe.RecipeCategories);
            await _db.SaveChangesAsync();

            await SaveRelations(recipe.Id, req);
            await _db.SaveChangesAsync();
            return Ok(new { id = recipe.Id, title = recipe.Title });
        }

        // GET /api/recipes/{id}/edit — полные данные для редактирования
        [HttpGet("recipes/{id:int}/edit")]
        public async Task<IActionResult> GetForEdit(int id, [FromQuery] int userId)
        {
            var recipe = await _db.Recipes
                .Include(r => r.Photos)
                .Include(r => r.Steps)
                .Include(r => r.RecipeIngredients).ThenInclude(ri => ri.Ingredient)
                .Include(r => r.RecipeCategories).ThenInclude(rc => rc.Category)
                .FirstOrDefaultAsync(r => r.Id == id && r.AuthorId == userId);

            if (recipe == null)
                return NotFound(new { error = "Рецепт не найден или нет доступа" });

            return Ok(new {
                id                 = recipe.Id,
                title              = recipe.Title,
                description        = recipe.Description,
                cookingTimeMinutes = recipe.CookingTimeMinutes,
                categories = recipe.RecipeCategories
                    .Select(rc => rc.Category?.Name).Where(n => n != null).ToList(),
                ingredients = recipe.RecipeIngredients
                    .Where(ri => ri.Ingredient != null)
                    .Select(ri => new { name = ri.Ingredient!.Name, qty = ri.QuantityPerPortion.ToString(), unit = ri.Unit })
                    .ToList(),
                steps = recipe.Steps
                    .OrderBy(s => s.StepNumber)
                    .Select(s => new { text = s.Instruction, img = s.PhotoUrl })
                    .ToList(),
                photos = recipe.Photos
                    .OrderByDescending(p => p.IsMain)
                    .Select(p => new { dataUrl = p.PhotoUrl, isMain = p.IsMain })
                    .ToList()
            });
        }

        // Вспомогательные методы
        private async Task SaveRelations(int recipeId, CreateRecipeRequest req)
        {
            // Категории
            foreach (var catName in req.Categories ?? [])
            {
                var cat = await _db.Categories.FirstOrDefaultAsync(c => c.Name == catName)
                          ?? new Category { Name = catName };
                if (cat.Id == 0) { _db.Categories.Add(cat); await _db.SaveChangesAsync(); }
                _db.RecipeCategories.Add(new RecipeCategory { RecipeId = recipeId, CategoryId = cat.Id });
            }

            // Ингредиенты
            foreach (var ing in req.Ingredients)
            {
                if (string.IsNullOrWhiteSpace(ing.Name)) continue;
                var ingredient = await _db.Ingredients.FirstOrDefaultAsync(i => i.Name == ing.Name.Trim())
                                 ?? new Ingredient { Name = ing.Name.Trim() };
                if (ingredient.Id == 0) { _db.Ingredients.Add(ingredient); await _db.SaveChangesAsync(); }
                double.TryParse(ing.Qty, System.Globalization.NumberStyles.Any,
                    System.Globalization.CultureInfo.InvariantCulture, out var qty);
                _db.RecipeIngredients.Add(new RecipeIngredient {
                    RecipeId = recipeId, IngredientId = ingredient.Id,
                    QuantityPerPortion = qty, Unit = ing.Unit?.Trim() ?? ""
                });
            }

            // Шаги
            for (int i = 0; i < req.Steps.Count; i++)
            {
                var step = req.Steps[i];
                if (string.IsNullOrWhiteSpace(step.Text)) continue;
                string? photoUrl = step.Img?.StartsWith("/images/") == true
                    ? step.Img
                    : SaveBase64Image(step.Img, $"step_{recipeId}_{i + 1}");
                _db.RecipeSteps.Add(new RecipeStep {
                    RecipeId = recipeId, StepNumber = i + 1,
                    Instruction = step.Text.Trim(), PhotoUrl = photoUrl
                });
            }

            // Фото
            bool mainSet = false;
            foreach (var (photo, idx) in (req.Photos ?? []).Select((p, i) => (p, i)))
            {
                bool isMain = photo.IsMain && !mainSet;
                if (isMain) mainSet = true;
                string photoUrl = photo.DataUrl?.StartsWith("/images/") == true
                    ? photo.DataUrl
                    : SaveBase64Image(photo.DataUrl, $"recipe_{recipeId}_{idx + 1}") ?? "/images/placeholder.jpg";
                _db.RecipePhotos.Add(new RecipePhoto { RecipeId = recipeId, PhotoUrl = photoUrl, IsMain = isMain });
            }
            if (!(req.Photos?.Count > 0))
                _db.RecipePhotos.Add(new RecipePhoto { RecipeId = recipeId, PhotoUrl = "/images/placeholder.jpg", IsMain = true });
        }

        private string? SaveBase64Image(string? dataUrl, string baseName)
        {
            if (string.IsNullOrWhiteSpace(dataUrl) || !dataUrl.Contains(",")) return null;
            try
            {
                var commaIdx = dataUrl.IndexOf(',');
                var header   = dataUrl[..commaIdx];
                var base64   = dataUrl[(commaIdx + 1)..];
                var mime     = header.Split(':')[1].Split(';')[0];
                var ext      = mime switch { "image/png" => "png", "image/webp" => "webp", "image/gif" => "gif", _ => "jpg" };
                var fileName = $"{baseName}_{DateTime.Now:yyyyMMddHHmmss}.{ext}";
                var dir      = Path.Combine(_env.WebRootPath, "images");
                Directory.CreateDirectory(dir);
                System.IO.File.WriteAllBytes(Path.Combine(dir, fileName), Convert.FromBase64String(base64));
                return $"/images/{fileName}";
            }
            catch (Exception ex) { Console.Error.WriteLine($"SaveBase64Image: {ex.Message}"); return null; }
        }

        private void DeleteFile(string url)
        {
            var path = Path.Combine(_env.WebRootPath, url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (System.IO.File.Exists(path)) try { System.IO.File.Delete(path); } catch { }
        }
    }

    public class CreateRecipeRequest
    {
        public int                 UserId             { get; set; }
        public string              Title              { get; set; } = "";
        public string?             Description        { get; set; }
        public int                 CookingTimeMinutes { get; set; }
        public List<string>?       Categories         { get; set; }
        public List<IngredientDto> Ingredients        { get; set; } = [];
        public List<StepDto>       Steps              { get; set; } = [];
        public List<PhotoDto>?     Photos             { get; set; }
    }
    public class IngredientDto { public string Name{get;set;}=""; public string Qty{get;set;}=""; public string Unit{get;set;}=""; }
    public class StepDto       { public string Text{get;set;}=""; public string? Img{get;set;} }
    public class PhotoDto      { public string? DataUrl{get;set;} public bool IsMain{get;set;} }
}