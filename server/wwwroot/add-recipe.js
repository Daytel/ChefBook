const STORAGE_KEY_RECIPE = "chefbook_new_recipe_v1";

// Элементы
const ingredientsList = document.getElementById("ingredientsList");
const addIngredientBtn = document.getElementById("addIngredientBtn");
const categoriesBox = document.getElementById("categoriesBox");
const stepsBox = document.getElementById("stepsBox");
const addStepBtn = document.getElementById("addStepBtn");
const dishPhotos = document.getElementById("dishPhotos");
const photosPreview = document.getElementById("photosPreview");

const saveRecipe = document.getElementById("saveRecipe");
const clearRecipe = document.getElementById("clearRecipe");

const form = document.getElementById("recipeForm");

// Категории
const categories = [
  "Завтраки",
  "Супы",
  "Салаты",
  "Выпечка",
  "Десерты",
  "Вегетарианские",
  "Мясные",
  "Напитки",
  "Паста",
  "Рыба",
  "Постные",
  "Быстро",
  "Детское",
  "На мангале",
  "Сезонные",
  "Праздничные",
];

// Состояния
let photos = []; // {id, dataUrl, isMain}
let ingredientIdCounter = 0;
let stepIdCounter = 0;

let isEditModeLoading = false;

// Защита от undefined
if (!saveRecipe) {
  console.error("Кнопка сохранения #saveRecipe не найдена!");
}

// Вспомогательные селекторы ошибок
function setFieldError(name, msg) {
  const el = document.querySelector(`.field-error[data-for="${name}"]`);
  if (el) el.textContent = msg || "";
}

// Хелпер создания элементов
function el(tag, props = {}, ...children) {
  const e = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k === "text") e.textContent = v;
    else e.setAttribute(k, v);
  });
  children.forEach((c) => {
    if (typeof c === "string") e.appendChild(document.createTextNode(c));
    else if (c) e.appendChild(c);
  });
  return e;
}

// Рендер категорий + слушатели
function renderCategories(selected = []) {
  categoriesBox.innerHTML = "";
  categories.forEach((c, i) => {
    const id = "cat_" + i;
    const label = el("label", {
      style: "display:flex; align-items:center; gap:8px; padding:4px 0;",
      for: id,
    });
    const cb = el("input", { type: "checkbox", value: c, id });
    if (selected.includes(c)) cb.checked = true;
    cb.addEventListener("change", () => {
      validateForm();
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(c));
    categoriesBox.appendChild(label);
  });
}

// Создаём ряд ингредиента с валидацией
function addIngredientRow(name = "", qty = "", unit = "") {
  ingredientIdCounter++;
  const id = "ing_" + ingredientIdCounter;
  const row = el("div", { class: "ingredient-row", id });

  // Поля
  const nameInput = el("input", {
    class: "input ing-name",
    placeholder: "Ингредиент (напр., Мука)",
    value: name,
    "aria-label": "Ингредиент",
    maxlength: 100,
  });
  const qtyInput = el("input", {
    class: "input ing-qty",
    placeholder: "Кол-во (на 1 порцию)",
    value: qty,
    type: "text",
    inputmode: "decimal",
    "aria-label": "Количество ингредиента",
    maxlength: 20,
  });
  const unitInput = el("input", {
    class: "input ing-unit",
    placeholder: "Ед. изм. (напр., г, шт)",
    value: unit,
    type: "text",
    "aria-label": "Единицы измерения",
    maxlength: 20,
  });

  // кнопка удалить (в колонке действий)
  const remBtnWrapper = el("div", { class: "ing-actions" });
  const remBtn = el(
    "button",
    {
      class: "btn small remove-ing",
      type: "button",
      title: "Удалить ингредиент",
      "aria-label": "Удалить ингредиент",
    },
    "✕",
  );
  remBtnWrapper.appendChild(remBtn);

  // подсказки для строки — ОБЯЗАТЕЛЬНО класс row-hint
  const rowHint = el(
    "div",
    { class: "row-hint field-hint", id: id + "_hint" },
    "Название до 100 символов. Кол-во — число или дробь (например 1.5). Мера до 20 символов.",
  );

  // строка ошибки
  const rowError = el("div", {
    class: "row-error",
    role: "status",
    "aria-live": "polite",
  });

  // связать aria-describedby
  nameInput.setAttribute("aria-describedby", id + "_hint");
  qtyInput.setAttribute("aria-describedby", id + "_hint");
  unitInput.setAttribute("aria-describedby", id + "_hint");

  remBtn.addEventListener("click", () => {
    // запрет удаления последнего ингредиента
    const rows = ingredientsList.querySelectorAll(".ingredient-row");
    if (rows.length <= 1) {
      rowError.textContent = "Нельзя удалить последний ингредиент";
      setTimeout(() => (rowError.textContent = ""), 2200);
      return;
    }
    row.remove();
    validateForm();
  });

  // Валидация при вводе
  [nameInput, qtyInput, unitInput].forEach((inp) => {
    inp.addEventListener("input", () => {
      validateForm();
    });
  });

  row.appendChild(nameInput);
  row.appendChild(qtyInput);
  row.appendChild(unitInput);
  row.appendChild(remBtnWrapper);
  row.appendChild(rowHint);
  row.appendChild(rowError);

  ingredientsList.appendChild(row);
  return row;
}

// Добавление шага приготовления
function addStep(text = "", imgData = null) {
  stepIdCounter++;
  const id = "step_" + stepIdCounter;
  const row = el("div", { class: "step-row", id });
  const txt = el(
    "textarea",
    {
      class: "input step-text",
      rows: 3,
      placeholder: "Описание шага (что делать, время, температуру)",
      maxlength: 500,
      "aria-describedby": id + "_hint",
    },
    text,
  );
  const stepHint = el(
    "div",
    { class: "field-hint", id: id + "_hint" },
    "Текст шага — до 500 символов. Рекомендуется: что делать и сколько времени.",
  );
  const imgLabel = el(
    "label",
    { class: "btn", style: "margin-top:6px; display:inline-block;" },
    "Загрузить фото шага",
  );
  const imgInput = el("input", {
    type: "file",
    accept: "image/*",
    class: "visually-hidden step-photo",
  });
  const remBtn = el(
    "button",
    {
      class: "btn small remove-step",
      type: "button",
      title: "Удалить шаг",
    },
    "Удалить",
  );

  const rowError = el("div", {
    class: "row-error",
    role: "status",
    "aria-live": "polite",
  });

  imgLabel.addEventListener("click", () => imgInput.click());
  imgInput.addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target.result;
      // Добавление фото шага
      let preview = row.querySelector(".step-photo-preview");
      if (!preview) {
        preview = el("div", { class: "step-photo-preview" });
        row.insertBefore(preview, remBtn);
      }
      preview.style.backgroundImage = `url(${url})`;
      preview.dataset.url = url;
      validateForm();
    };
    reader.readAsDataURL(f);
  });

  remBtn.addEventListener("click", () => {
    const rows = stepsBox.querySelectorAll(".step-row");
    if (rows.length <= 1) {
      rowError.textContent = "Нельзя удалить последний шаг";
      setTimeout(() => (rowError.textContent = ""), 2200);
      return;
    }
    row.remove();
    validateForm();
  });

  txt.addEventListener("input", () => {
    validateForm();
  });

  row.appendChild(txt);
  row.appendChild(stepHint);
  row.appendChild(imgLabel);
  row.appendChild(imgInput);
  row.appendChild(remBtn);
  row.appendChild(rowError);
  stepsBox.appendChild(row);

  // если есть imgData, показать превью
  if (imgData) {
    let preview = el("div", { class: "step-photo-preview" });
    preview.style.backgroundImage = `url(${imgData})`;
    preview.dataset.url = imgData;
    row.insertBefore(preview, remBtn);
  }

  return row;
}

// Обработка фотографий (карусель)
function renderPhotos() {
  photosPreview.innerHTML = "";
  photos.forEach((p, idx) => {
    const thumb = el("div", {
      class: "photo-thumb",
      role: "button",
      tabindex: 0,
    });
    thumb.style.backgroundImage = `url(${p.dataUrl})`;
    if (p.isMain) thumb.classList.add("main");
    const rm = el(
      "button",
      {
        class: "btn small remove-photo",
        title: "Удалить фото",
        type: "button",
      },
      "✕",
    );
    rm.addEventListener("click", (e) => {
      e.stopPropagation();
      photos.splice(idx, 1);
      // если удалили главный — оставляем первый как главный
      if (!photos.some((x) => x.isMain) && photos.length > 0)
        photos[0].isMain = true;
      renderPhotos();
      validateForm();
    });
    thumb.addEventListener("click", () => {
      photos.forEach((x) => (x.isMain = false));
      p.isMain = true;
      renderPhotos();
      validateForm();
    });
    thumb.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        thumb.click();
      }
    });
    thumb.appendChild(rm);
    photosPreview.appendChild(thumb);
  });
}

dishPhotos.addEventListener("change", (e) => {
  const files = Array.from(e.target.files || []);
  files.forEach((f) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      photos.push({
        id: Date.now() + Math.random(),
        dataUrl: ev.target.result,
        isMain: photos.length === 0,
      });
      renderPhotos();
      validateForm();
    };
    reader.readAsDataURL(f);
  });
  // reset
  dishPhotos.value = "";
});

// Сбор данных (с учётом фотографий)
function collectRecipe() {
  const title = document.getElementById("title").value.trim();
  const desc = document.getElementById("shortDesc").value.trim();
  const ingredients = Array.from(document.querySelectorAll(".ingredient-row"))
    .map((row) => {
      return {
        name: row.querySelector(".ing-name").value.trim(),
        qty: row.querySelector(".ing-qty").value.trim(),
        unit: row.querySelector(".ing-unit").value.trim(),
      };
    })
    .filter((i) => i.name && i.qty && i.unit);
  const categoriesSelected = Array.from(
    categoriesBox.querySelectorAll('input[type="checkbox"]:checked'),
  ).map((cb) => cb.value);
  const steps = Array.from(document.querySelectorAll(".step-row"))
    .map((row) => {
      return {
        text: row.querySelector(".step-text").value.trim(),
        img:
          (row.querySelector(".step-photo-preview") &&
            row.querySelector(".step-photo-preview").dataset.url) ||
          null,
      };
    })
    .filter((s) => s.text);
  const photosList = photos.map((p) => ({
    dataUrl: p.dataUrl,
    isMain: p.isMain,
  }));

  const cookingTime = parseInt(
    document.getElementById("cookingTime")?.value.trim() ?? "0",
    10,
  );

  return {
    title,
    desc,
    cookingTime,
    ingredients,
    categoriesSelected,
    steps,
    photosList,
    createdAt: new Date().toISOString(),
  };
}

// Валидация формы — ключевая функция
function validateForm() {
  // Пропускаем валидацию пока загружаются данные в режиме редактирования
  if (isEditModeLoading) {
    saveRecipe.disabled = false;
    return true;
  }

  let hasErrors = false;

  // Название: обязательно, max 30
  const titleEl = document.getElementById("title");
  const title = titleEl.value.trim();
  if (!title) {
    setFieldError("title", "Название обязательно");
    hasErrors = true;
  } else if (title.length > 30) {
    setFieldError("title", "Максимум 30 символов");
    hasErrors = true;
  } else {
    setFieldError("title", "");
  }

  // Описание: опционально, max 300
  const shortDescEl = document.getElementById("shortDesc");
  const sd = shortDescEl.value.trim();
  if (sd.length > 300) {
    setFieldError("shortDesc", "Максимум 300 символов");
    hasErrors = true;
  } else {
    setFieldError("shortDesc", "");
  }

  // Время приготовления: обязательное поле
  const ctVal = document.getElementById("cookingTime")?.value.trim() ?? "";
  const ctNum = parseInt(ctVal, 10);
  if (!ctVal || isNaN(ctNum) || ctNum < 1) {
    setFieldError("cookingTime", "Укажите время приготовления (минимум 1 мин)");
    hasErrors = true;
  } else if (ctNum > 1440) {
    setFieldError("cookingTime", "Максимум 1440 минут (24 часа)");
    hasErrors = true;
  } else {
    setFieldError("cookingTime", "");
  }

  setFieldError("photos", "");

  // Ингредиенты: каждый ряд — все три поля обязательны
  setFieldError("ingredients", "");
  document.querySelectorAll(".ingredient-row").forEach((row) => {
    const name = row.querySelector(".ing-name").value.trim();
    const qty = row.querySelector(".ing-qty").value.trim();
    const unit = row.querySelector(".ing-unit").value.trim();
    const rowError = row.querySelector(".row-error");
    if (!name || !qty || !unit) {
      rowError.textContent = "Заполните все поля ингредиента";
      hasErrors = true;
    } else {
      rowError.textContent = "";
    }
  });

  // Проверяем, есть ли хотя бы один полный ингредиент
  const completeIngredients = Array.from(
    document.querySelectorAll(".ingredient-row"),
  )
    .map((row) => {
      const name = row.querySelector(".ing-name").value.trim();
      const qty = row.querySelector(".ing-qty").value.trim();
      const unit = row.querySelector(".ing-unit").value.trim();
      return name && qty && unit;
    })
    .filter(Boolean);
  if (completeIngredients.length === 0) {
    setFieldError("ingredients", "Укажите минимум один полный ингредиент");
    hasErrors = true;
  } else {
    // если есть другие неполные — уже пометили их
    if (
      !document.querySelectorAll(".ingredient-row .row-error:not(:empty)")
        .length
    ) {
      setFieldError("ingredients", "");
    }
  }

  // Categories: минимум 1
  const cats = Array.from(
    categoriesBox.querySelectorAll('input[type="checkbox"]:checked'),
  );
  if (cats.length === 0) {
    setFieldError("categories", "Выберите минимум одну категорию");
    hasErrors = true;
  } else {
    setFieldError("categories", "");
  }

  // Steps: каждый шаг обязателен по тексту, max 500
  let stepsHaveError = false;
  document.querySelectorAll(".step-row").forEach((row) => {
    const txt = row.querySelector(".step-text").value.trim();
    const rowError = row.querySelector(".row-error");
    if (!txt) {
      rowError.textContent = "Описание шага обязательно";
      stepsHaveError = true;
    } else if (txt.length > 500) {
      rowError.textContent = "Максимум 500 символов в шаге";
      stepsHaveError = true;
    } else {
      rowError.textContent = "";
    }
  });
  if (stepsHaveError) {
    setFieldError("steps", "Исправьте ошибки в шагах");
    hasErrors = true;
  } else {
    const stepsCount = document.querySelectorAll(".step-row").length;
    if (stepsCount === 0) {
      setFieldError("steps", "Добавьте минимум один шаг приготовления");
      hasErrors = true;
    } else {
      setFieldError("steps", "");
    }
  }

  // Включаем / отключаем кнопку сохранить
  saveRecipe.disabled = hasErrors;

  return !hasErrors;
}

// Сохраняем рецепт через API
saveRecipe.addEventListener("click", async () => {
  const ok = validateForm();
  if (!ok) {
    const firstErr = document.querySelector(
      ".field-error:not(:empty), .row-error:not(:empty)",
    );
    if (firstErr) {
      const input = firstErr
        .closest(".field, .ingredient-row, .step-row")
        ?.querySelector("input, textarea");
      if (input) input.focus();
    }
    return;
  }

  // Проверяем авторизацию
  const currentUser = window.chefbook?.getUser?.() ?? null;
  if (!currentUser) {
    alert("Войдите в аккаунт, чтобы добавить рецепт");
    window.location.href = "/auth.html";
    return;
  }

  const recipe = collectRecipe();
  saveRecipe.disabled = true;
  saveRecipe.textContent = "Сохранение...";

  const editId = saveRecipe.dataset.editId ?? null;
  const apiUrl = editId ? `/api/recipes/${editId}` : "/api/recipes";
  const apiMethod = editId ? "PUT" : "POST";

  try {
    const res = await fetch(apiUrl, {
      method: apiMethod,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        title: recipe.title,
        description: recipe.desc,
        cookingTimeMinutes: recipe.cookingTime,
        categories: recipe.categoriesSelected,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        photos: recipe.photosList,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "HTTP " + res.status);
    }

    const created = await res.json();
    alert("Рецепт успешно сохранён!");
    window.location.href = "/recipe.html?id=" + created.id;
  } catch (err) {
    console.error(err);
    alert("Ошибка при сохранении: " + err.message);
    saveRecipe.disabled = false;
    saveRecipe.textContent = "Сохранить рецепт";
  }
});

clearRecipe.addEventListener("click", () => {
  if (!confirm("Очистить форму?")) return;
  form.reset();
  ingredientsList.innerHTML = "";
  stepsBox.innerHTML = "";
  photos = [];
  renderPhotos();
  renderCategories([]);
  renderInitial();
  validateForm();
});

// Инициализируем хелперы
function renderInitial() {
  // По умолчанию 1 пустой ингдедиент и 1 пустой шаг приготовления
  addIngredientRow();
  addStep();
  validateForm();
}

// События
addIngredientBtn.addEventListener("click", () => {
  addIngredientRow();
  validateForm();
});
addStepBtn.addEventListener("click", () => {
  addStep();
  validateForm();
});
document.getElementById("title").addEventListener("input", validateForm);
document.getElementById("shortDesc").addEventListener("input", validateForm);
document.getElementById("cookingTime")?.addEventListener("input", validateForm);

// Навигация
document.querySelectorAll("button[data-href]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const href = btn.dataset.href;
    if (href) window.location.href = href;
  });
});

// boot
renderCategories([]);
renderInitial();
renderPhotos();

// Пример: отслеживаем изменения внутри списков динамически (делегирование)
ingredientsList.addEventListener("input", () => validateForm());
stepsBox.addEventListener("input", () => validateForm());

/* Режим редактирования (?edit=id) 
   Выполняется ПОСЛЕ boot. Заменяет пустые поля данными рецепта.
*/
(async function loadEditMode() {
  const editId = new URLSearchParams(window.location.search).get("edit");
  if (!editId) return;

  const currentUser = window.chefbook?.getUser?.() ?? null;
  if (!currentUser) {
    alert("Войдите в аккаунт для редактирования рецепта");
    window.location.href = "/auth.html";
    return;
  }

  try {
    console.log(`Загружаем рецепт для редактирования: ID = ${editId}`);

    isEditModeLoading = true;

    const res = await fetch(
      `/api/recipes/${editId}/edit?userId=${currentUser.id}`,
    );
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }

    const data = await res.json();

    // Основные поля
    const titleEl = document.getElementById("title");
    const descEl = document.getElementById("shortDesc");
    const timeEl = document.getElementById("cookingTime");

    if (titleEl) titleEl.value = data.title ?? "";
    if (descEl) descEl.value = data.description ?? "";
    if (timeEl) timeEl.value = data.cookingTimeMinutes ?? "";

    // Заголовок страницы
    const pageTitle = document.querySelector("h1");
    if (pageTitle) pageTitle.textContent = "Редактировать рецепт";

    // Категории
    renderCategories(data.categories ?? []);

    // Ингредиенты — очищаем старые строки от renderInitial()
    ingredientsList.innerHTML = "";
    if (data.ingredients && data.ingredients.length > 0) {
      data.ingredients.forEach((i) => {
        addIngredientRow(i.name, i.qty, i.unit);
      });
    } else {
      addIngredientRow();
    }

    // Шаги
    stepsBox.innerHTML = "";
    if (data.steps && data.steps.length > 0) {
      data.steps.forEach((s) => {
        addStep(s.text, s.img);
      });
    } else {
      addStep();
    }

    // Фото
    photos = (data.photos || []).map((p, idx) => ({
      id: Date.now() + idx,
      dataUrl: p.dataUrl,
      isMain: p.isMain,
    }));
    renderPhotos();

    // Помечаем кнопку как редактирование
    if (saveRecipe) {
      saveRecipe.dataset.editId = editId;
      saveRecipe.textContent = "Сохранить изменения";
    }

    // Важно: даём браузеру время обновить DOM, потом запускаем валидацию
    setTimeout(() => {
      isEditModeLoading = false;
      validateForm();
      console.log("✅ Рецепт успешно загружен в режим редактирования");
    }, 150);
  } catch (err) {
    isEditModeLoading = false;
    console.error("Ошибка загрузки рецепта для редактирования:", err);
    alert("Не удалось загрузить рецепт для редактирования:\n" + err.message);
  }
})();
