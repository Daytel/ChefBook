// ---------- sample saved recipes (with images + ingredients) ----------
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

// ---------- state ----------
const STORAGE_KEYS = {
  SAVED: "chefbook.savedRecipes",
  PLAN: "chefbook.weekPlan",
  WEEK_START: "chefbook.weekStart",
};

let saved = loadSaved();
let weekPlan = loadPlan();
let selectedDay = null;
let weekStart = loadWeekStart();

// ---------- helpers ----------
function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function saveState() {
  localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify(saved));
  localStorage.setItem(STORAGE_KEYS.PLAN, JSON.stringify(weekPlan));
  if (weekStart)
    localStorage.setItem(STORAGE_KEYS.WEEK_START, weekStart.getTime());
}

function loadSaved() {
  const raw = localStorage.getItem(STORAGE_KEYS.SAVED);
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      // если в рецептах нет картинок — пересоздаём
      if (!arr[0]?.img) throw new Error("no images");
      return arr;
    } catch (e) {
      console.warn("Старая версия сохранений — сбрасываем.");
    }
  }
  localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify(sampleSaved));
  return sampleSaved.slice();
}

function loadPlan() {
  const raw = localStorage.getItem(STORAGE_KEYS.PLAN);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {}
  }
  return {};
}

function loadWeekStart() {
  const raw = localStorage.getItem(STORAGE_KEYS.WEEK_START);
  if (raw) {
    const t = Number(raw);
    if (!isNaN(t)) return new Date(t);
  }
  return startOfWeek(new Date());
}

// ---------- rendering ----------
function renderSavedList() {
  const box = document.getElementById("savedList");
  box.innerHTML = "";
  if (!saved || saved.length === 0) {
    box.innerHTML = '<div class="box">Нет сохранённых рецептов</div>';
    return;
  }
  saved.forEach((r) => {
    const card = document.createElement("div");
    card.className = "card saved-card";
    card.setAttribute("role", "listitem");
    card.draggable = true;
    card.dataset.id = r.id;
    card.innerHTML = `
        <div class="photo" aria-hidden="true">
          <img src="${r.img}" alt="${escapeHtml(r.title)}">
        </div>
        <h4 class="title">${escapeHtml(r.title)}</h4>
        <p class="desc">${escapeHtml(r.desc)}</p>
        <div class="compose-row">
          <button class="btn small add-btn" data-id="${r.id}">Добавить в меню</button>
          <button class="btn small remove-saved" data-id="${
            r.id
          }">Удалить из сохранённых</button>
        </div>
      `;
    card.addEventListener("dragstart", (ev) => {
      ev.dataTransfer.setData("text/plain", r.id);
      ev.dataTransfer.effectAllowed = "copy";
    });
    box.appendChild(card);
  });
}

function renderCalendar() {
  const cal = document.getElementById("calendar");
  cal.innerHTML = "";
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  days.forEach((d) => {
    const key = formatDateKey(d);
    const dayEl = document.createElement("div");
    dayEl.className = "calendar-day";
    dayEl.dataset.key = key;
    dayEl.tabIndex = 0;
    dayEl.innerHTML = `
        <div class="day-head">
          <div class="day-name">${dayName(d)}</div>
          <div class="day-date">${d.getDate()}.${String(
      d.getMonth() + 1
    ).padStart(2, "0")}</div>
        </div>
        <div class="day-recipes" role="list"></div>
      `;

    dayEl.addEventListener("dragover", (ev) => {
      ev.preventDefault();
      dayEl.classList.add("dragover");
    });
    dayEl.addEventListener("dragleave", () =>
      dayEl.classList.remove("dragover")
    );
    dayEl.addEventListener("drop", (ev) => {
      ev.preventDefault();
      dayEl.classList.remove("dragover");
      const id = ev.dataTransfer.getData("text/plain");
      if (id) addRecipeToDay(key, id);
    });

    dayEl.addEventListener("click", (ev) => {
      if (ev.target.matches(".remove-day-recipe")) return;
      selectDay(key);
    });

    const listEl = dayEl.querySelector(".day-recipes");
    const ids = weekPlan[key] || [];
    if (ids.length === 0) {
      listEl.innerHTML = '<div class="muted">Пусто</div>';
    } else {
      listEl.innerHTML = "";
      ids.forEach((entry, idx) => {
        const r = saved.find((s) => s.id === entry.recipeId);
        const item = document.createElement("div");
        item.className = "day-recipe";
        item.dataset.recipeId = entry.recipeId;
        item.dataset.index = idx;

        // "Порции" и кнопки +/-
        item.innerHTML = `
          <div class="day-recipe-title">
            ${escapeHtml(r ? r.title : "(удален)")}
          </div>

          <div style="display:flex; align-items:center; gap:6px;">
            <label class="muted" style="font-size:12px; margin-right:4px;">Порции:</label>
            <button class="btn small portion-decrease" data-day="${key}" data-i="${idx}" aria-label="Уменьшить порции">−</button>
            <input type="number" min="1" class="portion-input" value="${entry.portions}" style="width:56px; text-align:center;" data-day="${key}" data-i="${idx}">
            <button class="btn small portion-increase" data-day="${key}" data-i="${idx}" aria-label="Увеличить порции">+</button>
            <button class="btn small remove-day-recipe" data-day="${key}" data-i="${idx}" style="margin-left:6px;">✕</button>
          </div>
        `;

        // Обработка изменения порций (через инпут) — сохраним вашу логику, но с корректировкой индекса
        const inputEl = item.querySelector(".portion-input");
        inputEl.addEventListener("change", (ev) => {
          let v = Number(ev.target.value);
          if (v < 1 || isNaN(v)) v = 1;

          // обновляем соответствующую запись по индексу
          // проверяем, может быть, что за время взаимодействия индекс поменялся — на всякий случай найдём запись по recipeId
          if (weekPlan[key] && weekPlan[key][idx]) {
            weekPlan[key][idx].portions = v;
          } else {
            // fallback: ищем запись с таким recipeId
            const found = weekPlan[key]?.find((x) => x.recipeId === entry.recipeId);
            if (found) found.portions = v;
          }

          saveState();
          if (key === selectedDay) renderIngredients();
        });

        // Кнопка увеличить
        item.querySelector(".portion-increase").addEventListener("click", (ev) => {
          ev.stopPropagation();
          if (!weekPlan[key]) return;
          if (weekPlan[key][idx]) {
            weekPlan[key][idx].portions = Number(weekPlan[key][idx].portions || 0) + 1;
          } else {
            // fallback по recipeId
            const found = weekPlan[key]?.find((x) => x.recipeId === entry.recipeId);
            if (found) found.portions = Number(found.portions || 0) + 1;
          }
          saveState();
          if (key === selectedDay) renderIngredients();
          renderCalendar(); // повторный рендер, чтобы обновить инпут
        });

        // Кнопка уменьшить
        item.querySelector(".portion-decrease").addEventListener("click", (ev) => {
          ev.stopPropagation();
          if (!weekPlan[key]) return;
          if (weekPlan[key][idx]) {
            weekPlan[key][idx].portions = Math.max(1, Number(weekPlan[key][idx].portions || 0) - 1);
          } else {
            const found = weekPlan[key]?.find((x) => x.recipeId === entry.recipeId);
            if (found) found.portions = Math.max(1, Number(found.portions || 0) - 1);
          }
          saveState();
          if (key === selectedDay) renderIngredients();
          renderCalendar();
        });

        // оставляем кнопку удаления как было — слушатель внизу обработает её клик
        listEl.appendChild(item);
      });
    }

    listEl.addEventListener("click", (ev) => {
      if (ev.target.matches(".remove-day-recipe")) {
        const day = ev.target.dataset.day;
        const i = Number(ev.target.dataset.i);
        removeRecipeFromDay(day, i);
      }
    });

    if (key === selectedDay) dayEl.classList.add("selected");
    cal.appendChild(dayEl);
  });

  renderIngredients();
}

function dayName(d) {
  const names = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  return names[d.getDay()];
}

function renderIngredients() {
  const box = document.getElementById("ingredientsList");
  if (!selectedDay) {
    box.innerHTML = "Выберите день в календаре";
    return;
  }

  const ids = weekPlan[selectedDay] || [];
  if (!ids.length) {
    box.innerHTML = '<div class="muted">В этот день нет рецептов</div>';
    return;
  }

  // агрегируем ингредиенты
  const map = {};
  ids.forEach((entry) => {
    const r = saved.find((s) => s.id === entry.recipeId);
    if (!r || !r.ingredients) return;

    r.ingredients.forEach((ing) => {
      const key = `${ing.name}||${ing.unit}`;
      if (!map[key]) map[key] = { name: ing.name, unit: ing.unit, qty: 0 };
      map[key].qty += (Number(ing.qty) || 0) * entry.portions;
    });
  });

  const rows = Object.values(map).map(
    (m) =>
      `<div class="ing-row">
          <div class="ing-name">${escapeHtml(m.name)}</div>
          <div class="ing-qty">${m.qty} ${escapeHtml(m.unit)}</div>
       </div>`
  );

  // Кнопки: копировать и PDF
  const buttonsHtml = `
    <div style="margin-top:8px; text-align:right; display:flex; gap:8px; justify-content:flex-end;">
      <button id="exportList" class="btn">Скопировать</button>
      <button id="exportPdf" class="btn">PDF</button>
    </div>
  `;

  box.innerHTML = rows.join("") + buttonsHtml;

  // Копирование списка
  document.getElementById("exportList").addEventListener("click", () => {
    const text = Object.values(map)
      .map((m) => `${m.name} — ${m.qty} ${m.unit}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    alert("Список ингредиентов скопирован в буфер обмена");
  });

  // Генерация PDF через html2pdf.js
  document.getElementById("exportPdf").addEventListener("click", () => {
    const element = document.createElement("div");

    // Формируем простой HTML для PDF
    element.innerHTML = `
      <h2>Список ингредиентов</h2>
      ${rows.join("")}
    `;

    // Настройки html2pdf
    html2pdf()
      .set({
        margin: 10,
        filename: `ingredients-${selectedDay}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(element)
      .save();
  });
}

function renderAuthor() {
  const author = sampleAuthor;

  // Аватар
  const avatarBox = document.getElementById("authorAvatar");
  avatarBox.innerHTML = `<img src="${author.avatarUrl}" alt="Аватар автора">`;

  // Имя
  document.getElementById("authorName").textContent = author.name;

  // Описание / биография
  document.getElementById("authorBio").textContent = author.bio;

  // Количество рецептов
  document.getElementById("authorRecipes").textContent =
    "Рецептов: " + author.recipes;

  // Подписчики
  document.getElementById("authorFollowers").textContent =
    "Подписчиков: " + author.followers;
}

// ---------- actions ----------
function addRecipeToDay(dayKey, recipeId) {
  if (!weekPlan[dayKey]) weekPlan[dayKey] = [];

  weekPlan[dayKey].push({
    recipeId: recipeId,
    portions: 1,
  });

  saveState();
  renderCalendar();
  selectDay(dayKey);
}

function removeRecipeFromDay(dayKey, index) {
  if (!weekPlan[dayKey]) return;
  weekPlan[dayKey].splice(index, 1);
  if (!weekPlan[dayKey].length) delete weekPlan[dayKey];
  saveState();
  renderCalendar();
}

function selectDay(dayKey) {
  selectedDay = dayKey;
  renderCalendar();
  document
    .getElementById("ingredientsBox")
    .scrollIntoView({ behavior: "smooth", block: "nearest" });
}

document.addEventListener("click", (ev) => {
  if (ev.target.matches(".add-btn")) {
    const id = ev.target.dataset.id;
    const day = selectedDay || formatDateKey(weekStart);
    addRecipeToDay(day, id);
  } else if (ev.target.matches(".remove-saved")) {
    const id = ev.target.dataset.id;
    if (!confirm("Удалить сохранённый рецепт?")) return;
    saved = saved.filter((s) => s.id !== id);
    for (const k of Object.keys(weekPlan)) {
      weekPlan[k] = weekPlan[k].filter((x) => x !== id);
      if (!weekPlan[k].length) delete weekPlan[k];
    }
    saveState();
    renderSavedList();
    renderCalendar();
  } else if (ev.target.matches(".home")) {
    window.location.href = "index.html";
  }
});

document.getElementById("clearDayBtn").addEventListener("click", () => {
  if (!selectedDay) return alert("Выберите день для очистки");
  if (!confirm("Очистить все рецепты в выбранном дне?")) return;
  delete weekPlan[selectedDay];
  saveState();
  renderCalendar();
});

document.getElementById("prevWeek").addEventListener("click", () => {
  weekStart.setDate(weekStart.getDate() - 7);
  saveState();
  renderCalendar();
});
document.getElementById("nextWeek").addEventListener("click", () => {
  weekStart.setDate(weekStart.getDate() + 7);
  saveState();
  renderCalendar();
});

document.getElementById("clearAllSaved").addEventListener("click", () => {
  if (!confirm("Удалить все сохранённые рецепты?")) return;
  saved = [];
  weekPlan = {};
  saveState();
  renderSavedList();
  renderCalendar();
});

document.querySelectorAll("button[data-href]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const href = btn.dataset.href;
    if (href) window.location.href = href;
  });
});

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

if (!saved || !saved.length) saved = sampleSaved.slice();
selectedDay = formatDateKey(weekStart);
renderSavedList();
renderCalendar();
renderAuthor();
