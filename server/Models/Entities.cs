using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace RecipeApp.Models
{
    public class User {
        public int Id { get; set; }
        public string Email { get; set; }
        public string PasswordHash { get; set; }
        public string DisplayName { get; set; }
        public string AvatarUrl { get; set; }
        public string Bio { get; set; }
        public bool PlannerNotifEnabled { get; set; }
        public string PlannerNotifFreq { get; set; }
    }

    public class Recipe {
        public int Id { get; set; }
        [MaxLength(30)] public string Title { get; set; }
        [MaxLength(300)] public string Description { get; set; }
        public int CookingTimeMinutes { get; set; }
        public int AuthorId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now; // Для сортировки по новизне
        public User Author { get; set; }
        public List<RecipePhoto> Photos { get; set; }
        public List<RecipeIngredient> RecipeIngredients { get; set; }
        public List<RecipeCategory> RecipeCategories { get; set; }
        public List<RecipeStep> Steps { get; set; }
    }

    public class Category {
        public int Id { get; set; }
        public string Name { get; set; }
        public List<RecipeCategory> RecipeCategories { get; set; }
    }

    public class Ingredient {
        public int Id { get; set; }
        public string Name { get; set; }
    }

    public class RecipeIngredient {
        public int RecipeId { get; set; }
        public int IngredientId { get; set; }
        public double QuantityPerPortion { get; set; }
        [MaxLength(20)] public string Unit { get; set; }
        public Recipe Recipe { get; set; }
        public Ingredient Ingredient { get; set; }
    }

    public class RecipeCategory {
        public int RecipeId { get; set; }
        public int CategoryId { get; set; }
        public Recipe Recipe { get; set; }
        public Category Category { get; set; }
    }

    public class RecipeStep {
        public int Id { get; set; }
        public int RecipeId { get; set; }
        public int StepNumber { get; set; }
        [MaxLength(500)] public string Instruction { get; set; }
        public string PhotoUrl { get; set; }
    }

    public class RecipePhoto {
        public int Id { get; set; }
        public int RecipeId { get; set; }
        public string PhotoUrl { get; set; }
        public bool IsMain { get; set; }
    }

    public class Favorite {
        public int UserId { get; set; }
        public int RecipeId { get; set; }
    }

    public class Subscription {
        public int FollowerId { get; set; }
        public int AuthorId { get; set; }
        public bool IsNotified { get; set; }
    }

    public class RecipeComment {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int RecipeId { get; set; }
        public string CommentText { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }

    public class AuthorReview {
        public int Id { get; set; }
        public int ReviewerId { get; set; }
        public int AuthorId { get; set; }
        public string ReviewText { get; set; }
    }

    public class MenuPlanner {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int RecipeId { get; set; }
        public DateTime PlannedDate { get; set; }
        public int Portions { get; set; }
        public Recipe Recipe { get; set; }
    }
}