/* =====================================================================
   common.js — ChefBook
   Общий код для всех страниц:
   - Навигация по data-href
   - Модальное окно «Состав» (AJAX 4) — доступно на index, search, saved
   ===================================================================== */

/* Утилита */
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/* ── Навигация кнопок data-href ─────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("button[data-href]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const href = btn.dataset.href;
      if (href) window.location.href = href;
    });
  });
});

/* ── Модальное окно «Состав» ────────────────────────────────────── */

function showIngredientsModal(title, ingredients) {
  document.getElementById("ingredientsModal")?.remove();

  const overlay = document.createElement("div");
  overlay.id        = "ingredientsModal";
  overlay.className = "modal-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", `Состав: ${title}`);
  overlay.tabIndex  = -1;

  const rows = ingredients.length
    ? ingredients.map(i =>
        `<li><strong>${escapeHtml(i.name)}</strong> — ${escapeHtml(String(i.quantity))} ${escapeHtml(i.unit)}</li>`
      ).join("")
    : "<li>Ингредиенты не указаны</li>";

  overlay.innerHTML = `
    <div class="modal-box">
      <button class="modal-close btn" type="button" aria-label="Закрыть">✕</button>
      <h2>${escapeHtml(title)}</h2>
      <h3>Ингредиенты</h3>
      <ul class="modal-ingredients">${rows}</ul>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.focus();

  function closeModal() {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e) { if (e.key === "Escape") closeModal(); }

  overlay.querySelector(".modal-close").addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener("keydown", onKey);
}

// Глобальная функция — вызывается из любой страницы по recipeId
window.openIngredientsModal = async function (id) {
  try {
    const res = await fetch(`/api/recipes/${id}/ingredients`);
    if (!res.ok) throw new Error(`Ошибка ${res.status}`);
    const data = await res.json();
    showIngredientsModal(data.recipeTitle, data.ingredients);
  } catch (err) {
    console.error("Ошибка загрузки ингредиентов:", err);
    alert("Не удалось загрузить состав рецепта.");
  }
};

/* ── CSS для модалки (вставляем один раз) ───────────────────────── */
(function injectModalStyles() {
  if (document.getElementById("modal-styles")) return;
  const style = document.createElement("style");
  style.id = "modal-styles";
  style.textContent = `
    .modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.55);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }
    .modal-box {
      background: #fff; border-radius: 12px;
      padding: 24px; max-width: 480px; width: 90%;
      max-height: 80vh; overflow-y: auto;
      position: relative;
    }
    .modal-close {
      position: absolute; top: 12px; right: 12px;
      background: none; border: none;
      font-size: 20px; cursor: pointer; line-height: 1;
    }
    .modal-ingredients { padding-left: 20px; margin-top: 8px; }
    .modal-ingredients li { margin-bottom: 6px; }
  `;
  document.head.appendChild(style);
})();
