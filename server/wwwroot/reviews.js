/*
   /reviews.html?id=<authorId>

   Эндпоинты:
     GET  /api/authors/{id}               — данные автора
     GET  /api/subscriptions/check/{id}   — статус подписки
     POST /api/subscriptions/toggle/{id}  — переключить подписку
     GET  /api/author-reviews/{authorId}  — список отзывов
     POST /api/author-reviews             — добавить отзыв
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

  function getAuthorId() {
    const p = new URLSearchParams(window.location.search).get("id");
    return p ? Number(p) : null;
  }

  const authorId = getAuthorId();

  // TEMP: пока нет авторизации. 1 = залогинен как user 1, null = не залогинен.
  const TEMP_USER_ID = 1;

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("button[data-href]").forEach((btn) => {
      btn.addEventListener("click", () => {
        window.location.href = btn.dataset.href;
      });
    });

    if (!authorId) {
      document.getElementById("authorName").textContent = "Автор не указан";
      return;
    }

    loadAuthor();
    loadReviews();
    setupForm();
  });

  /* Загрузка данных автора */
  async function loadAuthor() {
    try {
      const res = await fetch(`/api/authors/${authorId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const a = await res.json();

      document.getElementById("authorName").textContent = a.name ?? "Автор";
      document.getElementById("authorBio").textContent = a.bio ?? "";
      document.getElementById("authorRecipes").textContent =
        `Рецептов: ${a.recipesCount ?? 0}`;
      document.getElementById("authorFollowers").textContent =
        `Подписчиков: ${a.followersCount ?? 0}`;

      const avatarImg = document.querySelector(".avatar-img");
      if (avatarImg) {
        avatarImg.src = a.avatarUrl ?? "/images/avatar.jpg";
        avatarImg.alt = a.name ?? "Автор";
      }

      // Скрываем кнопку подписки если смотришь свою страницу
      const actionsBlock = document.getElementById("authorActions");
      if (TEMP_USER_ID === authorId) {
        if (actionsBlock) actionsBlock.style.display = "none";
      } else {
        setupSubscription();
      }
    } catch (err) {
      console.error("Ошибка загрузки автора:", err);
      document.getElementById("authorName").textContent = "Ошибка загрузки";
    }
  }

  /* Подписка */
  function setupSubscription() {
    const btn = document.getElementById("followBtn");
    if (!btn) return;

    function setState(sub) {
      btn.textContent = sub ? "Отписаться" : "Подписаться";
      btn.setAttribute("aria-pressed", String(sub));
    }

    fetch(`/api/subscriptions/check/${authorId}`)
      .then((r) => r.json())
      .then((d) => setState(d.isSubscribed))
      .catch(() => {});

    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        const res = await fetch(`/api/subscriptions/toggle/${authorId}`, {
          method: "POST",
        });
        if (!res.ok) throw new Error(res.status);
        setState((await res.json()).isSubscribed);
      } catch (e) {
        console.error("Ошибка подписки:", e);
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* Загрузка отзывов */
  async function loadReviews() {
    const list = document.getElementById("commentsList");
    if (!list) return;
    list.innerHTML = "<p style='color:#888'>Загрузка...</p>";

    try {
      const res = await fetch(`/api/author-reviews/${authorId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reviews = await res.json();

      list.innerHTML = "";
      if (!reviews.length) {
        list.innerHTML =
          "<p style='color:#888;padding:8px 0'>Отзывов пока нет</p>";
        return;
      }
      reviews.forEach((r) => renderReview(r));
    } catch (err) {
      console.error("Ошибка загрузки отзывов:", err);
      list.innerHTML = "<p style='color:#c00'>Не удалось загрузить отзывы</p>";
    }
  }

  function renderReview(r, prepend = false) {
    const list = document.getElementById("commentsList");
    const item = document.createElement("div");
    item.setAttribute("role", "listitem");
    item.className = "comment-item";
    item.innerHTML =
      `<strong>${esc(r.reviewerName)}</strong>` +
      `<p>${esc(r.text)}</p>` +
      (r.createdAt
        ? `<small style="color:#888">${esc(r.createdAt)}</small>`
        : "");
    prepend ? list.prepend(item) : list.appendChild(item);
  }

  /* Форма добавления отзыва */
  function setupForm() {
    const postBtn = document.getElementById("postComment");
    const resetBtn = document.getElementById("resetComment");
    const textArea = document.getElementById("commentText");
    if (!postBtn) return;

    const isLoggedIn = TEMP_USER_ID !== null;

    if (!isLoggedIn) {
      postBtn.disabled = true;
      postBtn.title =
        "Оставлять отзывы могут только зарегистрированные пользователи";
      const hint = document.createElement("p");
      hint.className = "muted comment-note";
      hint.style.marginTop = "6px";
      hint.textContent = "Войдите в аккаунт, чтобы оставить отзыв.";
      postBtn.closest(".comment-form-row")?.after(hint);
    } else {
      postBtn.disabled = false;
      postBtn.title = "";
    }

    postBtn.addEventListener("click", async () => {
      if (!isLoggedIn) return;
      const text = textArea?.value.trim() ?? "";
      if (!text) return alert("Введите текст отзыва");

      postBtn.disabled = true;
      postBtn.textContent = "Публикация...";

      try {
        const res = await fetch("/api/author-reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authorId, text }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }
        const created = await res.json();

        const list = document.getElementById("commentsList");
        if (list.querySelector("p[style]")) list.innerHTML = "";
        renderReview(created, true);
        textArea.value = "";
      } catch (e) {
        alert(e.message || "Ошибка публикации");
      } finally {
        postBtn.disabled = false;
        postBtn.textContent = "Опубликовать";
      }
    });

    resetBtn?.addEventListener("click", () => {
      if (textArea) textArea.value = "";
    });
  }
})();
