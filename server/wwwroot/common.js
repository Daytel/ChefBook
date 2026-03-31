/*
   common.js — ChefBook
   Управляет пользователем (localStorage), навигацией, кнопками входа.
*/

/* Работа с пользователем */
const USER_KEY = "chefbook.user";

window.chefbook = {
  getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY)) || null;
    } catch {
      return null;
    }
  },
  setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  logout() {
    localStorage.removeItem(USER_KEY);
    window.location.href = "/index.html";
  },
};

/* Обновление всех кнопок входа/профиля
   Класс .nav-auth-btn есть и в шапке, и в подвале — обновляем все.
*/
function updateAuthButtons() {
  const user = window.chefbook.getUser();
  document.querySelectorAll(".nav-auth-btn").forEach((btn) => {
    const label = btn.querySelector(".btn-label");
    if (user) {
      if (label)
        label.textContent = btn.classList.contains("nav-item")
          ? "Профиль"
          : "ПРОФИЛЬ";
      btn.dataset.href = "/profile.html";
      btn.setAttribute("aria-label", "Профиль");
    } else {
      if (label)
        label.textContent = btn.classList.contains("nav-item")
          ? "Войти"
          : "ВОЙТИ";
      btn.dataset.href = "/auth.html";
      btn.setAttribute("aria-label", "Войти в аккаунт");
    }
  });
}

/* Навигация кнопок data-href */
function initNav() {
  document.querySelectorAll("button[data-href]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const href = btn.dataset.href;
      if (href) window.location.href = href;
    });
  });
}

/* Утилита */
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/* Модальное окно «Состав» */
window.openIngredientsModal = async function (id) {
  try {
    const res = await fetch(`/api/recipes/${id}/ingredients`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    showModal(d.recipeTitle, d.ingredients);
  } catch (e) {
    alert("Не удалось загрузить состав: " + e.message);
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
            `<li><strong>${escapeHtml(i.name)}</strong> — ${escapeHtml(String(i.quantity))} ${escapeHtml(i.unit)}</li>`,
        )
        .join("")
    : "<li>Ингредиенты не указаны</li>";
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:24px;max-width:480px;width:90%;max-height:80vh;overflow-y:auto;position:relative;">
      <button id="modalClose" type="button" style="position:absolute;top:12px;right:12px;background:none;border:none;font-size:20px;cursor:pointer;">✕</button>
      <h2>${escapeHtml(title)}</h2>
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

/* Инициализация */
document.addEventListener("DOMContentLoaded", () => {
  updateAuthButtons();
  initNav();
});
