// простая логика авторизации (демо)
const form = document.getElementById("authForm");
const msg = document.getElementById("authMsg");
const toggle = document.querySelector(".toggle-pass");
const passInput = document.getElementById("password");

// show/hide password
toggle.addEventListener("click", () => {
  if (passInput.type === "password") {
    passInput.type = "text";
    toggle.textContent = "С";
    toggle.setAttribute("aria-label", "Скрыть пароль");
  } else {
    passInput.type = "password";
    toggle.textContent = "П";
    toggle.setAttribute("aria-label", "Показать пароль");
  }
  passInput.focus();
});

// submit
form.addEventListener("submit", (e) => {
  e.preventDefault();
  msg.textContent = "";
  const login = form.login.value.trim();
  const password = form.password.value;

  if (!login || !password) {
    msg.textContent = "Пожалуйста, заполните все поля";
    return;
  }

  // demo: accept any non-empty credentials
  try {
    const remember = form.remember.checked;
    const authObj = { user: login, ts: Date.now() };
    if (remember)
      localStorage.setItem("chefbook.auth", JSON.stringify(authObj));
    else sessionStorage.setItem("chefbook.auth", JSON.stringify(authObj));

    msg.textContent = "Успешный вход. Перенаправление...";
    setTimeout(() => {
      // переход на страницу профиля (подкорректируй по роутингу)
      window.location.href = "profile.html";
    }, 700);
  } catch (err) {
    msg.textContent = "Ошибка при сохранении данных";
    console.error(err);
  }
});

// cancel -> go back to home
document.getElementById("cancelBtn").addEventListener("click", () => {
  window.location.href = "index.html";
});

document.querySelectorAll("button[data-href]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const href = btn.dataset.href;
    if (href) window.location.href = href;
  });
});
