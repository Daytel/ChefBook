/* auth.js — ChefBook  /auth.html */
document.addEventListener("DOMContentLoaded", () => {
  const msg = document.getElementById("authMsg");
  const tabLogin = document.getElementById("tabLogin");
  const tabRegister = document.getElementById("tabRegister");
  const loginSection = document.getElementById("loginSection");
  const registerSection = document.getElementById("registerSection");

  /* Переключение вкладок */
  function showTab(tab) {
    const isLogin = tab === "login";
    // hidden управляет видимостью секций
    loginSection.hidden = !isLogin;
    registerSection.hidden = isLogin;
    tabLogin.setAttribute("aria-selected", String(isLogin));
    tabRegister.setAttribute("aria-selected", String(!isLogin));
    tabLogin.classList.toggle("active", isLogin);
    tabRegister.classList.toggle("active", !isLogin);
    if (msg) msg.textContent = "";
  }

  tabLogin?.addEventListener("click", () => showTab("login"));
  tabRegister?.addEventListener("click", () => showTab("register"));

  // Если пришли с ?mode=register — сразу открываем регистрацию
  const mode = new URLSearchParams(window.location.search).get("mode");
  showTab(mode === "register" ? "register" : "login");

  /* Показать/скрыть пароль */
  document
    .querySelector(".toggle-pass")
    ?.addEventListener("click", function () {
      const inp = document.getElementById("password");
      if (!inp) return;
      const hidden = inp.type === "password";
      inp.type = hidden ? "text" : "password";
      this.textContent = hidden ? "Скрыть" : "Показать";
      this.setAttribute(
        "aria-label",
        hidden ? "Скрыть пароль" : "Показать пароль",
      );
      inp.focus();
    });

  /* Вход */
  document.getElementById("loginBtn")?.addEventListener("click", async () => {
    if (!msg) return;
    const email = document.getElementById("login")?.value.trim() ?? "";
    const password = document.getElementById("password")?.value.trim() ?? "";

    if (!email || !password) {
      msg.textContent = "Заполните все поля";
      return;
    }

    msg.textContent = "Проверка...";
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка входа");

      window.chefbook.setUser(data);
      msg.textContent = "Вход выполнен! Перенаправление...";
      setTimeout(() => {
        window.location.href = "/profile.html";
      }, 600);
    } catch (e) {
      msg.textContent = e.message;
    }
  });

  /* Регистрация */
  document
    .getElementById("registerBtn")
    ?.addEventListener("click", async () => {
      if (!msg) return;
      const email = document.getElementById("regEmail")?.value.trim() ?? "";
      const password =
        document.getElementById("regPassword")?.value.trim() ?? "";

      if (!email || !password) {
        msg.textContent = "Заполните все поля";
        return;
      }
      if (password.length < 8) {
        msg.textContent = "Пароль — минимум 8 символов";
        return;
      }

      msg.textContent = "Регистрация...";
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Ошибка регистрации");

        window.chefbook.setUser(data);
        msg.textContent = "Аккаунт создан! Перенаправление...";
        setTimeout(() => {
          window.location.href = "/profile.html";
        }, 600);
      } catch (e) {
        msg.textContent = e.message;
      }
    });
});
