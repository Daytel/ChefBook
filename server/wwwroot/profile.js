/* profile.js — ChefBook  /profile.html
   Загружает данные профиля из API, список рецептов, подписки.
   Сохраняет изменения на сервер.
*/
(function () {
  "use strict";

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  const user = window.chefbook?.getUser?.() ?? null;

  document.addEventListener("DOMContentLoaded", () => {
    if (!user) {
      window.location.href = "/auth.html";
      return;
    }

    loadProfile();
    loadUserRecipes();
    loadSubscriptions();
    bindButtons();
  });

  /* Загрузка профиля */
  async function loadProfile() {
    try {
      const res = await fetch(`/api/profile/${user.id}`);
      if (!res.ok) throw new Error(res.status);
      const p = await res.json();

      const nameEl = document.getElementById("name");
      if (nameEl) nameEl.value = p.displayName ?? "";

      const avatarPreview = document.getElementById("avatarPreview");
      if (avatarPreview && p.avatarUrl) {
        avatarPreview.style.backgroundImage = `url(${p.avatarUrl})`;
        avatarPreview.classList.add("has-image");
      }

      const plannerEnabled = document.getElementById("plannerEnabled");
      const plannerFreq = document.getElementById("plannerFreq");
      if (plannerEnabled) plannerEnabled.checked = p.plannerNotifEnabled;
      if (plannerFreq) plannerFreq.value = p.plannerNotifFreq ?? "daily";

      updatePreview(p);
    } catch (e) {
      console.error("loadProfile:", e);
    }
  }

  function updatePreview(p) {
    const pvName = document.getElementById("pvName");
    const pvPlanner = document.getElementById("pvPlanner");
    const nameEl = document.getElementById("name");
    if (pvName)
      pvName.textContent = nameEl?.value.trim() || p?.displayName || "—";
    if (pvPlanner) {
      const enabled = document.getElementById("plannerEnabled")?.checked;
      const freq = document.getElementById("plannerFreq");
      pvPlanner.textContent =
        "Оповещения: " +
        (enabled
          ? (freq?.options[freq.selectedIndex]?.text ?? "включены")
          : "выкл");
    }
  }

  /* Список рецептов пользователя */
  async function loadUserRecipes() {
    const container = document.getElementById("recipesList");
    if (!container) return;

    try {
      const res = await fetch(`/api/profile/${user.id}/recipes`);
      if (!res.ok) throw new Error(res.status);
      const recipes = await res.json();

      container.innerHTML = "";
      if (!recipes.length) {
        container.innerHTML =
          "<div style='color:#666'>У вас пока нет рецептов.</div>";
        return;
      }

      recipes.forEach((r) => {
        const row = document.createElement("div");
        row.className = "recipe-row";
        row.style.cssText =
          "display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)";

        const title = document.createElement("div");
        title.className = "recipe-title";
        title.textContent = r.title;

        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.gap = "6px";

        const editBtn = document.createElement("button");
        editBtn.className = "btn";
        editBtn.textContent = "Изменить";
        editBtn.addEventListener("click", () => {
          window.location.href = `/add-recipe.html?edit=${r.id}`;
        });

        const delBtn = document.createElement("button");
        delBtn.className = "btn";
        delBtn.textContent = "Удалить";
        delBtn.addEventListener("click", () => {
          if (!confirm(`Удалить рецепт «${r.title}»?`)) return;
          deleteRecipe(r.id, row);
        });

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        row.appendChild(title);
        row.appendChild(actions);
        container.appendChild(row);
      });
    } catch (e) {
      console.error("loadUserRecipes:", e);
    }
  }

  async function deleteRecipe(recipeId, rowEl) {
    try {
      const res = await fetch(
        `/api/profile/recipes/${recipeId}?userId=${user.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error((await res.json()).error ?? res.status);
      rowEl.remove();
    } catch (e) {
      alert("Ошибка удаления: " + e.message);
    }
  }

  /* Подписки на авторов */
  async function loadSubscriptions() {
    const container = document.getElementById("authorsList");
    if (!container) return;

    try {
      const res = await fetch(`/api/profile/${user.id}/subscriptions`);
      if (!res.ok) throw new Error(res.status);
      const subs = await res.json();

      container.innerHTML = "";
      if (!subs.length) {
        container.innerHTML =
          "<div style='color:#666'>Вы ни на кого не подписаны.</div>";
        return;
      }

      subs.forEach((s) => {
        const row = document.createElement("div");
        row.style.cssText =
          "display:flex;justify-content:space-between;align-items:center;padding:6px 0";

        const name = document.createElement("span");
        name.textContent = s.authorName;

        const lbl = document.createElement("label");
        lbl.style.cssText =
          "display:flex;align-items:center;gap:6px;cursor:pointer";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = s.isNotified;
        cb.addEventListener("change", async () => {
          await fetch(
            `/api/profile/subscriptions/${s.authorId}/notify?userId=${user.id}&enabled=${cb.checked}`,
            { method: "PATCH" },
          );
        });
        lbl.appendChild(cb);
        lbl.appendChild(document.createTextNode("Уведомления"));

        row.appendChild(name);
        row.appendChild(lbl);
        container.appendChild(row);
      });
    } catch (e) {
      console.error("loadSubscriptions:", e);
    }
  }

  /* Сохранение профиля */
  async function saveProfile() {
    try {
      const nameVal = document.getElementById("name")?.value.trim();
      const enabled = document.getElementById("plannerEnabled")?.checked;
      const freq = document.getElementById("plannerFreq")?.value;

      const res = await fetch(`/api/profile/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: nameVal,
          plannerNotifEnabled: enabled,
          plannerNotifFreq: freq,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? res.status);

      // Обновляем имя в localStorage
      const updated = { ...user, displayName: nameVal };
      window.chefbook.setUser(updated);

      alert("Профиль сохранён!");
      updatePreview({});
    } catch (e) {
      alert("Ошибка: " + e.message);
    }
  }

  /* Аватар */
  document.getElementById("avatarInput")?.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const preview = document.getElementById("avatarPreview");
      if (preview) {
        preview.style.backgroundImage = `url(${ev.target.result})`;
        preview.classList.add("has-image");
      }
    };
    reader.readAsDataURL(f);
  });

  document.getElementById("removeAvatar")?.addEventListener("click", () => {
    const preview = document.getElementById("avatarPreview");
    if (preview) {
      preview.style.backgroundImage = "";
      preview.classList.remove("has-image");
    }
  });

  /* Кнопки формы */
  function bindButtons() {
    document.getElementById("saveBtn")?.addEventListener("click", saveProfile);
    document.getElementById("clearBtn")?.addEventListener("click", () => {
      if (!confirm("Сбросить изменения?")) return;
      loadProfile();
    });
    document
      .getElementById("name")
      ?.addEventListener("input", () => updatePreview({}));
    document
      .getElementById("plannerEnabled")
      ?.addEventListener("change", () => updatePreview({}));
    document
      .getElementById("plannerFreq")
      ?.addEventListener("change", () => updatePreview({}));
  }
})();
