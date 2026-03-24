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
        // Временный userId до реализации авторизации
        private const int TEMP_USER_ID = 1;

        public AddRecipeController(AppDbContext db) => _db = db;

        // POST /api/recipes — создать новый рецепт
        [HttpPost("recipes")]
        public async Task<IActionResult> CreateRecipe([FromBody] CreateRecipeRequest req)
        {
            // Валидация
            if (string.IsNullOrWhiteSpace(req.Title))
                return BadRequest(new { error = "Название обязательно" });
            if (req.Title.Length > 30)
                return BadRequest(new { error = "Название не должно превышать 30 символов" });
            if (req.CookingTimeMinutes < 1 || req.CookingTimeMinutes > 1440)
                return BadRequest(new { error = "Время приготовления должно быть от 1 до 1440 минут" });
            if (req.Ingredients == null || req.Ingredients.Count == 0)
                return BadRequest(new { error = "Укажите минимум один ингредиент" });
            if (req.Steps == null || req.Steps.Count == 0)
                return BadRequest(new { error = "Укажите минимум один шаг приготовления" });

            // Создаём рецепт
            var recipe = new Recipe
            {
                AuthorId           = TEMP_USER_ID,
                Title              = req.Title.Trim(),
                Description        = req.Description?.Trim(),
                CookingTimeMinutes = req.CookingTimeMinutes,
                CreatedAt          = DateTime.Now,
            };
            _db.Recipes.Add(recipe);
            await _db.SaveChangesAsync(); // получаем Id

            // Категории — ищем по имени, создаём если нет
            if (req.Categories != null)
            {
                foreach (var catName in req.Categories)
                {
                    var cat = await _db.Categories
                        .FirstOrDefaultAsync(c => c.Name == catName);
                    if (cat == null)
                    {
                        cat = new Category { Name = catName };
                        _db.Categories.Add(cat);
                        await _db.SaveChangesAsync();
                    }
                    _db.RecipeCategories.Add(new RecipeCategory
                    {
                        RecipeId   = recipe.Id,
                        CategoryId = cat.Id
                    });
                }
            }

            // Ингредиенты — ищем по имени, создаём если нет
            foreach (var ingReq in req.Ingredients)
            {
                if (string.IsNullOrWhiteSpace(ingReq.Name)) continue;

                var ingredient = await _db.Ingredients
                    .FirstOrDefaultAsync(i => i.Name == ingReq.Name.Trim());
                if (ingredient == null)
                {
                    ingredient = new Ingredient { Name = ingReq.Name.Trim() };
                    _db.Ingredients.Add(ingredient);
                    await _db.SaveChangesAsync();
                }

                if (!double.TryParse(ingReq.Qty, System.Globalization.NumberStyles.Any,
                    System.Globalization.CultureInfo.InvariantCulture, out var qty))
                    qty = 0;

                _db.RecipeIngredients.Add(new RecipeIngredient
                {
                    RecipeId           = recipe.Id,
                    IngredientId       = ingredient.Id,
                    QuantityPerPortion = qty,
                    Unit               = ingReq.Unit?.Trim() ?? ""
                });
            }

            // Шаги приготовления
            for (int i = 0; i < req.Steps.Count; i++)
            {
                var step = req.Steps[i];
                if (string.IsNullOrWhiteSpace(step.Text)) continue;

                _db.RecipeSteps.Add(new RecipeStep
                {
                    RecipeId    = recipe.Id,
                    StepNumber  = i + 1,
                    Instruction = step.Text.Trim(),
                    PhotoUrl    = null // base64 из браузера не сохраняем — нужен отдельный upload endpoint
                });
            }

            // Фото — сохраняем только флаг IsMain, URL будет после отдельного upload
            // Здесь регистрируем placeholder; в реальном проекте нужен /api/upload
            bool mainSet = false;
            if (req.Photos != null)
            {
                foreach (var photo in req.Photos)
                {
                    bool isMain = photo.IsMain && !mainSet;
                    if (isMain) mainSet = true;
                    // В учебном проекте сохраняем dataUrl как photoUrl
                    // (в production заменить на сохранение файла на диск)
                    _db.RecipePhotos.Add(new RecipePhoto
                    {
                        RecipeId = recipe.Id,
                        PhotoUrl = photo.DataUrl ?? "/images/placeholder.jpg",
                        IsMain   = isMain
                    });
                }
            }

            await _db.SaveChangesAsync();

            return Ok(new { id = recipe.Id, title = recipe.Title });
        }
    }

    // DTO
    public class CreateRecipeRequest
    {
        public string              Title              { get; set; } = "";
        public string?             Description        { get; set; }
        public int                 CookingTimeMinutes { get; set; }
        public List<string>?       Categories         { get; set; }
        public List<IngredientDto> Ingredients        { get; set; } = [];
        public List<StepDto>       Steps              { get; set; } = [];
        public List<PhotoDto>?     Photos             { get; set; }
    }

    public class IngredientDto
    {
        public string Name { get; set; } = "";
        public string Qty  { get; set; } = "";
        public string Unit { get; set; } = "";
    }

    public class StepDto
    {
        public string  Text { get; set; } = "";
        public string? Img  { get; set; }
    }

    public class PhotoDto
    {
        public string? DataUrl { get; set; }
        public bool    IsMain  { get; set; }
    }
}