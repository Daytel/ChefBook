const form = document.getElementById("authForm");
const msg = document.getElementById("authMsg");
const toggle = document.querySelector(".toggle-pass");
const passInput = document.getElementById("password");

// show/hide password — с проверкой наличия элементов
if (toggle && passInput) {
  toggle.addEventListener("click", () => {
    if (passInput.type === "password") {
      passInput.type = "text";
      toggle.textContent = "Скрыть";
      toggle.setAttribute("aria-label", "Скрыть пароль");
    } else {
      passInput.type = "password";
      toggle.textContent = "Показать";
      toggle.setAttribute("aria-label", "Показать пароль");
    }
    passInput.focus();
  });
}

// submit — с проверкой наличия формы
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    msg.textContent = "";

    if (!form.checkValidity()) {
      msg.textContent = "Пожалуйста, корректно заполните поля";
      // Покажем нативные подсказки браузера
      form.reportValidity();
      return;
    }

    const email = form.login.value.trim();
    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    const password = form.password.value.trim();

    if (!emailPattern.test(email)) {
      msg.textContent = "Введите корректный email";
      return;
    }

    if (!email || !password) {
      msg.textContent = "Пожалуйста, заполните все поля";
      return;
    }

    // Имитация аутентификации
    try {
      const remember = form.remember.checked;
      const authObj = { user: login, ts: Date.now() };
      if (remember)
        localStorage.setItem("chefbook.auth", JSON.stringify(authObj));
      else sessionStorage.setItem("chefbook.auth", JSON.stringify(authObj));

      msg.textContent = "Успешный вход. Перенаправление...";
      setTimeout(() => {
        window.location.href = "profile.html";
      }, 700);
    } catch (err) {
      msg.textContent = "Ошибка при сохранении данных";
      console.error(err);
    }
  });
}

// Навигация
const navButtons = document.querySelectorAll("[data-href]");
if (navButtons && navButtons.length) {
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const href = btn.dataset.href;
      if (href) window.location.href = href;
    });
  });
}
