/* =====================================================================
   search.js — ChefBook
   Первая загрузка: карточки уже отрисованы сервером (SSR в Index.cshtml).
   При изменении фильтров: AJAX-запрос к /api/recipes → обновление карточек.
   ===================================================================== */

/* Утилиты */
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/* --- Состояние пагинации --- */
let currentPage  = 1;
let totalPages   = 1;
let totalItems   = 0;

/* --- Рендер карточек (вызывается после AJAX) --- */
function renderResults(recipes) {
  const grid = document.getElementById("resultsGrid");
  if (!grid) return;

  grid.innerHTML = "";

  if (!recipes.length) {
    const msg = document.createElement("div");
    msg.className = "no-results";
    msg.textContent = "Ничего не найдено";
    grid.appendChild(msg);
    updateNavButtons();
    return;
  }

  recipes.forEach((r) => {
    const li = document.createElement("li");
    li.className = "recipe-card";
    li.setAttribute("role", "listitem");
    li.dataset.id = r.id;

    const photo = r.mainPhoto ?? "/images/placeholder.jpg";

    li.innerHTML = `
      <img class="recipe-photo" alt="${escapeHtml(r.title)}" src="${escapeHtml(photo)}" />
      <h2 class="recipe-title">${escapeHtml(r.title)}</h2>
      <p class="recipe-desc">${escapeHtml(r.description ?? "")}</p>
      <p class="recipe-time">⏱ ${escapeHtml(r.cookingTimeMinutes)} мин</p>
      <div class="compose-row">
        <button class="compose-btn btn" type="button"
                aria-haspopup="true" aria-expanded="false">Состав</button>
      </div>
      <div class="ingredients" role="dialog" aria-label="Ингредиенты"
           aria-hidden="true" style="display:none;">
      </div>
    `;
    grid.appendChild(li);
  });

  initCardsNavigation();
}

/* --- Обновление кнопок пагинации --- */
function updateNavButtons() {
  const prev      = document.getElementById("navPrev");
  const next      = document.getElementById("navNext");
  const indicator = document.getElementById("pageIndicator");

  if (prev) prev.disabled = currentPage <= 1;
  if (next) next.disabled = currentPage >= totalPages;
  if (indicator) {
    indicator.textContent = `Страница ${currentPage} из ${totalPages} (${totalItems})`;
  }
}

/* --- Основной AJAX-запрос к API --- */
async function fetchAndRender(page = 1, pushHistory = true) {
  const search      = document.getElementById("question")?.value.trim() ?? "";
  const maxTime     = document.getElementById("f-time")?.value ?? "";
  const categoryIds = Array.from(
    document.querySelectorAll(".category-checkbox:checked")
  ).map((cb) => cb.value);

  // Собираем URL параметры
  const params = new URLSearchParams();
  if (search)    params.set("search", search);
  if (maxTime)   params.set("maxTime", maxTime);
  categoryIds.forEach((id) => params.append("categoryIds", id));
  params.set("page", String(page));

  // Показываем индикатор загрузки
  const grid = document.getElementById("resultsGrid");
  if (grid) {
    grid.innerHTML = `<div class="loading" aria-live="polite">Загрузка...</div>`;
  }

  try {
    const response = await fetch(`/api/recipes?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Ошибка сервера: ${response.status}`);
    }

    const data = await response.json();

    // Обновляем состояние пагинации
    currentPage = data.currentPage;
    totalPages  = data.totalPages;
    totalItems  = data.totalItems;

    renderResults(data.data);
    updateNavButtons();

    // Синхронизируем URL с фильтрами (без перезагрузки страницы)
    const pageUrl = window.location.pathname + "?" + params.toString();
    if (pushHistory) {
      window.history.pushState({}, "", pageUrl);
      // История поиска
      const label = search || (categoryIds.length ? `категории: ${categoryIds.length}` : "Поиск");
      addToHistory(label);
    } else {
      window.history.replaceState({}, "", pageUrl);
    }

  } catch (err) {
    console.error("Ошибка загрузки рецептов:", err);
    if (grid) {
      grid.innerHTML = `<div class="no-results">Не удалось загрузить рецепты. Попробуйте ещё раз.</div>`;
    }
  }
}

/* --- История поиска --- */
function addToHistory(label) {
  const hList = document.getElementById("historyList");
  if (!hList) return;
  if (hList.textContent.trim() === "Пусто") hList.textContent = "";
  const item = document.createElement("div");
  item.textContent = label;
  hList.prepend(item);
}

/* --- Навигация по карточкам --- */
function initCardsNavigation() {
  const grid = document.getElementById("resultsGrid");
  if (!grid) return;

  grid.querySelectorAll(".recipe-card").forEach((card) => {
    if (!card.hasAttribute("tabindex")) card.setAttribute("tabindex", "0");

    function navigate() {
      const id = card.dataset.id;
      if (id) window.location.href = `/recipe.html?id=${encodeURIComponent(id)}`;
    }

    card.addEventListener("click", (e) => {
      if (e.target.closest("button, a, input, textarea, select")) return;
      navigate();
    });
    card.addEventListener("keydown", (e) => {
      if (["Enter", " "].includes(e.key)) {
        if (document.activeElement?.tagName === "BUTTON") return;
        e.preventDefault();
        navigate();
      }
    });
  });
}

/* --- AJAX 4: кнопка «Состав» → модальное окно с ингредиентами из БД --- */
function initComposePopups() {
  const grid = document.getElementById("resultsGrid");
  if (!grid) return;

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".compose-btn");
    if (!btn) return;

    const card = btn.closest(".recipe-card");
    const id   = card?.dataset.id;
    if (!id) return;

    // Вызываем модалку из recipe.js (она экспортирована в window)
    if (typeof window.openIngredientsModal === "function") {
      window.openIngredientsModal(Number(id));
    }
  });
}

/* --- Восстановление состояния из URL при загрузке страницы --- */
function initFromURL() {
  const params = new URLSearchParams(window.location.search);

  const question = document.getElementById("question");
  const fTime    = document.getElementById("f-time");

  if (question) question.value = params.get("search") ?? "";
  if (fTime)    fTime.value    = params.get("maxTime") ?? "";

  const cats = params.getAll("categoryIds");
  document.querySelectorAll(".category-checkbox").forEach((cb) => {
    cb.checked = cats.includes(cb.value);
  });

  // Если в URL есть фильтры — сразу делаем AJAX-запрос
  // Если нет — оставляем SSR-карточки из Index.cshtml нетронутыми
  if (params.toString()) {
    const page = Number(params.get("page")) || 1;
    fetchAndRender(page, false);
  } else {
    // Инициализируем кнопки пагинации по данным из SSR
    const indicator = document.getElementById("pageIndicator");
    if (indicator) {
      const match = indicator.textContent.match(/(\d+)\s+из\s+(\d+)\s+\((\d+)\)/);
      if (match) {
        currentPage = Number(match[1]);
        totalPages  = Number(match[2]);
        totalItems  = Number(match[3]);
        updateNavButtons();
      }
    }
    initCardsNavigation();
  }
}

/* --- DOM Ready --- */
document.addEventListener("DOMContentLoaded", () => {
  initFromURL();
  initComposePopups();

  // Форма поиска
  const form = document.querySelector(".search-area");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      fetchAndRender(1, true);
    });
  }

  // Фильтр времени — реагирует сразу при изменении
  document.getElementById("f-time")?.addEventListener("change", () => {
    fetchAndRender(1, false);
  });

  // Чекбоксы категорий — реагируют сразу при изменении
  document.querySelectorAll(".category-checkbox").forEach((cb) => {
    cb.addEventListener("change", () => fetchAndRender(1, false));
  });

  // Кнопки пагинации
  document.getElementById("navPrev")?.addEventListener("click", () => {
    if (currentPage > 1) fetchAndRender(currentPage - 1, false);
  });
  document.getElementById("navNext")?.addEventListener("click", () => {
    if (currentPage < totalPages) fetchAndRender(currentPage + 1, false);
  });

  // Навигация data-href (шапка и футер)
  document.querySelectorAll("button[data-href]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const href = btn.dataset.href;
      if (href) window.location.href = href;
    });
  });
});
