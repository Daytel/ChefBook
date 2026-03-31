/* index.js — ChefBook главная страница */
(function () {
  "use strict";

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var grid = document.querySelector(".recipes-list");
    if (!grid) {
      console.error("НЕТ .recipes-list");
      return;
    }

    grid.innerHTML = '<li style="padding:20px;color:#888">Загрузка...</li>';

    fetch("/api/recipes?page=1")
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (json) {
        var items = json.data || json.Data || [];
        grid.innerHTML = "";

        if (!items.length) {
          grid.innerHTML = '<li style="padding:20px">Нет рецептов</li>';
          return;
        }

        items.forEach(function (r) {
          var li = document.createElement("li");
          li.className = "recipe-card";
          li.setAttribute("tabindex", "0");
          li.dataset.id = r.id || r.Id;
          var photo = r.mainPhoto || r.MainPhoto || "/images/placeholder.jpg";
          var title = r.title || r.Title || "";
          var desc = r.description || r.Description || "";
          li.innerHTML =
            '<img class="recipe-photo" src="' +
            esc(photo) +
            '" alt="' +
            esc(title) +
            '">' +
            '<h2 class="recipe-title">' +
            esc(title) +
            "</h2>" +
            '<p class="recipe-desc">' +
            esc(desc) +
            "</p>" +
            '<div class="compose-row">' +
            '<button class="compose-btn btn" type="button">Состав</button>' +
            "</div>";
          grid.appendChild(li);
        });

        grid.addEventListener("click", function (e) {
          var btn = e.target.closest(".compose-btn");
          if (btn) {
            e.stopPropagation();
            var id = btn.closest(".recipe-card").dataset.id;
            if (typeof window.openIngredientsModal === "function")
              window.openIngredientsModal(Number(id));
            return;
          }
          if (e.target.closest("button")) return;
          var card = e.target.closest(".recipe-card");
          if (card && card.dataset.id)
            window.location.href = "/recipe.html?id=" + card.dataset.id;
        });
      })
      .catch(function (err) {
        console.error("Ошибка:", err);
        grid.innerHTML =
          '<li style="padding:20px;color:red">Ошибка: ' + err.message + "</li>";
      });
  });
})();
