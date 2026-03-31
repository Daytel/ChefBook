using Microsoft.EntityFrameworkCore;
using RecipeApp.Data;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

builder.Services.AddControllersWithViews();

var app = builder.Build();

app.UseDefaultFiles();   // index.html
app.UseStaticFiles();
app.UseRouting();

// Явный маршрут для каталога
app.MapControllerRoute(
    name: "catalog",
    pattern: "Catalog",
    defaults: new { controller = "Catalog", action = "Index" });

// Страница рецепта: /Recipe/5
app.MapControllerRoute(
    name: "recipe",
    pattern: "Recipe/{id:int}",
    defaults: new { controller = "Recipe", action = "Index" });

// Общий маршрут для остальных контроллеров
app.MapControllerRoute(
    name: "default",
    pattern: "{controller}/{action}/{id?}");

app.Run();