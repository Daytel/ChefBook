/* auth.js — ChefBook авторизация */
document.addEventListener("DOMContentLoaded", () => {
  const tabLogin = document.getElementById("tabLogin");
  const tabRegister = document.getElementById("tabRegister");
  const loginSection = document.getElementById("loginSection");
  const registerSection = document.getElementById("registerSection");
  const msgLogin = document.getElementById("authMsg");
  const msgReg = document.getElementById("authMsgReg");

  /* Переключение вкладок */
  function showTab(tab) {
    const isLogin = tab === "login";
    loginSection.hidden = !isLogin;
    registerSection.hidden = isLogin;
    tabLogin.setAttribute("aria-selected", String(isLogin));
    tabRegister.setAttribute("aria-selected", String(!isLogin));
    if (msgLogin) msgLogin.textContent = "";
    if (msgReg) msgReg.textContent = "";
  }

  tabLogin?.addEventListener("click", () => showTab("login"));
  tabRegister?.addEventListener("click", () => showTab("register"));

  const mode = new URLSearchParams(window.location.search).get("mode");
  showTab(mode === "register" ? "register" : "login");

  /* Вход */
  document.getElementById("loginBtn")?.addEventListener("click", async () => {
    const email = document.getElementById("login")?.value.trim() ?? "";
    const password = document.getElementById("password")?.value.trim() ?? "";

    if (!email || !password) {
      if (msgLogin) msgLogin.textContent = "Заполните все поля";
      return;
    }
    if (msgLogin) msgLogin.textContent = "Проверка...";

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка входа");

      window.chefbook.setUser(data);
      if (msgLogin) msgLogin.textContent = "Вход выполнен! Перенаправление...";
      setTimeout(() => {
        window.location.href = "/profile.html";
      }, 600);
    } catch (e) {
      if (msgLogin) msgLogin.textContent = e.message;
    }
  });

  /* Регистрация */
  document
    .getElementById("registerBtn")
    ?.addEventListener("click", async () => {
      const email = document.getElementById("regEmail")?.value.trim() ?? "";
      const password =
        document.getElementById("regPassword")?.value.trim() ?? "";

      if (!email || !password) {
        if (msgReg) msgReg.textContent = "Заполните все поля";
        return;
      }
      if (password.length < 8) {
        if (msgReg) msgReg.textContent = "Пароль — минимум 8 символов";
        return;
      }
      if (msgReg) msgReg.textContent = "Регистрация...";

      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Ошибка регистрации");

        window.chefbook.setUser(data);
        if (msgReg) msgReg.textContent = "Аккаунт создан! Перенаправление...";
        setTimeout(() => {
          window.location.href = "/profile.html";
        }, 600);
      } catch (e) {
        if (msgReg) msgReg.textContent = e.message;
      }
    });
});
