// Пример сохранённых рецептов (для отображения карточек)
const savedRecipes = [
  {
    title: "Паста с лососем",
    desc: "Быстрое и сытное блюдо за 20 минут",
    img: "https://avatars.dzeninfra.ru/get-zen_doc/271828/pub_6697446f54b1da77a375bb2d_669744c1b57ddf67fc835c34/scale_1200",
  },
  {
    title: "Суп-пюре из тыквы",
    desc: "Ароматный и согревающий суп для холодных вечеров",
    img: "https://povarito.ru/assets/images/recipes/tykvennyy-krem-sup.jpg",
  },
  {
    title: "Шоколадный кекс",
    desc: "Нежный десерт с насыщенным вкусом какао",
    img: "https://i.pinimg.com/originals/db/62/13/db62137dc5e55422c0cbd77cfc953595.jpg",
  },
  {
    title: "Овсянка с ягодами",
    desc: "Полезный и вкусный завтрак",
    img: "https://avatars.mds.yandex.net/get-shedevrum/12157372/29f40f92cc7511eea38bb2131e9e91d7/orig",
  },
];

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderSaved(list) {
  const grid = document.getElementById("savedGrid");
  grid.innerHTML = "";

  list.forEach((r, i) => {
    const item = document.createElement("article");
    item.className = "card";
    item.setAttribute("role", "listitem");
    item.tabIndex = 0;
    item.innerHTML = `
        <div class="photo" aria-hidden="true">
          <img src="${r.img}" alt="${escapeHtml(r.title)}">
        </div>
        <h4 class="title">${escapeHtml(r.title)}</h4>
        <p class="desc">${escapeHtml(r.desc)}</p>
        <div class="compose-row">
          <button class="btn compose-btn" data-i="${i}" aria-label="Открыть рецепт ${escapeHtml(
      r.title
    )}">
            Открыть
          </button>
        </div>
      `;
    grid.appendChild(item);
  });
}

// Переходы по кнопкам
document.querySelectorAll("button[data-href]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const href = btn.dataset.href;
    if (href) window.location.href = href;
  });
});

// Обработка нажатия "Открыть"
document.addEventListener("click", (e) => {
  if (e.target.matches(".compose-btn")) {
    const title = e.target.closest(".card").querySelector(".title").textContent;
    alert("Открыт рецепт: " + title);
  }
});

// Инициализация
renderSaved(savedRecipes);
