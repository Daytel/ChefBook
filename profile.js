const avatarInput = document.getElementById("avatarInput");
const avatarPreview = document.getElementById("avatarPreview");
const removeAvatarBtn = document.getElementById("removeAvatar");
const nameInput = document.getElementById("name");
const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn");
const authorsList = document.getElementById("authorsList");
const plannerEnabled = document.getElementById("plannerEnabled");
const plannerFreq = document.getElementById("plannerFreq");

const pvAvatar = document.getElementById("pvAvatar");
const pvName = document.getElementById("pvName");
const pvFav = document.getElementById("pvFav");
const pvDis = document.getElementById("pvDis");
const pvPlanner = document.getElementById("pvPlanner");

const recipesListEl = document.getElementById("recipesList");
const confirmModal = document.getElementById("confirmModal");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");
const modalBackdrop = document.getElementById("modalBackdrop");

const STORAGE_KEY = "chefbook_profile_v1";
const RECIPES_KEY = "chefbook_recipes_v1";

const sampleAuthors = [
  { id: "a1", name: "Olga K." },
  { id: "a2", name: "Chef Anton" },
  { id: "a3", name: "Вкусная Еда" },
];

const allIngredients = [
  "Молоко",
  "Яйца",
  "Мука",
  "Сахар",
  "Соль",
  "Курица",
  "Говядина",
  "Свинина",
  "Картофель",
  "Помидоры",
  "Огурцы",
  "Морковь",
  "Лук",
  "Чеснок",
  "Рис",
  "Гречка",
  "Сыр",
  "Масло",
  "Сметана",
  "Перец",
  "Базилик",
];

const navMap = {
  home: "index.html",
  reviews: "reviews.html",
  saved: "saved.html",
  planner: "planner.html",
  "add-recipe": "add-recipe.html",
  profile: "profile.html",
  search: "search.html",
  about: "about.html",
};

/* Рендер списка ингредиентов в заданный контейнер */
function renderIngredientOptions(containerId, selectedArr = []) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  allIngredients.forEach((ing) => {
    const id = containerId + "_" + ing.replace(/\s+/g, "_");
    const label = document.createElement("label");
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.gap = "8px";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = ing;
    checkbox.id = id;
    checkbox.checked =
      Array.isArray(selectedArr) && selectedArr.indexOf(ing) !== -1;
    checkbox.addEventListener("change", () => {
      updatePreview();
      updateDropdownHeaderForContainer(containerId);
    });
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(ing));
    container.appendChild(label);
  });
  updateDropdownHeaderForContainer(containerId);
}

/* Прочитать отмеченные чекбоксы в контейнере */
function readSelected(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return Array.from(
    container.querySelectorAll('input[type="checkbox"]:checked')
  ).map((i) => i.value);
}

/* Обновить превью */
function updatePreview() {
  if (pvName) pvName.textContent = nameInput.value.trim() || "Не указано";
  const fav = readSelected("favOptions");
  const dis = readSelected("disOptions");
  if (pvFav)
    pvFav.textContent = "Любимые: " + (fav.length ? fav.join(", ") : "—");
  if (pvDis)
    pvDis.textContent = "Нелюбимые: " + (dis.length ? dis.join(", ") : "—");
  if (pvPlanner)
    pvPlanner.textContent =
      "Оповления планировщика: " +
      (plannerEnabled.checked
        ? plannerFreq.options[plannerFreq.selectedIndex].text
        : "выкл");
}

/* Обновить текст в заголовке dropdown (показывает выбранные / подсказку) --- */
function updateDropdownHeaderForContainer(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const header = container.querySelector(
    ".dropdown-header .dropdown-placeholder"
  );
  const selected = readSelected(containerId);
  if (!header) return;
  if (selected.length === 0) {
    header.textContent = "Выбрать ингредиенты...";
  } else if (selected.length <= 3) {
    header.textContent = selected.join(", ");
  } else {
    header.textContent =
      selected.slice(0, 3).join(", ") + " и " + (selected.length - 3) + " ещё";
  }
}

/* Отрисовать список авторов */
function renderAuthors(tracked = []) {
  if (!authorsList) return;
  authorsList.innerHTML = "";
  sampleAuthors.forEach((a) => {
    const row = document.createElement("div");
    row.className = "author-row";
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.padding = "6px 0";
    const left = document.createElement("div");
    left.textContent = a.name;
    const lbl = document.createElement("label");
    lbl.className = "switch";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = tracked.includes(a.id);
    cb.dataset.id = a.id;
    cb.addEventListener("change", updatePreview);
    const span = document.createElement("span");
    span.className = "slider";
    lbl.appendChild(cb);
    lbl.appendChild(span);
    row.appendChild(left);
    row.appendChild(lbl);
    authorsList.appendChild(row);
  });
}

/* Сохранение профиля */
function saveProfile() {
  const data = {
    name: nameInput.value.trim(),
    favorites: readSelected("favOptions"),
    dislikes: readSelected("disOptions"),
    planner: {
      enabled: plannerEnabled.checked,
      freq: plannerFreq.value,
    },
    trackedAuthors: Array.from(
      (authorsList || document).querySelectorAll("input[type=checkbox]")
    )
      .filter((i) => i.checked)
      .map((i) => i.dataset.id),
    avatarDataUrl:
      avatarPreview && avatarPreview.classList.contains("has-image")
        ? avatarPreview.style.backgroundImage
            .replace(/^url\((['"]?)/, "")
            .replace(/\1\)$/, "")
        : null,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    alert("Профиль сохранён (локально).");
  } catch (err) {
    console.error(err);
    alert("Ошибка сохранения: " + err.message);
  }
}

/* Загрузка профиля */
function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);

    nameInput.value = data.name || "";

    plannerEnabled.checked = data.planner ? !!data.planner.enabled : false;
    plannerFreq.value =
      data.planner && data.planner.freq ? data.planner.freq : "daily";

    // рендерим опции и отмечаем сохранённые
    renderIngredientOptions("favOptions", data.favorites || []);
    renderIngredientOptions("disOptions", data.dislikes || []);

    // authors
    renderAuthors(data.trackedAuthors || []);

    // avatar
    if (data.avatarDataUrl && avatarPreview) {
      const url = data.avatarDataUrl;
      avatarPreview.style.backgroundImage = `url(${url})`;
      avatarPreview.classList.add("has-image");
      if (pvAvatar) {
        pvAvatar.style.backgroundImage = `url(${url})`;
        pvAvatar.classList.add("has-image");
        pvAvatar.textContent = "";
      }
    } else if (avatarPreview) {
      avatarPreview.style.backgroundImage = "";
      avatarPreview.classList.remove("has-image");
      if (pvAvatar) {
        pvAvatar.style.backgroundImage = "";
        pvAvatar.classList.remove("has-image");
        pvAvatar.textContent = "👩‍🍳";
      }
    }

    updatePreview();
    updateDropdownHeaderForContainer("favOptions");
    updateDropdownHeaderForContainer("disOptions");
  } catch (err) {
    console.error("load error", err);
  }
}

/* Avatar preview handlers */
avatarInput.addEventListener("change", (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    const dataUrl = ev.target.result;
    if (avatarPreview) {
      avatarPreview.style.backgroundImage = `url(${dataUrl})`;
      avatarPreview.classList.add("has-image");
    }
    if (pvAvatar) {
      pvAvatar.textContent = "";
      pvAvatar.style.backgroundImage = `url(${dataUrl})`;
      pvAvatar.classList.add("has-image");
    }
  };
  reader.readAsDataURL(f);
});

removeAvatarBtn.addEventListener("click", () => {
  if (avatarInput) avatarInput.value = "";
  if (avatarPreview) {
    avatarPreview.style.backgroundImage = "";
    avatarPreview.classList.remove("has-image");
  }
  if (pvAvatar) {
    pvAvatar.style.backgroundImage = "";
    pvAvatar.classList.remove("has-image");
    pvAvatar.textContent = "👩‍🍳";
  }
});

/* Поведение выпадающего списка: открытие / закрытие, поиск, щелчок снаружи */
document.querySelectorAll(".dropdown-container").forEach((container) => {
  const header = container.querySelector(".dropdown-header");
  const list = container.querySelector(".dropdown-list");
  const search = container.querySelector(".dropdown-search");
  const optionsBox = container.querySelector(".dropdown-options");

  header.addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll(".dropdown-list").forEach((l) => {
      if (l !== list) l.classList.add("hidden");
    });
    list.classList.toggle("hidden");
    if (!list.classList.contains("hidden") && search) {
      setTimeout(() => search.focus(), 50);
    }
  });

  list.addEventListener("click", (e) => e.stopPropagation());

  if (search && optionsBox) {
    search.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase();
      Array.from(optionsBox.querySelectorAll("label")).forEach((opt) => {
        const text = opt.textContent.toLowerCase();
        opt.style.display = text.includes(term) ? "flex" : "none";
      });
    });
  }

  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) {
      list.classList.add("hidden");
    }
  });
});

/* Save / Clear handlers */
saveBtn.addEventListener("click", saveProfile);
clearBtn.addEventListener("click", () => {
  if (
    !confirm("Сбросить профиль? Данные будут удалены из локального хранилища.")
  )
    return;
  localStorage.removeItem(STORAGE_KEY);
  document.getElementById("profileForm").reset();
  ["favOptions", "disOptions"].forEach((id) => {
    const c = document.getElementById(id);
    if (c)
      c.querySelectorAll("input[type=checkbox]").forEach(
        (cb) => (cb.checked = false)
      );
  });
  if (avatarPreview) {
    avatarPreview.style.backgroundImage = "";
    avatarPreview.classList.remove("has-image");
  }
  if (pvAvatar) {
    pvAvatar.style.backgroundImage = "";
    pvAvatar.classList.remove("has-image");
    pvAvatar.textContent = "👩‍🍳";
  }
  renderAuthors([]);
  updatePreview();
  updateDropdownHeaderForContainer("favOptions");
  updateDropdownHeaderForContainer("disOptions");
});

nameInput.addEventListener("input", updatePreview);
plannerEnabled.addEventListener("change", updatePreview);
plannerFreq.addEventListener("change", updatePreview);

// Навигация
Object.keys(navMap).forEach((cls) => {
  document.querySelectorAll("." + cls).forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault?.();
      // если это кнопка "Добавить рецепт" — просто переходим
      if (cls === "add-recipe") {
        window.location.href = navMap[cls];
        return;
      }
      window.location.href = navMap[cls];
    });
  });
});

document.querySelectorAll("button[data-href]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const href = btn.dataset.href;
    if (href) window.location.href = href;
  });
});

/* Управление рецептами пользователя */

/**
 * Структура рецепта:
 * { id: string, title: string, createdAt: number }
 */
function loadRecipes() {
  try {
    const raw = localStorage.getItem(RECIPES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("load recipes error", e);
    return [];
  }
}
function saveRecipes(arr) {
  try {
    localStorage.setItem(RECIPES_KEY, JSON.stringify(arr));
  } catch (e) {
    console.error("save recipes error", e);
  }
}

/* Для демонстрации добавим 1-2 примера, если пусто */
function ensureSampleRecipes() {
  const existing = loadRecipes();
  if (existing.length === 0) {
    const sample = [
      {
        id: "r_" + Date.now(),
        title: "Быстрая яичница",
        createdAt: Date.now() - 1000000,
      },
      {
        id: "r_" + (Date.now() + 1),
        title: "Томатный суп",
        createdAt: Date.now() - 500000,
      },
    ];
    saveRecipes(sample);
    return sample;
  }
  return existing;
}

let recipes = ensureSampleRecipes();
let pendingDeleteId = null;

function renderUserRecipes() {
  if (!recipesListEl) return;
  recipesListEl.innerHTML = "";
  if (!recipes || recipes.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "У вас пока нет созданных рецептов.";
    empty.style.color = "#666";
    recipesListEl.appendChild(empty);
    return;
  }
  recipes.forEach((r) => {
    const row = document.createElement("div");
    row.className = "recipe-row";
    const title = document.createElement("div");
    title.className = "recipe-title";
    title.textContent = r.title || "Без названия";
    const actions = document.createElement("div");
    actions.className = "recipe-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn";
    editBtn.type = "button";
    editBtn.textContent = "Изменить";
    editBtn.dataset.id = r.id;
    editBtn.addEventListener("click", () => {
      // Открыть страницу добавления/редактирования, передаём id как query param
      const target = navMap["add-recipe"] || "add-recipe.html";
      window.location.href = `${target}?id=${encodeURIComponent(r.id)}`;
    });

    const delBtn = document.createElement("button");
    delBtn.className = "btn";
    delBtn.type = "button";
    delBtn.textContent = "Удалить";
    delBtn.dataset.id = r.id;
    delBtn.addEventListener("click", () => {
      pendingDeleteId = r.id;
      showModal();
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    row.appendChild(title);
    row.appendChild(actions);
    recipesListEl.appendChild(row);
  });
}

/* --- Modal handling --- */
function showModal() {
  if (!confirmModal) return;
  confirmModal.classList.remove("hidden");
  // prevent background scroll
  document.body.style.overflow = "hidden";
}
function hideModal() {
  if (!confirmModal) return;
  confirmModal.classList.add("hidden");
  pendingDeleteId = null;
  document.body.style.overflow = "";
}

confirmNo.addEventListener("click", () => {
  hideModal();
});
modalBackdrop && modalBackdrop.addEventListener("click", hideModal);
confirmYes.addEventListener("click", () => {
  if (!pendingDeleteId) {
    hideModal();
    return;
  }
  recipes = recipes.filter((r) => r.id !== pendingDeleteId);
  saveRecipes(recipes);
  renderUserRecipes();
  hideModal();
});

/* Инициализация */
renderAuthors([]);
renderIngredientOptions("favOptions", []);
renderIngredientOptions("disOptions", []);
loadProfile();
updatePreview();
updateDropdownHeaderForContainer("favOptions");
updateDropdownHeaderForContainer("disOptions");

recipes = loadRecipes();
if (!recipes || recipes.length === 0) {
  recipes = ensureSampleRecipes();
}
renderUserRecipes();
