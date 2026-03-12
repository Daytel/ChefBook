using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApp.Models
{
    [Table("users")]
    public class User
    {
        [Column("id")]
        public int Id { get; set; }
        [Column("email")]
        public required string Email { get; set; }
        [Column("password_hash")]
        public required string PasswordHash { get; set; }
        [Column("display_name")]
        public string? DisplayName { get; set; }
        [Column("avatar_url")]
        public string? AvatarUrl { get; set; }
        [Column("bio")]
        public string? Bio { get; set; }
        [Column("planner_notif_enabled")]
        public bool PlannerNotifEnabled { get; set; }
        [Column("planner_notif_freq")]
        public string? PlannerNotifFreq { get; set; }
    }

    [Table("recipes")]
    public class Recipe
    {
        [Column("id")]
        public int Id { get; set; }
        [Column("title")]
        [MaxLength(30)] public required string Title { get; set; }
        [Column("description")]
        [MaxLength(300)] public string? Description { get; set; }
        [Column("cooking_time_minutes")]
        public int CookingTimeMinutes { get; set; }
        [Column("author_id")]
        public int AuthorId { get; set; }
        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public User? Author { get; set; }
        public List<RecipePhoto> Photos { get; set; } = [];
        public List<RecipeIngredient> RecipeIngredients { get; set; } = [];
        public List<RecipeCategory> RecipeCategories { get; set; } = [];
        public List<RecipeStep> Steps { get; set; } = [];
    }

    [Table("categories")]
    public class Category
    {
        [Column("id")]
        public int Id { get; set; }
        [Column("name")]
        public required string Name { get; set; }
        public List<RecipeCategory> RecipeCategories { get; set; } = [];
    }

    [Table("ingredients")]
    public class Ingredient
    {
        [Column("id")]
        public int Id { get; set; }
        [Column("name")]
        public required string Name { get; set; }
    }

    [Table("recipe_ingredients")]
    public class RecipeIngredient
    {
        [Column("recipe_id")]
        public int RecipeId { get; set; }
        [Column("ingredient_id")]
        public int IngredientId { get; set; }
        [Column("quantity_per_portion")]
        public double QuantityPerPortion { get; set; }
        [Column("unit")]
        [MaxLength(20)] public required string Unit { get; set; }

        public Recipe? Recipe { get; set; }
        public Ingredient? Ingredient { get; set; }
    }

    [Table("recipe_categories")]
    public class RecipeCategory
    {
        [Column("recipe_id")]
        public int RecipeId { get; set; }
        [Column("category_id")]
        public int CategoryId { get; set; }

        public Recipe? Recipe { get; set; }
        public Category? Category { get; set; }
    }

    [Table("recipe_steps")]
    public class RecipeStep
    {
        [Column("id")]
        public int Id { get; set; }
        [Column("recipe_id")]
        public int RecipeId { get; set; }
        [Column("step_number")]
        public int StepNumber { get; set; }
        [Column("instruction")]
        [MaxLength(500)] public required string Instruction { get; set; }
        [Column("photo_url")]
        public string? PhotoUrl { get; set; }
    }

    [Table("recipe_photos")]
    public class RecipePhoto
    {
        [Column("id")]
        public int Id { get; set; }
        [Column("recipe_id")]
        public int RecipeId { get; set; }
        [Column("photo_url")]
        public required string PhotoUrl { get; set; }
        [Column("is_main")]
        public bool IsMain { get; set; }
    }

    [Table("favorites")]
    public class Favorite
    {
        [Column("user_id")]
        public int UserId { get; set; }
        [Column("recipe_id")]
        public int RecipeId { get; set; }
    }

    [Table("subscriptions")]
    public class Subscription
    {
        [Column("follower_id")]
        public int FollowerId { get; set; }
        [Column("author_id")]
        public int AuthorId { get; set; }
        [Column("is_notified")]
        public bool IsNotified { get; set; }
    }

    [Table("recipe_comments")]
    public class RecipeComment
    {
        [Column("id")]
        public int Id { get; set; }
        [Column("user_id")]
        public int UserId { get; set; }
        [Column("recipe_id")]
        public int RecipeId { get; set; }
        [Column("comment_text")]
        public required string CommentText { get; set; }
        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }

    [Table("author_reviews")]
    public class AuthorReview
    {
        [Column("id")]
        public int Id { get; set; }
        [Column("reviewer_id")]
        public int ReviewerId { get; set; }
        [Column("author_id")]
        public int AuthorId { get; set; }
        [Column("review_text")]
        public required string ReviewText { get; set; }
    }

    [Table("menu_planner")]
    public class MenuPlanner
    {
        [Column("id")]
        public int Id { get; set; }
        [Column("user_id")]
        public int UserId { get; set; }
        [Column("recipe_id")]
        public int RecipeId { get; set; }
        [Column("planned_date")]
        public DateTime PlannedDate { get; set; }
        [Column("portions")]
        public int Portions { get; set; }

        public Recipe? Recipe { get; set; }
    }
}
