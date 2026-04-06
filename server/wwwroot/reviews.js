/* reviews.js — ChefBook  /reviews.html?id=<authorId>
   Авторизация — window.chefbook.getUser() из localStorage.
   Не авторизован:
     - кнопка «Подписаться» скрыта
     - кнопка «Опубликовать» заблокирована + подсказка
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

  const authorId =
    Number(new URLSearchParams(window.location.search).get("id")) || null;
  const currentUser = window.chefbook?.getUser?.() ?? null;
  const isLoggedIn = currentUser !== null;

  // Проверяем сразу — это своя страница?
  const isOwnPage =
    isLoggedIn && authorId && Number(currentUser.id) === Number(authorId);

  document.addEventListener("DOMContentLoaded", () => {
    // Скрываем кнопку «Подписаться» сразу — до любых запросов к API
    if (!isLoggedIn || isOwnPage) {
      const actionsBlock = document.getElementById("authorActions");
      if (actionsBlock) actionsBlock.hidden = true;
    }

    if (!authorId) {
      document.getElementById("authorName").textContent = "Автор не указан";
      return;
    }

    loadAuthor();
    loadReviews();
    setupForm();
  });

  /* Данные автора */
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
        avatarImg.alt = a.name ?? "";
      }

      // Подписка только если авторизован и это чужая страница
      if (isLoggedIn && !isOwnPage) {
        setupSubscription();
      }
    } catch (err) {
      console.error(err);
      document.getElementById("authorName").textContent = "Ошибка загрузки";
    }
  }

  /* Подписка
     Не авторизован          → кнопка скрыта
     Авторизован + свой акк  → кнопка скрыта
     Авторизован + чужой     → кнопка активна
*/
  function setupSubscription() {
    const btn = document.getElementById("followBtn");
    if (!btn) return;

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

  /* Список отзывов */
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
        list.innerHTML = "<p style='color:#888'>Отзывов пока нет</p>";
        return;
      }
      reviews.forEach((r) => renderReview(r));
    } catch (err) {
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

  /* Форма отзыва
     Не авторизован → кнопка disabled + подсказка
     Авторизован    → кнопка активна
*/
  function setupForm() {
    const postBtn = document.getElementById("postComment");
    const resetBtn = document.getElementById("resetComment");
    const textArea = document.getElementById("commentText");
    const authHint = document.getElementById("authHint");
    if (!postBtn) return;

    if (!isLoggedIn) {
      postBtn.disabled = true;
      postBtn.title = "Войдите в аккаунт, чтобы оставить отзыв";
      if (authHint) authHint.style.display = "block";
    } else {
      postBtn.disabled = false;
      postBtn.title = "";
      if (authHint) authHint.style.display = "none";
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
          body: JSON.stringify({ userId: currentUser.id, authorId, text }),
        });
        if (!res.ok)
          throw new Error(
            (await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`,
          );
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
