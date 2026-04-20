/* recipe.js — ChefBook
   Работает на статической /recipe.html?id=N
   и на Razor /Recipe/{id} (window.__RECIPE_ID__ задан сервером).
   Авторизация — window.chefbook.getUser() из localStorage.
*/
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
  function setText(sel, val) {
    const el = document.querySelector(sel);
    if (el) el.textContent = val;
  }

  const _qsId = Number(new URLSearchParams(window.location.search).get("id"));
  const recipeId = window.__RECIPE_ID__ ?? (_qsId || null);
  const currentUser = window.chefbook?.getUser?.() ?? null;
  const isLoggedIn = currentUser !== null;

  let portions = 1;
  let ingredientsData = [];

  /* DOM Ready */
  document.addEventListener("DOMContentLoaded", async () => {
    if (!recipeId) {
      setText(".recipe-title", "Рецепт не найден");
      return;
    }

    setupPortionCounter();

    const isRazor = !!window.__RECIPE_ID__;

    if (isRazor) {
      parseIngredientsFromDOM();
      setupFavorite();
      setupSubscription(window.__AUTHOR_ID__);
      setupComments();
      setupCarouselFromDOM();
      setupAuthorReviewsBtn();
    } else {
      await loadRecipe();
      setupComments();
    }
  });

  /* Счётчик порций */
  function setupPortionCounter() {
    const minus = document.getElementById("portionMinus");
    const plus = document.getElementById("portionPlus");
    const count = document.getElementById("portionCount");
    if (!minus || !plus || !count) return;
    minus.addEventListener("click", () => {
      if (portions > 1) {
        portions--;
        count.textContent = portions;
        renderIngredients();
      }
    });
    plus.addEventListener("click", () => {
      if (portions < 99) {
        portions++;
        count.textContent = portions;
        renderIngredients();
      }
    });
  }

  function parseIngredientsFromDOM() {
    ingredientsData = [];
    document.querySelectorAll("#ingredientsList li[data-qty]").forEach((li) => {
      ingredientsData.push({
        name: li.querySelector(".ing-name")?.textContent ?? "",
        quantity: parseFloat(li.dataset.qty) || 0,
        unit: li.dataset.unit ?? "",
      });
    });
  }

  function renderIngredients() {
    const list = document.getElementById("ingredientsList");
    if (!list || !ingredientsData.length) return;

    list.querySelectorAll("li[data-qty]").forEach((li, i) => {
      const qtyEl = li.querySelector(".ing-qty");
      if (qtyEl) {
        const newQty = (ingredientsData[i].quantity * portions)
          .toFixed(2)
          .replace(/\.00$/, "");
        qtyEl.textContent = newQty;
      }
    });
  }

  /* Загрузка рецепта (статическая страница) */
  async function loadRecipe() {
    try {
      const res = await fetch(`/api/recipes/${recipeId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      renderRecipe(await res.json());
    } catch (err) {
      console.error(err);
      setText(".recipe-title", "Ошибка загрузки рецепта");
    }
  }

  function renderRecipe(r) {
    document.title = `ChefBook — ${r.title}`;
    setText(".recipe-title", r.title);
    setText(".recipe-desc", r.description ?? "");

    const timeEl = document.querySelector(".recipe-meta time");
    if (timeEl) {
      timeEl.setAttribute("datetime", `PT${r.cookingTimeMinutes}M`);
      timeEl.textContent = `Время: ${r.cookingTimeMinutes} мин`;
    }

    if (r.author) {
      setText(".author-name", r.author.name ?? "");
      setText(".author-bio", r.author.bio ?? "");
      const avatar = document.querySelector(".avatar-img");
      if (avatar) {
        avatar.src = r.author.avatarUrl ?? "/images/avatar.jpg";
        avatar.alt = r.author.name ?? "";
      }
      setupSubscription(r.author.id);
      const reviewsBtn = document.getElementById("authorReviewsBtn");
      if (reviewsBtn)
        reviewsBtn.addEventListener("click", () => {
          window.location.href = `/reviews.html?id=${r.author.id}`;
        });
    }

    ingredientsData = r.ingredients ?? [];
    const panel = document.querySelector(
      ".ingredients-panel ul, #ingredientsList",
    );
    if (panel && ingredientsData.length) {
      panel.innerHTML = ingredientsData
        .map(
          (i) =>
            `<li data-qty="${i.quantity}" data-unit="${esc(i.unit)}">
           <span class="ing-name">${esc(i.name)}</span> — 
           <span class="ing-qty">${i.quantity}</span> 
           <span class="ing-unit">${esc(i.unit)}</span>
         </li>`,
        )
        .join("");
      // После рендеринга ингредиентов — парсим их в ingredientsData для счётчика порций
      parseIngredientsFromDOM();
      renderIngredients();
    }

    const stepsContainer = document.querySelector(".steps");
    if (stepsContainer && r.steps?.length) {
      const h2 = stepsContainer.querySelector("h2");
      stepsContainer.innerHTML = "";
      if (h2) stepsContainer.appendChild(h2);
      r.steps.forEach((s) => {
        const div = document.createElement("div");
        div.className = "step";
        if (s.photoUrl)
          div.innerHTML = `<img src="${esc(s.photoUrl)}" alt="Шаг ${s.stepNumber}">`;
        const p = document.createElement("p");
        p.innerHTML = `<strong>Шаг ${s.stepNumber}.</strong> ${esc(s.instruction)}`;
        div.appendChild(p);
        stepsContainer.appendChild(div);
      });
    }

    setupCarouselDynamic(r.photos ?? []);
    setupFavorite();
  }

  /* Карусель */
  function setupCarouselFromDOM() {
    const urls = Array.from(
      document.querySelectorAll(".carousel-thumbs img"),
    ).map((t) => t.dataset.src || t.src);
    setupCarouselCore(urls);
  }

  function setupCarouselDynamic(photos) {
    const urls = photos.map((p) => p.photoUrl ?? p.PhotoUrl).filter(Boolean);
    const thumbsDiv = document.querySelector(".carousel-thumbs");
    const mainImg = document.getElementById("carouselImage");
    if (thumbsDiv && mainImg && urls.length) {
      thumbsDiv.innerHTML = urls
        .map(
          (u, i) =>
            `<img src="${esc(u)}" data-src="${esc(u)}" alt="Фото ${i + 1}" role="listitem" ${i === 0 ? 'aria-current="true"' : ""}>`,
        )
        .join("");
    }
    setupCarouselCore(urls);
  }

  function setupCarouselCore(urls) {
    const mainImg = document.getElementById("carouselImage");
    const prev = document.getElementById("carouselPrev");
    const next = document.getElementById("carouselNext");
    if (!mainImg || !urls.length) return;
    let idx = 0;
    function show(i) {
      idx = (i + urls.length) % urls.length;
      mainImg.src = urls[idx];
      document
        .querySelectorAll(".carousel-thumbs img")
        .forEach((t, j) => t.setAttribute("aria-current", String(j === idx)));
    }
    prev?.addEventListener("click", () => show(idx - 1));
    next?.addEventListener("click", () => show(idx + 1));
    document
      .querySelectorAll(".carousel-thumbs img")
      .forEach((t, i) => t.addEventListener("click", () => show(i)));
    show(0);
  }

  /* Избранное
     Не авторизован → кнопка скрыта.
     Авторизован    → сердечко рядом с заголовком, проверяем статус.
 */
  function setupFavorite() {
    if (!isLoggedIn) return; // скрываем для неавторизованных

    const heartBtn = document.createElement("button");
    heartBtn.id = "heartBtn";
    heartBtn.type = "button";
    heartBtn.innerHTML = "🤍";
    heartBtn.style.cssText =
      "font-size:24px;border:none;background:transparent;cursor:pointer;margin-left:8px;vertical-align:middle;";
    heartBtn.setAttribute("aria-label", "Добавить в избранное");
    document.querySelector(".recipe-title")?.appendChild(heartBtn);

    function setState(fav) {
      heartBtn.innerHTML = fav ? "❤️" : "🤍";
      heartBtn.setAttribute("aria-pressed", String(fav));
      heartBtn.setAttribute(
        "aria-label",
        fav ? "Убрать из избранного" : "Добавить в избранное",
      );
    }

    fetch(`/api/favorites/check/${recipeId}?userId=${currentUser.id}`)
      .then((r) => r.json())
      .then((d) => setState(d.isFavorite))
      .catch(() => {});

    heartBtn.addEventListener("click", async () => {
      heartBtn.disabled = true;
      try {
        const res = await fetch(`/api/favorites/toggle/${recipeId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id }),
        });
        setState((await res.json()).isFavorite);
      } catch (e) {
        console.error(e);
      } finally {
        heartBtn.disabled = false;
      }
    });
  }

  /* Подписка на автора
     Не авторизован        → кнопка скрыта.
     Автор = текущий юзер  → кнопка скрыта.
     Авторизован + чужой   → кнопка активна.
 */
  function setupSubscription(authorId) {
    const btn = document.getElementById("authorFollowBtn");
    if (!btn) return;

    // Скрываем если не авторизован
    if (!isLoggedIn) {
      btn.style.display = "none";
      return;
    }

    // Скрываем если это рецепт самого пользователя
    if (currentUser.id === Number(authorId)) {
      btn.style.display = "none";
      return;
    }

    function setState(sub) {
      btn.textContent = sub ? "Отписаться" : "Подписаться";
      btn.setAttribute("aria-pressed", String(sub));
    }

    fetch(`/api/subscriptions/check/${authorId}?userId=${currentUser.id}`)
      .then((r) => r.json())
      .then((d) => setState(d.isSubscribed))
      .catch(() => {});

    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        const res = await fetch(`/api/subscriptions/toggle/${authorId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id }),
        });
        setState((await res.json()).isSubscribed);
      } catch (e) {
        console.error(e);
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* Кнопка отзывов автора */
  function setupAuthorReviewsBtn() {
    const btn = document.getElementById("authorReviewsBtn");
    if (!btn) return;
    const authorId = btn.dataset.authorId;
    btn.addEventListener("click", () => {
      window.location.href = `/reviews.html?id=${authorId}`;
    });
  }

  /* Комментарии
     Не авторизован → кнопка disabled + подсказка под формой.
     Авторизован    → кнопка активна.
*/
  function setupComments() {
    const list = document.getElementById("commentList");
    const box = document.getElementById("commentBox");
    const postBtn = document.getElementById("postCommentBtn");
    if (!list) return;

    // Показываем все комментарии всегда
    fetch(`/api/comments/${recipeId}`)
      .then((r) => r.json())
      .then((comments) => {
        list.innerHTML = "";
        if (!comments.length)
          list.innerHTML = "<p style='color:#888'>Пока нет комментариев</p>";
        else comments.forEach((c) => renderComment(c));
      })
      .catch(() => {});

    if (!postBtn) return;

    if (!isLoggedIn) {
      // Блокируем кнопку и показываем подсказку
      postBtn.disabled = true;
      postBtn.title = "Войдите в аккаунт, чтобы оставить комментарий";
      const hint = document.createElement("p");
      hint.style.cssText = "color:#888;font-size:13px;margin-top:6px;";
      hint.textContent = "Войдите в аккаунт, чтобы оставить комментарий.";
      postBtn.closest("div")?.after(hint);
      return;
    }

    postBtn.addEventListener("click", async () => {
      const text = box?.value.trim() ?? "";
      if (!text) return alert("Введите комментарий");
      postBtn.disabled = true;
      postBtn.textContent = "Отправка...";
      try {
        const res = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id, recipeId, text }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? res.status);
        const c = await res.json();
        if (list.querySelector("p[style]")) list.innerHTML = "";
        renderComment(c, true);
        box.value = "";
      } catch (e) {
        alert(e.message || "Ошибка");
      } finally {
        postBtn.disabled = false;
        postBtn.textContent = "Оставить комментарий";
      }
    });
  }

  function renderComment(c, prepend = false) {
    const p = document.createElement("p");
    p.innerHTML = `<strong>${esc(c.authorName)}:</strong> ${esc(c.text)}<br>
                   <small style="color:#888">${esc(c.createdAt)}</small>`;
    const list = document.getElementById("commentList");
    prepend ? list.prepend(p) : list.appendChild(p);
  }

  /* Модальное окно «Состав» (для карточек на других страницах) */
  window.openIngredientsModal = async function (id) {
    try {
      const res = await fetch(`/api/recipes/${id}/ingredients`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      showModal(d.recipeTitle, d.ingredients);
    } catch (e) {
      alert("Ошибка: " + e.message);
    }
  };

  function showModal(title, ingredients) {
    document.getElementById("ingredientsModal")?.remove();
    const overlay = document.createElement("div");
    overlay.id = "ingredientsModal";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:1000;";
    const rows = ingredients.length
      ? ingredients
          .map(
            (i) =>
              `<li><strong>${esc(i.name)}</strong> — ${esc(String(i.quantity))} ${esc(i.unit)}</li>`,
          )
          .join("")
      : "<li>Ингредиенты не указаны</li>";
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:12px;padding:24px;max-width:480px;width:90%;max-height:80vh;overflow-y:auto;position:relative;">
        <button id="modalClose" type="button" style="position:absolute;top:12px;right:12px;background:none;border:none;font-size:20px;cursor:pointer;">✕</button>
        <h2>${esc(title)}</h2>
        <ul style="padding-left:20px;margin-top:8px;">${rows}</ul>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector("#modalClose").addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", function onKey(e) {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", onKey);
      }
    });
  }
})();
