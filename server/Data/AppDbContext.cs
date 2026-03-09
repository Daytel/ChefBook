using Microsoft.EntityFrameworkCore;
using RecipeApp.Models;

namespace RecipeApp.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Recipe> Recipes { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Ingredient> Ingredients { get; set; }
        public DbSet<RecipeIngredient> RecipeIngredients { get; set; }
        public DbSet<RecipeCategory> RecipeCategories { get; set; }
        public DbSet<RecipeStep> RecipeSteps { get; set; }
        public DbSet<RecipePhoto> RecipePhotos { get; set; }
        public DbSet<Favorite> Favorites { get; set; }
        public DbSet<Subscription> Subscriptions { get; set; }
        public DbSet<RecipeComment> RecipeComments { get; set; }
        public DbSet<AuthorReview> AuthorReviews { get; set; }
        public DbSet<MenuPlanner> MenuPlanners { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Настройка составных ключей для таблиц связей
            modelBuilder.Entity<RecipeIngredient>().HasKey(ri => new { ri.RecipeId, ri.IngredientId });
            modelBuilder.Entity<RecipeCategory>().HasKey(rc => new { rc.RecipeId, rc.CategoryId });
            modelBuilder.Entity<Favorite>().HasKey(f => new { f.UserId, f.RecipeId });
            modelBuilder.Entity<Subscription>().HasKey(s => new { s.FollowerId, s.AuthorId });

            // Настройка связей для планировщика
            modelBuilder.Entity<MenuPlanner>()
                .HasOne(p => p.Recipe)
                .WithMany()
                .HasForeignKey(p => p.RecipeId);
        }
    }
}