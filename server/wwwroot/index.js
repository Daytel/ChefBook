/* =====================================================================
   index.js — ChefBook (главная страница)
   При загрузке: GET /api/recipes?page=1 → рендер 12 новейших рецептов
   ===================================================================== */

document.addEventListener("DOMContentLoaded", function () {

  /* ── Навигация data-href ─────────────────────────────────────── */
  document.querySelectorAll("[data-href]").forEach((el) => {
    el.addEventListener("click", () => {
      const href = el.getAttribute("data-href");
      if (href) window.location.href = href;
    });
  });

  /* ── Загрузка рецептов из БД ─────────────────────────────────── */
  const grid = document.querySelector(".recipes-list");
  console.log("[index.js] grid element:", grid);
  if (!grid) {
    console.error("[index.js] ОШИБКА: .recipes-list не найден в DOM!");
    return;
  }

  grid.innerHTML = '<li style="padding:20px;color:#888">Загрузка рецептов...</li>';

  console.log("[index.js] Запрашиваю /api/recipes?page=1 ...");

  fetch("/api/recipes?page=1")
    .then((r) => {
      console.log("[index.js] Ответ сервера:", r.status, r.ok);
      if (!r.ok) throw new Error(`Ошибка сервера: ${r.status}`);
      return r.json();
    })
    .then((data) => {
      console.log("[index.js] Данные из API:", data);

      // Поддержка и camelCase (data) и PascalCase (Data) — на случай разных версий контроллера
      const items = data.data ?? data.Data;
      console.log("[index.js] items:", items);

      grid.innerHTML = "";

      if (!items || items.length === 0) {
        grid.innerHTML = '<li style="padding:20px;color:#888">Рецепты не найдены</li>';
        console.warn("[index.js] Список рецептов пуст");
        return;
      }

      items.forEach((r) => renderCard(r, grid));
      initComposeButtons(grid);
      initCardNavigation(grid);

      console.log(`[index.js] Отрендерено ${items.length} карточек`);
    })
    .catch((err) => {
      console.error("[index.js] fetch упал с ошибкой:", err);
      grid.innerHTML = `<li style="padding:20px;color:#c00">Ошибка загрузки: ${err.message}</li>`;
    });

  /* ── Рендер одной карточки ───────────────────────────────────── */
  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function renderCard(recipe, container) {
    // Поддержка camelCase и PascalCase полей
    const id          = recipe.id          ?? recipe.Id;
    const title       = recipe.title       ?? recipe.Title       ?? "";
    const description = recipe.description ?? recipe.Description ?? "";
    const mainPhoto   = recipe.mainPhoto   ?? recipe.MainPhoto   ?? "/images/placeholder.jpg";

    const li = document.createElement("li");
    li.className = "recipe-card";
    li.setAttribute("role", "listitem");
    li.setAttribute("tabindex", "0");
    li.dataset.id = id;

    li.innerHTML = `
      <img class="recipe-photo" src="${escapeHtml(mainPhoto)}" alt="${escapeHtml(title)}" />
      <h2 class="recipe-title">${escapeHtml(title)}</h2>
      <p class="recipe-desc">${escapeHtml(description)}</p>
      <div class="compose-row">
        <button class="compose-btn btn" type="button"
                aria-haspopup="true" aria-expanded="false">Состав</button>
      </div>
      <div class="ingredients" role="dialog" aria-label="Ингредиенты"
           aria-hidden="true" style="display:none;"></div>
    `;
    container.appendChild(li);
  }

  /* ── Кнопка «Состав» → модалка ──────────────────────────────── */
  function initComposeButtons(container) {
    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".compose-btn");
      if (!btn) return;
      e.stopPropagation();
      const id = btn.closest(".recipe-card")?.dataset.id;
      if (id && typeof window.openIngredientsModal === "function") {
        window.openIngredientsModal(Number(id));
      }
    });
  }

  /* ── Клик по карточке → recipe.html?id=... ──────────────────── */
  function initCardNavigation(container) {
    container.addEventListener("click", (e) => {
      if (e.target.closest("button, a, input, select")) return;
      const card = e.target.closest(".recipe-card");
      if (!card) return;
      const id = card.dataset.id;
      if (id) window.location.href = `/recipe.html?id=${encodeURIComponent(id)}`;
    });

    container.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (document.activeElement?.tagName === "BUTTON") return;
      const card = e.target.closest(".recipe-card");
      if (!card) return;
      e.preventDefault();
      const id = card.dataset.id;
      if (id) window.location.href = `/recipe.html?id=${encodeURIComponent(id)}`;
    });
  }

});
