/* Пример данных */
const sample = [
  {
    title: "Куриное филе в сливочном соусе",
    desc: "Нежное куриное филе, запечённое в сливочном соусе с ароматными травами.",
    img: "./images/chicken_fillet.jpg",
    categories: ["Мясные", "Быстро"],
    ingredients: ["Куриное филе", "Сливки", "Лук"],
    time: 30,
    cal: 350,
  },
  {
    title: "Паста с грибным соусом",
    desc: "Классическая паста с соусом из шампиньонов и пармезана.",
    img: "./images/pasta_mushroom_sauce.jpg",
    categories: ["Паста", "Вегетарианские"],
    ingredients: ["Паста", "Грибы", "Пармезан"],
    time: 25,
    cal: 400,
  },
  {
    title: "Салат с авокадо",
    desc: "Освежающий салат с авокадо, помидорами и лаймовым соусом.",
    img: "./images/salad_avocado.webp",
    categories: ["Салаты", "Вегетарианские"],
    ingredients: ["Авокадо", "Помидоры", "Лайм"],
    time: 10,
    cal: 150,
  },
  {
    title: "Рататуй",
    desc: "Овощное рагу из баклажанов, кабачков и томатов.",
    img: "./images/ratatouille.jpg",
    categories: ["Супы", "Вегетарианские", "Сезонные"],
    ingredients: ["Баклажан", "Кабачок", "Томат"],
    time: 40,
    cal: 200,
  },
  {
    title: "Овсяная каша с медом",
    desc: "Полезная каша на завтрак с ягодами и медом.",
    img: "./images/oatmeal_porridge_honey.jpg",
    categories: ["Завтраки", "Вегетарианские"],
    ingredients: ["Овсянка", "Молоко", "Мед"],
    time: 10,
    cal: 180,
  },
  {
    title: "Суп-пюре из тыквы",
    desc: "Кремовый суп из тыквы со сливками и пряностями.",
    img: "./images/pumpkin_puree_soup.jpg",
    categories: ["Супы", "Сезонные", "Постные"],
    ingredients: ["Тыква", "Лук", "Сливки"],
    time: 30,
    cal: 150,
  },
  {
    title: "Блины с творогом",
    desc: "Тонкие блины с начинкой из сладкого творога.",
    img: "./images/pancakes_cottage_cheese.jpg",
    categories: ["Выпечка", "Десерты"],
    ingredients: ["Мука", "Молоко", "Творог"],
    time: 25,
    cal: 300,
  },
  {
    title: "Рыба на пару",
    desc: "Нежная рыба, приготовленная на пару с лимоном.",
    img: "./images/steamed_fish.jpg",
    categories: ["Рыба", "Быстро"],
    ingredients: ["Филе рыбы", "Лимон", "Соль", "Перец"],
    time: 20,
    cal: 220,
  },
  {
    title: "Тёплый салат с печёными овощами",
    desc: "Овощи, запечённые до карамелизации, под соусом.",
    img: "./images/salad_baked_vegetables.webp",
    categories: ["Салаты", "Вегетарианские"],
    ingredients: ["Перец", "Баклажан", "Оливковое масло"],
    time: 15,
    cal: 180,
  },
  {
    title: "Тирамису",
    desc: "Классический итальянский десерт с маскарпоне и кофе.",
    img: "./images/tiramisu.webp",
    categories: ["Десерты"],
    ingredients: ["Маскарпоне", "Печенье савоярди", "Кофе"],
    time: 15,
    cal: 400,
  },
  {
    title: "Карри с овощами",
    desc: "Ароматное карри с кокосовым молоком и овощами.",
    img: "./images/curry_vegetables.jpg",
    categories: ["Супы", "Вегетарианские", "Постные"],
    ingredients: ["Кокосовое молоко", "Карри паста", "Овощи"],
    time: 35,
    cal: 250,
  },
  {
    title: "Шоколадный кекс",
    desc: "Насыщенный кекс с бурым шоколадом и глазурью.",
    img: "./images/chocolate_cupcake.jpg",
    categories: ["Выпечка", "Десерты"],
    ingredients: ["Шоколад", "Мука", "Яйца"],
    time: 40,
    cal: 330,
  },
];

/* Утилиты */
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/* Рендер карточек */
function renderResults(list) {
  const grid = document.getElementById("resultsGrid");
  if (!grid) return;

  grid.innerHTML = "";
  const items = Array.isArray(list) ? list : [];

  if (!items.length) {
    const nores = document.createElement("div");
    nores.className = "no-results";
    nores.textContent = "Ничего не найдено";
    grid.appendChild(nores);
    return;
  }

  const isUL =
    grid.tagName.toLowerCase() === "ul" ||
    grid.classList.contains("recipes-list");

  items.forEach((r, i) => {
    if (isUL) {
      const li = document.createElement("li");
      li.className = "recipe-card";
      li.setAttribute("role", "listitem");
      li.dataset.id = r.id ?? i + 1;

      const ingList = (r.ingredients || [])
        .map((ing) => `<li>${escapeHtml(ing)}</li>`)
        .join("");

      li.innerHTML = `
        <img class="recipe-photo" alt="${escapeHtml(
          r.title
        )}" src="${escapeHtml(r.img)}" />
        <h2 class="recipe-title">${escapeHtml(r.title)}</h2>
        <p class="recipe-desc">${escapeHtml(r.desc)}</p>
        <div class="compose-row">
          <button class="compose-btn btn" type="button" aria-haspopup="true" aria-expanded="false">Состав</button>
        </div>
        <div class="ingredients" role="dialog" aria-label="Ингредиенты" aria-hidden="true" style="display:none;">
          <h2>Ингредиенты</h2>
          <ul>${ingList}</ul>
        </div>
      `;
      grid.appendChild(li);
    }
  });

  initCardsNavigation();
}

/* История */
function addToHistory(title) {
  const hList = document.getElementById("historyList");
  if (!hList) return;
  const item = document.createElement("div");
  item.textContent = title;
  if (hList.textContent.trim() === "Пусто") hList.textContent = "";
  hList.prepend(item);
}

/* Фильтрация */
function filterRecipes() {
  const question = (document.getElementById("question")?.value || "")
    .trim()
    .toLowerCase();
  const ingVal = (document.getElementById("f-ing")?.value || "").trim();
  const timeVal = (document.getElementById("f-time")?.value || "").trim();
  const calVal = (document.getElementById("f-cal")?.value || "").trim();
  const selectedCats = Array.from(
    document.querySelectorAll(".category-checkbox:checked")
  ).map((c) => c.value);

  const maxTime = timeVal ? Number(timeVal) : null;
  const maxCal = calVal ? Number(calVal) : null;

  return sample.filter((s) => {
    if (question) {
      const inTitle = (s.title || "").toLowerCase().includes(question);
      const inDesc = (s.desc || "").toLowerCase().includes(question);
      const inIng =
        Array.isArray(s.ingredients) &&
        s.ingredients.some((it) => (it || "").toLowerCase().includes(question));
      if (!inTitle && !inDesc && !inIng) return false;
    }

    if (ingVal) {
      if (
        !Array.isArray(s.ingredients) ||
        !s.ingredients.some(
          (it) => (it || "").toLowerCase() === ingVal.toLowerCase()
        )
      )
        return false;
    }

    if (maxTime !== null) {
      if (typeof s.time !== "number" || s.time > maxTime) return false;
    }

    if (maxCal !== null) {
      if (typeof s.cal !== "number" || !(s.cal < maxCal)) return false;
    }

    if (selectedCats.length > 0) {
      if (!Array.isArray(s.categories)) return false;
      const ok = selectedCats.some((c) => s.categories.includes(c));
      if (!ok) return false;
    }

    return true;
  });
}

/* Поиск и рендер */
function doSearchAndRender(addHistory = true) {
  const res = filterRecipes();
  renderResults(res);

  if (addHistory) {
    const qText = (document.getElementById("question")?.value || "").trim();
    const selectedCats = Array.from(
      document.querySelectorAll(".category-checkbox:checked")
    ).map((c) => c.value);
    const histTitle =
      qText || (selectedCats.length ? selectedCats.join(", ") : "Поиск");
    addToHistory(histTitle);

    // обновляем URL без перезагрузки
    const params = new URLSearchParams();
    if (qText) params.set("question", qText);
    const ingVal = document.getElementById("f-ing")?.value;
    if (ingVal) params.set("ingredient", ingVal);
    const timeVal = document.getElementById("f-time")?.value;
    if (timeVal) params.set("time", timeVal);
    const calVal = document.getElementById("f-cal")?.value;
    if (calVal) params.set("cal", calVal);
    document
      .querySelectorAll(".category-checkbox:checked")
      .forEach((cb) => params.append("categories[]", cb.value));
    const newURL = window.location.pathname + "?" + params.toString();
    window.history.replaceState({}, "", newURL);
  }
}

/* Навигация карточек */
function initCardsNavigation() {
  const grid = document.getElementById("resultsGrid");
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

/* Делегирование кнопки "Состав" */
function initComposePopups() {
  const grid = document.getElementById("resultsGrid");
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

/* Инициализация по URL */
function initFromURL() {
  renderResults(sample);

  const params = new URLSearchParams(window.location.search);

  document.getElementById("question").value = params.get("question") || "";
  document.getElementById("f-ing").value = params.get("ingredient") || "";
  document.getElementById("f-time").value = params.get("time") || "";
  document.getElementById("f-cal").value = params.get("cal") || "";

  const cats = params.getAll("categories[]") || [];
  document
    .querySelectorAll(".category-checkbox")
    .forEach((cb) => (cb.checked = cats.includes(cb.value)));
}

/* DOM Ready */
document.addEventListener("DOMContentLoaded", () => {
  initFromURL();
  initComposePopups();

  const form = document.querySelector(".search-area");
  if (form)
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      doSearchAndRender(true);
    });

  ["f-ing", "f-time", "f-cal"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", () => doSearchAndRender(false));
  });
  document
    .querySelectorAll(".category-checkbox")
    .forEach((cb) =>
      cb.addEventListener("change", () => doSearchAndRender(false))
    );

  document.querySelectorAll("button[data-href]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const href = btn.dataset.href;
      if (href) window.location.href = href;
    });
  });

  renderResults(sample);
});
