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

      const bioEl = document.getElementById("bio");
      if (bioEl) bioEl.value = p.bio ?? "";

      const avatarPreview = document.getElementById("avatarPreview");
      if (avatarPreview && p.avatarUrl) {
        const img =
          avatarPreview.querySelector("img") ?? document.createElement("img");
        img.src = p.avatarUrl;
        img.alt = p.displayName ?? "";
        img.className = "avatar-img";
        if (!avatarPreview.contains(img)) avatarPreview.appendChild(img);
        avatarPreview.classList.add("has-image");
      }

      const plannerEnabled = document.getElementById("plannerEnabled");
      const plannerFreq = document.getElementById("plannerFreq");
      if (plannerEnabled) plannerEnabled.checked = p.plannerNotifEnabled;
      if (plannerFreq) plannerFreq.value = p.plannerNotifFreq ?? "daily";
    } catch (e) {
      console.error("loadProfile:", e);
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
          "<div style='color:#666;padding:8px 0'>У вас пока нет рецептов.</div>";
        return;
      }

      recipes.forEach((r) => {
        const row = document.createElement("div");
        row.className = "recipe-row";
        row.style.cssText =
          "display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)";

        const title = document.createElement("span");
        title.textContent = r.title;

        const actions = document.createElement("div");
        actions.style.cssText = "display:flex;gap:6px;flex-shrink:0";

        const editBtn = document.createElement("button");
        editBtn.className = "btn small";
        editBtn.textContent = "Изменить";
        editBtn.addEventListener("click", () => {
          window.location.href = `/add-recipe.html?edit=${r.id}`;
        });

        const delBtn = document.createElement("button");
        delBtn.className = "btn small";
        delBtn.textContent = "Удалить";
        delBtn.style.cssText = "border-color:#e44;color:#e44";
        delBtn.addEventListener("click", () => {
          if (!confirm(`Удалить рецепт «${esc(r.title)}»?`)) return;
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
          "<div style='color:#666;padding:8px 0'>Вы ни на кого не подписаны.</div>";
        return;
      }

      subs.forEach((s) => {
        const row = document.createElement("div");
        row.style.cssText =
          "display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)";

        const nameLink = document.createElement("a");
        nameLink.href = `/reviews.html?id=${s.authorId}`;
        nameLink.textContent = s.authorName;
        nameLink.style.cssText = "color:inherit;text-decoration:none;";
        nameLink.addEventListener(
          "mouseover",
          () => (nameLink.style.textDecoration = "underline"),
        );
        nameLink.addEventListener(
          "mouseout",
          () => (nameLink.style.textDecoration = "none"),
        );

        const lbl = document.createElement("label");
        lbl.style.cssText =
          "display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:#666";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = s.isNotified;
        cb.addEventListener("change", async () => {
          try {
            await fetch(
              `/api/profile/subscriptions/${s.authorId}/notify?userId=${user.id}&enabled=${cb.checked}`,
              { method: "PATCH" },
            );
          } catch (e) {
            console.error("notify toggle:", e);
            cb.checked = !cb.checked;
          }
        });
        lbl.appendChild(cb);
        lbl.appendChild(document.createTextNode("Уведомления"));

        row.appendChild(nameLink);
        row.appendChild(lbl);
        container.appendChild(row);
      });
    } catch (e) {
      console.error("loadSubscriptions:", e);
    }
  }

  /* Сохранение профиля */
  async function saveProfile() {
    const saveBtn = document.getElementById("saveBtn");
    try {
      const nameVal = document.getElementById("name")?.value.trim() ?? "";
      const bioVal = document.getElementById("bio")?.value.trim() ?? "";
      const enabled =
        document.getElementById("plannerEnabled")?.checked ?? false;
      const freq = document.getElementById("plannerFreq")?.value ?? "daily";

      // Аватар: передаём ТОЛЬКО если пользователь загрузил новый файл (base64 data:)
      // img.src после загрузки содержит data:image/..., но после обновления страницы — http://...
      // Контроллер принимает только data: и сохраняет как /images/filename.jpg
      const avatarPreview = document.getElementById("avatarPreview");
      const avatarImg = avatarPreview?.querySelector("img");
      const rawSrc = avatarImg?.getAttribute("src") ?? avatarImg?.src ?? "";
      const avatarDataUrl = rawSrc.startsWith("data:") ? rawSrc : null;

      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Сохранение...";
      }

      const res = await fetch(`/api/profile/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: nameVal,
          bio: bioVal,
          avatarUrl: avatarDataUrl,
          plannerNotifEnabled: enabled,
          plannerNotifFreq: freq,
        }),
      });
      if (!res.ok)
        throw new Error(
          (await res.json().catch(() => ({}))).error ?? res.status,
        );

      // Обновляем данные в localStorage (avatarUrl берём из ответа сервера — он уже /images/...)
      const saved = await res.json();
      const newAvatarUrl = saved.avatarUrl ?? avatarDataUrl ?? user.avatarUrl;
      const updated = {
        ...user,
        displayName: nameVal,
        avatarUrl: newAvatarUrl,
      };
      window.chefbook.setUser(updated);

      // Обновляем кнопки навигации (Профиль/Войти)
      if (typeof window.updateAuthButtons === "function")
        window.updateAuthButtons();

      alert("Профиль сохранён!");
    } catch (e) {
      alert("Ошибка сохранения: " + e.message);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Сохранить профиль";
      }
    }
  }

  /* Аватар */
  document.getElementById("avatarInput")?.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const preview = document.getElementById("avatarPreview");
      if (!preview) return;
      let img = preview.querySelector("img");
      if (!img) {
        img = document.createElement("img");
        img.className = "avatar-img";
        preview.appendChild(img);
      }
      img.src = ev.target.result;
      img.alt = user.displayName ?? "";
      preview.classList.add("has-image");
    };
    reader.readAsDataURL(f);
  });

  document.getElementById("removeAvatar")?.addEventListener("click", () => {
    const preview = document.getElementById("avatarPreview");
    if (preview) {
      preview.querySelector("img")?.remove();
      preview.style.backgroundImage = "";
      preview.classList.remove("has-image");
    }
  });

  /* Кнопки формы и навигации */
  function bindButtons() {
    // Сохранить профиль
    document.getElementById("saveBtn")?.addEventListener("click", saveProfile);

    // Выход из аккаунта
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      if (confirm("Выйти из аккаунта?")) {
        window.chefbook.logout(); // удаляет из localStorage и редиректит на /index.html
      }
    });

    // Внутренняя навигация
    document.querySelector(".nav-reviews")?.addEventListener("click", () => {
      // Открываем отзывы об авторе для текущего пользователя
      window.location.href = `/reviews.html?id=${user.id}`;
    });
    document.querySelector(".nav-saved")?.addEventListener("click", () => {
      window.location.href = "/saved.html";
    });
    document.querySelector(".nav-planner")?.addEventListener("click", () => {
      window.location.href = "/planner.html";
    });
    document.querySelector(".nav-add")?.addEventListener("click", () => {
      window.location.href = "/add-recipe.html";
    });

    // Обновление превью при вводе
    document.getElementById("name")?.addEventListener("input", () => {
      const pvName = document.getElementById("pvName");
      if (pvName)
        pvName.textContent =
          document.getElementById("name").value.trim() ||
          user.displayName ||
          "—";
    });
    document
      .getElementById("plannerEnabled")
      ?.addEventListener("change", updatePlannerPreview);
    document
      .getElementById("plannerFreq")
      ?.addEventListener("change", updatePlannerPreview);
  }

  function updatePlannerPreview() {
    const pvPlanner = document.getElementById("pvPlanner");
    if (!pvPlanner) return;
    const enabled = document.getElementById("plannerEnabled")?.checked;
    const freq = document.getElementById("plannerFreq");
    pvPlanner.textContent =
      "Оповещения: " +
      (enabled
        ? (freq?.options[freq.selectedIndex]?.text ?? "включены")
        : "выкл");
  }
})();
