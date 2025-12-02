// Пример сохранённых рецептов (для отображения карточек)
const sampleSaved = [
  {
    id: "r1",
    title: "Простой салат с курицей",
    desc: "Вкусный салат за 15 минут",
    img: "https://thumbs.dreamstime.com/b/salat-mit-bulgur-gebrannter-huhn-gr%C3%BCne-paprika-basilikum-und-feta-auf-einer-wei%C3%9Fen-jury-nahaufnahme-horizontales-format-wei%C3%9Fer-199389945.jpg",
    ingredients: [
      { name: "Курица (филе)", qty: 300, unit: "г" },
      { name: "Салат", qty: 150, unit: "г" },
      { name: "Помидоры", qty: 100, unit: "г" },
      { name: "Оливковое масло", qty: 2, unit: "ст.л." },
    ],
  },
  {
    id: "r2",
    title: "Шоколадный кекс",
    desc: "Нежный десерт",
    img: "https://i.pinimg.com/originals/db/62/13/db62137dc5e55422c0cbd77cfc953595.jpg",
    ingredients: [
      { name: "Мука", qty: 200, unit: "г" },
      { name: "Какао-порошок", qty: 30, unit: "г" },
      { name: "Яйца", qty: 2, unit: "шт" },
      { name: "Сахар", qty: 120, unit: "г" },
    ],
  },
  {
    id: "r3",
    title: "Паста с лососем",
    desc: "Быстро и сытно",
    img: "https://avatars.dzeninfra.ru/get-zen_doc/271828/pub_6697446f54b1da77a375bb2d_669744c1b57ddf67fc835c34/scale_1200",
    ingredients: [
      { name: "Паста", qty: 200, unit: "г" },
      { name: "Лосось", qty: 150, unit: "г" },
      { name: "Сливки", qty: 100, unit: "мл" },
      { name: "Пармезан", qty: 30, unit: "г" },
    ],
  },
];

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Автор
const AUTHOR_ID = "author_saved";
const sampleAuthor = {
  id: AUTHOR_ID,
  name: "Александра Иванова",
  bio: "Любит простые и быстрые рецепты для будних дней. Делится лайфхаками по хранению продуктов.",
  recipes: 12,
  followers: 134,
  avatarUrl:
    "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200",
};

function renderAuthor() {
  const authorNameEl = document.getElementById("authorName");
  const authorBioEl = document.getElementById("authorBio");
  const authorRecipesEl = document.getElementById("authorRecipes");
  const authorFollowersEl = document.getElementById("authorFollowers");
  const authorAvatar = document.getElementById("authorAvatar");

  if (!authorNameEl) return;
  authorNameEl.textContent = sampleAuthor.name;
  authorBioEl.textContent = sampleAuthor.bio;
  authorRecipesEl.textContent = "Рецептов: " + sampleAuthor.recipes;
  authorFollowersEl.textContent = "Подписчиков: " + sampleAuthor.followers;
  authorAvatar.innerHTML = `<img src="${sampleAuthor.avatarUrl}" alt="${sampleAuthor.name}" class="avatar-img" />`;
}

/* Рендер карточек (поддерживает ингредиенты-объекты с qty/unit) */
function renderSaved(list) {
  const grid = document.getElementById("savedGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const items = Array.isArray(list) ? list : [];

  items.forEach((r, i) => {
    const item = document.createElement("article");
    item.className = "card recipe-card";
    item.setAttribute("role", "listitem");
    item.tabIndex = 0;
    item.dataset.id = r.id || i + 1;

    // Если ingredients — массив объектов {name, qty, unit}
    const ingList = (r.ingredients || [])
      .map((ing) => {
        const name = escapeHtml(ing.name || "");
        const qty = ing.qty != null ? String(ing.qty) : "";
        const unit = ing.unit ? String(ing.unit) : "";
        // Форматируем: если есть qty — добавляем тире и qty+unit
        if (qty)
          return `<li>${name} — ${escapeHtml(
            qty + (unit ? " " + unit : "")
          )}</li>`;
        return `<li>${name}</li>`;
      })
      .join("");

    item.innerHTML = `
      <div class="photo" aria-hidden="true">
        <img src="${r.img}" alt="${escapeHtml(r.title)}">
      </div>
      <h4 class="title">${escapeHtml(r.title)}</h4>
      <p class="desc">${escapeHtml(r.desc)}</p>
      <div class="compose-row">
        <button class="btn compose-btn" type="button" aria-haspopup="true" aria-expanded="false">Состав</button>
      </div>
      <div class="ingredients" role="dialog" aria-label="Ингредиенты" aria-hidden="true" style="display:none;">
        <h3>Ингредиенты</h3>
        <ul>${ingList}</ul>
      </div>
    `;

    grid.appendChild(item);
  });

  initCardsNavigation();
}

/* Навигация: клик по карточке (кроме интерактивных элементов) ведёт на recipe.html?id=... */
function initCardsNavigation() {
  const grid = document.getElementById("savedGrid");
  if (!grid) return;
  const cards = grid.querySelectorAll(".recipe-card");

  cards.forEach((card) => {
    if (!card.hasAttribute("tabindex")) card.setAttribute("tabindex", "0");

    function navigate() {
      const id = card.dataset.id;
      if (id) window.location.href = `recipe.html?id=${encodeURIComponent(id)}`;
    }

    card.addEventListener("click", (e) => {
      if (e.target.closest("button, a, input, textarea, select")) return;
      navigate();
    });

    card.addEventListener("keydown", (e) => {
      if (["Enter", " ", "Spacebar", "Space"].includes(e.key)) {
        const active = document.activeElement;
        if (
          active &&
          (active.tagName === "BUTTON" ||
            active.tagName === "A" ||
            active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA")
        )
          return;
        e.preventDefault();
        navigate();
      }
    });
  });
}

/* Делегирование кнопки "Состав" — один открытый блок одновременно */
function initComposePopups() {
  const grid = document.getElementById("savedGrid");
  let openMenu = null;
  if (!grid) return;

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".compose-btn");
    if (!btn) return;

    e.stopPropagation();
    const card = btn.closest(".recipe-card");
    const menu = card.querySelector(".ingredients");
    if (!menu) return;

    if (openMenu && openMenu !== menu) {
      openMenu.style.display = "none";
      const oldBtn = openMenu
        .closest(".recipe-card")
        ?.querySelector(".compose-btn");
      if (oldBtn) oldBtn.setAttribute("aria-expanded", "false");
      openMenu = null;
    }

    const isOpen = menu.style.display === "block";
    if (isOpen) {
      menu.style.display = "none";
      menu.setAttribute("aria-hidden", "true");
      btn.setAttribute("aria-expanded", "false");
      openMenu = null;
    } else {
      menu.style.display = "block";
      menu.setAttribute("aria-hidden", "false");
      btn.setAttribute("aria-expanded", "true");
      openMenu = menu;
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".recipe-card") && openMenu) {
      openMenu.style.display = "none";
      const oldBtn = openMenu
        .closest(".recipe-card")
        ?.querySelector(".compose-btn");
      if (oldBtn) oldBtn.setAttribute("aria-expanded", "false");
      openMenu.setAttribute("aria-hidden", "true");
      openMenu = null;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openMenu) {
      openMenu.style.display = "none";
      const oldBtn = openMenu
        .closest(".recipe-card")
        ?.querySelector(".compose-btn");
      if (oldBtn) oldBtn.setAttribute("aria-expanded", "false");
      openMenu.setAttribute("aria-hidden", "true");
      openMenu = null;
    }
  });
}

/* Навигация для кнопок header/footer */
document.querySelectorAll("button[data-href]")?.forEach((btn) => {
  btn.addEventListener("click", () => {
    const href = btn.dataset.href;
    if (href) window.location.href = href;
  });
});

/* Инициализация страницы */
document.addEventListener("DOMContentLoaded", () => {
  renderAuthor();
  renderSaved(sampleSaved);
  initComposePopups();

  // навигация нижнего меню (если есть классы .home/.profile/.search как в других страницах)
  Array.from(document.querySelectorAll(".home")).forEach((b) =>
    b.addEventListener("click", () => (window.location.href = "index.html"))
  );
  Array.from(document.querySelectorAll(".profile")).forEach((b) =>
    b.addEventListener("click", () => (window.location.href = "profile.html"))
  );
  Array.from(document.querySelectorAll(".search")).forEach((b) =>
    b.addEventListener("click", () => (window.location.href = "search.html"))
  );
});
