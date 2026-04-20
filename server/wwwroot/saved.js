/* saved.js — ChefBook  /saved.html
   Загружает избранные рецепты текущего пользователя из API.
*/
(function () {
  "use strict";

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  const user = window.chefbook?.getUser?.() ?? null;

  document.addEventListener("DOMContentLoaded", () => {
    if (!user) {
      // Не авторизован — показываем сообщение
      const grid = document.getElementById("savedGrid");
      if (grid)
        grid.innerHTML =
          "<p style='padding:20px;color:#888'>Войдите в аккаунт, чтобы видеть сохранённые рецепты.</p>";
      return;
    }
    loadSaved();
  });

  async function loadSaved() {
    const grid = document.getElementById("savedGrid");
    if (!grid) return;
    grid.innerHTML = "<p style='color:#888;padding:12px'>Загрузка...</p>";

    try {
      const res = await fetch(`/api/saved/${user.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = await res.json();

      // Загружаем актуальные данные автора через API (как на странице отзывов)
      await loadAuthorInfo();

      grid.innerHTML = "";
      if (!items.length) {
        grid.innerHTML =
          "<p style='padding:12px;color:#888'>Нет сохранённых рецептов.</p>";
        return;
      }

      items.forEach((r) => renderCard(r, grid));
      initCardNav(grid);
      initComposeButtons(grid);
    } catch (e) {
      grid.innerHTML = `<p style='color:#c00;padding:12px'>Ошибка: ${esc(e.message)}</p>`;
    }
  }

  /* Загрузка информации об авторе (текущем пользователе) */
  async function loadAuthorInfo() {
    try {
      const res = await fetch(`/api/authors/${user.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const a = await res.json();

      document.getElementById("authorName").textContent =
        a.name ?? user.displayName ?? "Автор";
      document.getElementById("authorBio").textContent = a.bio ?? "";

      document.getElementById("authorRecipes").textContent =
        `Рецептов: ${a.recipesCount ?? 0}`;
      document.getElementById("authorFollowers").textContent =
        `Подписчиков: ${a.followersCount ?? 0}`;

      const avatarEl = document.getElementById("authorAvatar");
      if (avatarEl) {
        let img = avatarEl.querySelector("img");
        if (!img) {
          img = document.createElement("img");
          img.className = "avatar-img";
          avatarEl.appendChild(img);
        }
        img.src = a.avatarUrl ?? user.avatarUrl ?? "/images/avatar.jpg";
        img.alt = a.name ?? user.displayName ?? "";
      }
    } catch (err) {
      console.error("Ошибка загрузки данных автора:", err);
      // fallback на данные из localStorage
      fillAuthorBlock(user);
    }
  }

  // Оставляем как запасной вариант
  function fillAuthorBlock(u) {
    const setTxt = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    setTxt("authorName", u.displayName || u.email || "Профиль");
    setTxt("authorBio", "");
    setTxt("authorRecipes", "Рецептов: 0");
    setTxt("authorFollowers", "Подписчиков: 0");

    const avatarEl = document.getElementById("authorAvatar");
    if (avatarEl) {
      let img = avatarEl.querySelector("img");
      if (!img) {
        img = document.createElement("img");
        img.className = "avatar-img";
        avatarEl.appendChild(img);
      }
      img.src = u.avatarUrl ?? "/images/avatar.jpg";
      img.alt = u.displayName ?? "";
    }
  }

  function renderCard(r, container) {
    const article = document.createElement("article");
    article.className = "card recipe-card";
    article.setAttribute("role", "listitem");
    article.setAttribute("tabindex", "0");
    article.dataset.id = r.id;

    const photo = r.mainPhoto ?? "/images/placeholder.jpg";
    article.innerHTML = `
      <div class="photo" aria-hidden="true">
        <img src="${esc(photo)}" alt="${esc(r.title)}" loading="lazy">
      </div>
      <h4 class="title">${esc(r.title)}</h4>
      <p class="desc">${esc(r.description ?? "")}</p>
      <div class="compose-row">
        <button class="btn compose-btn" type="button">Состав</button>
      </div>`;
    container.appendChild(article);
  }

  function initCardNav(container) {
    container.addEventListener("click", (e) => {
      if (e.target.closest("button, a")) return;
      const card = e.target.closest(".recipe-card");
      if (card?.dataset.id)
        window.location.href = `/recipe.html?id=${card.dataset.id}`;
    });
    container.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (document.activeElement?.tagName === "BUTTON") return;
      const card = e.target.closest(".recipe-card");
      if (card?.dataset.id) {
        e.preventDefault();
        window.location.href = `/recipe.html?id=${card.dataset.id}`;
      }
    });
  }

  function initComposeButtons(container) {
    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".compose-btn");
      if (!btn) return;
      e.stopPropagation();
      const id = btn.closest(".recipe-card")?.dataset.id;
      if (id && typeof window.openIngredientsModal === "function")
        window.openIngredientsModal(Number(id));
    });
  }
})();
