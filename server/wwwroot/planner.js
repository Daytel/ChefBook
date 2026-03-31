/* planner.js — ChefBook  /planner.html
   Планировщик меню. Drag-and-drop + кнопка для добавления рецепта на день.
   API: GET/POST/PATCH/DELETE /api/planner/...
*/
(function () {
  "use strict";

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
  function fmt(qty, portions) {
    return parseFloat((qty * portions).toFixed(2));
  }

  const user = window.chefbook?.getUser?.() ?? null;

  // Состояние
  let weekStart = getMonday(new Date());
  let weekPlan = {}; // { "2024-01-15": [{id, recipeId, portions, recipe}] }
  let savedRecipes = []; // избранные рецепты пользователя
  let selectedDay = null;

  /* Инициализация */
  document.addEventListener("DOMContentLoaded", () => {
    if (!user) {
      document.querySelector(".site__main").innerHTML =
        "<p style='padding:20px;color:#888'>Войдите в аккаунт для использования планировщика.</p>";
      return;
    }
    fillUserBlock();
    renderCalendar();
    loadSavedRecipes();
    bindControls();
  });

  function fillUserBlock() {
    const setTxt = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    setTxt("authorName", user.displayName || user.email || "Профиль");
    const avatarEl = document.getElementById("authorAvatar");
    if (avatarEl && user.avatarUrl) {
      const img = document.createElement("img");
      img.src = user.avatarUrl;
      img.alt = user.displayName ?? "";
      img.className = "avatar-img";
      avatarEl.innerHTML = "";
      avatarEl.appendChild(img);
    }
  }

  /* Неделя */
  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function dateKey(date) {
    return date.toISOString().slice(0, 10);
  }

  function renderCalendar() {
    const calendar = document.getElementById("calendar");
    if (!calendar) return;
    calendar.innerHTML = "";

    const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const key = dateKey(date);

      const col = document.createElement("div");
      col.className = "calendar-day";
      col.dataset.date = key;

      const header = document.createElement("div");
      header.className = "day-header";
      header.innerHTML = `<strong>${days[i]}</strong> <span>${date.getDate()}.${String(date.getMonth() + 1).padStart(2, "0")}</span>`;
      header.addEventListener("click", () => selectDay(key, col));
      col.appendChild(header);

      // Список рецептов дня
      const list = document.createElement("div");
      list.className = "day-recipes";
      list.dataset.date = key;
      col.appendChild(list);

      // DnD drop zone
      col.addEventListener("dragover", (e) => {
        e.preventDefault();
        col.classList.add("drag-over");
      });
      col.addEventListener("dragleave", () =>
        col.classList.remove("drag-over"),
      );
      col.addEventListener("drop", (e) => {
        e.preventDefault();
        col.classList.remove("drag-over");
        handleDrop(e, key);
      });

      calendar.appendChild(col);
    }

    loadWeek();
  }

  function selectDay(key, colEl) {
    document
      .querySelectorAll(".calendar-day")
      .forEach((c) => c.classList.remove("selected"));
    colEl.classList.add("selected");
    selectedDay = key;
    renderDayIngredients(key);
  }

  /* Загрузка недели из API */
  async function loadWeek() {
    try {
      const res = await fetch(
        `/api/planner/${user.id}?weekStart=${dateKey(weekStart)}`,
      );
      if (!res.ok) throw new Error(res.status);
      const entries = await res.json();

      weekPlan = {};
      entries.forEach((e) => {
        if (!weekPlan[e.plannedDate]) weekPlan[e.plannedDate] = [];
        weekPlan[e.plannedDate].push(e);
      });
      renderAllDays();
    } catch (e) {
      console.error("loadWeek:", e);
    }
  }

  function renderAllDays() {
    document.querySelectorAll(".day-recipes").forEach((list) => {
      const key = list.dataset.date;
      list.innerHTML = "";
      (weekPlan[key] ?? []).forEach((entry) => appendEntryEl(list, entry, key));
    });
    if (selectedDay) renderDayIngredients(selectedDay);
  }

  function appendEntryEl(list, entry, dateKey) {
    const item = document.createElement("div");
    item.className = "plan-item";
    item.dataset.entryId = entry.id;

    item.innerHTML = `
      <span class="plan-title">${esc(entry.recipe?.title ?? "Рецепт")}</span>
      <div class="plan-controls" style="display:flex;align-items:center;gap:4px;margin-top:4px">
        <button class="btn small port-minus" type="button">−</button>
        <span class="portions-count">${entry.portions}</span>
        <button class="btn small port-plus"  type="button">+</button>
        <button class="btn small plan-del"   type="button" style="margin-left:4px">✕</button>
      </div>`;

    item
      .querySelector(".port-minus")
      .addEventListener("click", () =>
        changePortions(entry, item, -1, dateKey),
      );
    item
      .querySelector(".port-plus")
      .addEventListener("click", () =>
        changePortions(entry, item, +1, dateKey),
      );
    item
      .querySelector(".plan-del")
      .addEventListener("click", () => deleteEntry(entry.id, item, dateKey));

    list.appendChild(item);
  }

  async function changePortions(entry, itemEl, delta, key) {
    const next = Math.max(1, entry.portions + delta);
    try {
      const res = await fetch(`/api/planner/${entry.id}/portions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portions: next }),
      });
      if (!res.ok) throw new Error(res.status);
      entry.portions = next;
      itemEl.querySelector(".portions-count").textContent = next;
      if (selectedDay === key) renderDayIngredients(key);
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteEntry(entryId, itemEl, key) {
    try {
      await fetch(`/api/planner/${entryId}`, { method: "DELETE" });
      weekPlan[key] = (weekPlan[key] ?? []).filter((e) => e.id !== entryId);
      itemEl.remove();
      if (selectedDay === key) renderDayIngredients(key);
    } catch (e) {
      console.error(e);
    }
  }

  /* DnD: перетаскивание рецепта на день */
  function handleDrop(e, key) {
    const recipeId = Number(e.dataTransfer.getData("text/plain"));
    if (!recipeId) return;
    addRecipeToDay(recipeId, key);
  }

  async function addRecipeToDay(recipeId, key) {
    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          recipeId,
          plannedDate: key,
          portions: 1,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? res.status);
      const { id } = await res.json();

      const recipe = savedRecipes.find((r) => r.id === recipeId);
      const entry = { id, plannedDate: key, portions: 1, recipe };
      if (!weekPlan[key]) weekPlan[key] = [];
      weekPlan[key].push(entry);

      const list = document.querySelector(`.day-recipes[data-date="${key}"]`);
      if (list) appendEntryEl(list, entry, key);
      if (selectedDay === key) renderDayIngredients(key);
    } catch (e) {
      alert("Ошибка добавления: " + e.message);
    }
  }

  /* Список ингредиентов дня */
  function renderDayIngredients(key) {
    const container = document.getElementById("ingredientsList");
    if (!container) return;

    const entries = weekPlan[key] ?? [];
    if (!entries.length) {
      container.innerHTML = "<p style='color:#888'>Нет блюд на этот день.</p>";
      return;
    }

    // Агрегируем ингредиенты с учётом порций
    const map = {};
    entries.forEach((entry) => {
      const portions = entry.portions ?? 1;
      (entry.recipe?.ingredients ?? []).forEach((ing) => {
        const key = ing.name + "|" + ing.unit;
        if (!map[key]) map[key] = { name: ing.name, unit: ing.unit, qty: 0 };
        map[key].qty += ing.quantity * portions;
      });
    });

    const items = Object.values(map);
    if (!items.length) {
      container.innerHTML = "<p style='color:#888'>Ингредиенты не заданы.</p>";
      return;
    }

    container.innerHTML = `<ul style="padding-left:18px;margin:0">${items
      .map(
        (i) =>
          `<li><strong>${esc(i.name)}</strong> — ${fmt(i.qty, 1)} ${esc(i.unit)}</li>`,
      )
      .join("")}</ul>`;
  }

  /* Список сохранённых рецептов (левая колонка) */
  async function loadSavedRecipes() {
    const container = document.getElementById("savedList");
    if (!container) return;
    container.innerHTML = "<p style='color:#888'>Загрузка...</p>";
    try {
      const res = await fetch(`/api/saved/${user.id}`);
      if (!res.ok) throw new Error(res.status);
      savedRecipes = await res.json();

      container.innerHTML = "";
      if (!savedRecipes.length) {
        container.innerHTML =
          "<p style='color:#888'>Нет избранных рецептов.</p>";
        return;
      }

      savedRecipes.forEach((r) => {
        const item = document.createElement("div");
        item.className = "saved-item";
        item.draggable = true;
        item.style.cssText =
          "padding:6px;border:1px solid var(--border);border-radius:6px;margin-bottom:6px;cursor:grab;display:flex;justify-content:space-between;align-items:center";

        const title = document.createElement("span");
        title.textContent = r.title;

        const addBtn = document.createElement("button");
        addBtn.className = "btn small";
        addBtn.textContent = "+";
        addBtn.title = "Добавить в выбранный день";
        addBtn.addEventListener("click", () => {
          if (!selectedDay) return alert("Выберите день в календаре");
          addRecipeToDay(r.id, selectedDay);
        });

        item.addEventListener("dragstart", (e) =>
          e.dataTransfer.setData("text/plain", r.id),
        );
        item.appendChild(title);
        item.appendChild(addBtn);
        container.appendChild(item);
      });
    } catch (e) {
      container.innerHTML = `<p style='color:#c00'>Ошибка: ${esc(e.message)}</p>`;
    }
  }

  /* Контролы навигации по неделям */
  function bindControls() {
    document.getElementById("prevWeek")?.addEventListener("click", () => {
      weekStart.setDate(weekStart.getDate() - 7);
      renderCalendar();
    });
    document.getElementById("nextWeek")?.addEventListener("click", () => {
      weekStart.setDate(weekStart.getDate() + 7);
      renderCalendar();
    });
    document
      .getElementById("clearDayBtn")
      ?.addEventListener("click", async () => {
        if (!selectedDay) return alert("Выберите день");
        if (!confirm("Очистить день?")) return;
        const entries = weekPlan[selectedDay] ?? [];
        for (const e of entries)
          await fetch(`/api/planner/${e.id}`, { method: "DELETE" });
        weekPlan[selectedDay] = [];
        renderAllDays();
      });
    document.getElementById("clearAllSaved")?.addEventListener("click", () => {
      // Просто перезагружает список — кнопка оставлена для совместимости с HTML
    });

    // Настройки уведомлений планировщика
    document
      .getElementById("plannerEnabled")
      ?.addEventListener("change", saveNotifSettings);
    document
      .getElementById("plannerFreq")
      ?.addEventListener("change", saveNotifSettings);
  }

  async function saveNotifSettings() {
    const enabled = document.getElementById("plannerEnabled")?.checked ?? false;
    const freq = document.getElementById("plannerFreq")?.value ?? "daily";
    await fetch(`/api/profile/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plannerNotifEnabled: enabled,
        plannerNotifFreq: freq,
      }),
    }).catch(() => {});
  }
})();
