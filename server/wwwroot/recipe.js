(function () {
  "use strict";

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&","&amp;").replaceAll("<","&lt;")
      .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  }
  function setText(selector, text) {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  }
  function getRecipeId() {
    const p = new URLSearchParams(window.location.search).get("id");
    return p ? Number(p) : null;
  }

  const recipeId = getRecipeId();
  let portions = 1;
  let ingredientsData = [];

  function formatQty(qty, p) {
    return parseFloat((qty * p).toFixed(2)).toString();
  }

  function renderIngredients() {
    const ingList = document.querySelector(".ingredients-panel ul");
    if (!ingList) return;
    ingList.innerHTML = ingredientsData.length
      ? ingredientsData.map(i =>
          `<li>${esc(i.name)} — <span class="ing-qty">${formatQty(i.quantity, portions)}</span> ${esc(i.unit)}</li>`
        ).join("")
      : "<li>Ингредиенты не указаны</li>";
  }

  /* Счётчик порций — кнопки уже в HTML, просто вешаем обработчики */
  function setupPortionCounter() {
    const minusBtn  = document.getElementById("portionMinus");
    const plusBtn   = document.getElementById("portionPlus");
    const countSpan = document.getElementById("portionCount");
    if (!minusBtn || !plusBtn || !countSpan) return;

    function update(delta) {
      const next = portions + delta;
      if (next < 1 || next > 99) return;
      portions = next;
      countSpan.textContent = portions;
      renderIngredients();
    }

    minusBtn.addEventListener("click", () => update(-1));
    plusBtn.addEventListener("click",  () => update(+1));
  }

  /* ── DOM Ready ────────────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("button[data-href]").forEach(btn => {
      btn.addEventListener("click", () => { window.location.href = btn.dataset.href; });
    });

    if (!recipeId) { setText(".recipe-title", "Рецепт не найден"); return; }

    setupPortionCounter();
    loadRecipe();
    setupComments();
  });

  /* ══ Загрузка рецепта ════════════════════════════════════════ */
  async function loadRecipe() {
    try {
      const res = await fetch(`/api/recipes/${recipeId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      renderRecipe(await res.json());
    } catch (err) {
      console.error("Ошибка загрузки рецепта:", err);
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
      setText(".author-bio",  r.author.bio  ?? "");
      const avatar = document.querySelector(".avatar-img");
      if (avatar) { avatar.src = r.author.avatarUrl ?? "/images/avatar.jpg"; avatar.alt = r.author.name ?? ""; }

      document.getElementById("authorReviewsBtn")
        ?.addEventListener("click", () => { window.location.href = `/reviews.html?id=${r.author.id}`; });

      setupSubscription(r.author.id);
    }

    ingredientsData = r.ingredients ?? [];
    renderIngredients();

    const stepsContainer = document.querySelector(".steps");
    if (stepsContainer) {
      const h2 = stepsContainer.querySelector("h2");
      stepsContainer.innerHTML = "";
      if (h2) stepsContainer.appendChild(h2);
      (r.steps ?? []).forEach(s => {
        const div = document.createElement("div");
        div.className = "step";
        if (s.photoUrl) div.innerHTML = `<img src="${esc(s.photoUrl)}" alt="Шаг ${s.stepNumber}">`;
        const p = document.createElement("p");
        p.innerHTML = `<strong>Шаг ${s.stepNumber}.</strong> ${esc(s.instruction)}`;
        div.appendChild(p);
        stepsContainer.appendChild(div);
      });
    }

    setupCarousel(r.photos ?? []);
    setupFavorite();
  }

  /* ══ Карусель ════════════════════════════════════════════════ */
  function setupCarousel(photos) {
    const mainImg   = document.getElementById("carouselImage");
    const thumbsDiv = document.querySelector(".carousel-thumbs");
    const prevBtn   = document.getElementById("carouselPrev");
    const nextBtn   = document.getElementById("carouselNext");
    if (!mainImg || !thumbsDiv || !photos.length) return;

    const urls = photos.map(p => p.photoUrl);
    let idx = 0;

    thumbsDiv.innerHTML = "";
    urls.forEach((url, i) => {
      const img = document.createElement("img");
      img.src = url; img.alt = `Фото ${i+1}`; img.setAttribute("role","listitem");
      if (i === 0) img.setAttribute("aria-current","true");
      img.addEventListener("click", () => show(i));
      thumbsDiv.appendChild(img);
    });

    function show(i) {
      idx = (i + urls.length) % urls.length;
      mainImg.src = urls[idx]; mainImg.alt = `Фото ${idx+1}`;
      thumbsDiv.querySelectorAll("img").forEach((t,j) =>
        t.setAttribute("aria-current", String(j === idx)));
    }
    prevBtn?.addEventListener("click", () => show(idx - 1));
    nextBtn?.addEventListener("click", () => show(idx + 1));
    show(0);
  }

  /* ══ Избранное ═══════════════════════════════════════════════ */
  function setupFavorite() {
    const heartBtn = document.createElement("button");
    heartBtn.id = "heartBtn"; heartBtn.type = "button"; heartBtn.innerHTML = "🤍";
    heartBtn.style.cssText = "font-size:24px;border:none;background:transparent;cursor:pointer;margin-left:8px;vertical-align:middle;";
    document.querySelector(".recipe-title")?.appendChild(heartBtn);

    function setState(fav) {
      heartBtn.innerHTML = fav ? "❤️" : "🤍";
      heartBtn.setAttribute("aria-pressed", String(fav));
    }
    fetch(`/api/favorites/check/${recipeId}`).then(r=>r.json()).then(d=>setState(d.isFavorite)).catch(()=>{});
    heartBtn.addEventListener("click", async () => {
      heartBtn.disabled = true;
      try { setState((await(await fetch(`/api/favorites/toggle/${recipeId}`,{method:"POST"})).json()).isFavorite); }
      catch(e){console.error(e);} finally{heartBtn.disabled=false;}
    });
  }

  /* ══ Подписка ════════════════════════════════════════════════ */
  function setupSubscription(authorId) {
    if (!authorId) return;
    const btn = document.getElementById("authorFollowBtn");
    if (!btn) return;
    function setState(sub) { btn.textContent = sub ? "Отписаться" : "Подписаться"; btn.setAttribute("aria-pressed",String(sub)); }
    fetch(`/api/subscriptions/check/${authorId}`).then(r=>r.json()).then(d=>setState(d.isSubscribed)).catch(()=>{});
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try { setState((await(await fetch(`/api/subscriptions/toggle/${authorId}`,{method:"POST"})).json()).isSubscribed); }
      catch(e){console.error(e);} finally{btn.disabled=false;}
    });
  }

  /* ══ Комментарии ═════════════════════════════════════════════ */
  function setupComments() {
    const list    = document.getElementById("commentList");
    const box     = document.getElementById("commentBox");
    const postBtn = document.getElementById("postCommentBtn");
    if (!list) return;

    function renderComment(c, prepend=false) {
      const p = document.createElement("p");
      p.innerHTML = `<strong>${esc(c.authorName)}:</strong> ${esc(c.text)}<br>
                     <small style="color:#888">${esc(c.createdAt)}</small>`;
      prepend ? list.prepend(p) : list.appendChild(p);
    }

    fetch(`/api/comments/${recipeId}`).then(r=>r.json())
      .then(comments => {
        list.innerHTML = "";
        if (!comments.length) list.innerHTML = "<p style='color:#888'>Пока нет комментариев</p>";
        else comments.forEach(c => renderComment(c));
      }).catch(()=>{});

    postBtn?.addEventListener("click", async () => {
      const text = box?.value.trim() ?? "";
      if (!text) return alert("Введите комментарий");
      postBtn.disabled = true; postBtn.textContent = "Отправка...";
      try {
        const res = await fetch("/api/comments", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({recipeId, text})
        });
        if (!res.ok) throw new Error((await res.json()).error ?? res.status);
        const c = await res.json();
        if (list.querySelector("p[style]")) list.innerHTML = "";
        renderComment(c, true);
        box.value = "";
      } catch(e) { alert(e.message||"Ошибка отправки"); }
      finally { postBtn.disabled=false; postBtn.textContent="Оставить комментарий"; }
    });
  }

  /* ══ Модалка «Состав» (для index/search/saved) ═══════════════ */
  window.openIngredientsModal = async function(id) {
    try {
      const res = await fetch(`/api/recipes/${id}/ingredients`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      showModal(d.recipeTitle, d.ingredients);
    } catch(e) { alert("Не удалось загрузить состав: " + e.message); }
  };

  function showModal(title, ingredients) {
    document.getElementById("ingredientsModal")?.remove();
    const overlay = document.createElement("div");
    overlay.id = "ingredientsModal";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:1000;";
    const rows = ingredients.length
      ? ingredients.map(i=>`<li><strong>${esc(i.name)}</strong> — ${esc(String(i.quantity))} ${esc(i.unit)}</li>`).join("")
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
    overlay.addEventListener("click", e => { if (e.target===overlay) close(); });
    document.addEventListener("keydown", function onKey(e) {
      if (e.key==="Escape") { close(); document.removeEventListener("keydown",onKey); }
    });
  }

})();
