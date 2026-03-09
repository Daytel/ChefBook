// author id
const AUTHOR_ID = "author_1";
const COMMENTS_KEY = "chefbook_comments_" + AUTHOR_ID;

// DOM
const authorNameEl = document.getElementById("authorName");
const authorBioEl = document.getElementById("authorBio");
const authorRecipesEl = document.getElementById("authorRecipes");
const authorFollowersEl = document.getElementById("authorFollowers");
const authorAvatar = document.getElementById("authorAvatar");
const followBtn = document.getElementById("followBtn");

const commentForm = document.getElementById("commentForm");
const commentAuthor = document.getElementById("commentAuthor");
const commentText = document.getElementById("commentText");
const postComment = document.getElementById("postComment");
const resetComment = document.getElementById("resetComment");
const commentsList = document.getElementById("commentsList");

// author data (Александра Иванова)
const sampleAuthor = {
  id: AUTHOR_ID,
  name: "Александра Иванова",
  bio: "Любит простые и быстрые рецепты для будних дней. Делится лайфхаками по хранению продуктов.",
  recipes: 12,
  followers: 134,
  avatarUrl:
    "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200",
};

// хелперы
function loadComments() {
  try {
    const raw = localStorage.getItem(COMMENTS_KEY);
    return raw
      ? JSON.parse(raw)
      : [
          {
            id: "c1",
            name: "Ирина",
            text: "Отличные рецепты — всё проверено, спасибо!",
            likes: 3,
            own: false,
            createdAt: Date.now() - 86400000,
          },
          {
            id: "c2",
            name: "Пётр",
            text: "Очень понравился кекс. Простой и вкусный.",
            likes: 1,
            own: false,
            createdAt: Date.now() - 3600000,
          },
        ];
  } catch (e) {
    console.error(e);
    return [];
  }
}

function saveComments(arr) {
  localStorage.setItem(COMMENTS_KEY, JSON.stringify(arr));
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}

// render author card
function renderAuthor() {
  authorNameEl.textContent = sampleAuthor.name;
  authorBioEl.textContent = sampleAuthor.bio;
  authorRecipesEl.textContent = "Рецептов: " + sampleAuthor.recipes;
  authorFollowersEl.textContent = "Подписчиков: " + sampleAuthor.followers;

  // вставляем <img> аватар
  authorAvatar.innerHTML = `<img src="${sampleAuthor.avatarUrl}" alt="${sampleAuthor.name}" class="avatar-img" />`;

  const followed =
    localStorage.getItem("chef_follow_" + sampleAuthor.id) === "1";
  followBtn.textContent = followed ? "Отписаться" : "Подписаться";
  followBtn.setAttribute("aria-pressed", followed ? "true" : "false");
}

// comments rendering
function renderComments() {
  const arr = loadComments();
  commentsList.innerHTML = "";
  if (!arr.length) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "Пока нет отзывов — будьте первым!";
    commentsList.appendChild(empty);
    return;
  }

  arr
    .slice()
    .reverse()
    .forEach((c) => {
      const item = document.createElement("article");
      item.className = "comment";
      item.setAttribute("role", "listitem");

      const head = document.createElement("div");
      head.className = "comment-head";
      head.innerHTML = `<strong class="comment-author">${escapeHtml(
        c.name,
      )}</strong>
                        <span class="comment-date">${formatDate(
                          c.createdAt,
                        )}</span>`;

      const body = document.createElement("div");
      body.className = "comment-body";
      body.textContent = c.text;

      const actions = document.createElement("div");
      actions.className = "comment-actions";

      const likeBtn = document.createElement("button");
      likeBtn.className = "btn small like-btn";
      likeBtn.type = "button";
      likeBtn.innerText = "❤ " + (c.likes || 0);
      likeBtn.addEventListener("click", () => {
        c.likes = (c.likes || 0) + 1;
        const comments = loadComments();
        const idx = comments.findIndex((x) => x.id === c.id);
        if (idx !== -1) comments[idx].likes = c.likes;
        saveComments(comments);
        renderComments();
      });

      actions.appendChild(likeBtn);

      if (c.own) {
        const delBtn = document.createElement("button");
        delBtn.className = "btn small";
        delBtn.type = "button";
        delBtn.textContent = "Удалить";
        delBtn.addEventListener("click", () => {
          if (!confirm("Удалить ваш комментарий?")) return;
          let comments = loadComments();
          comments = comments.filter((x) => x.id !== c.id);
          saveComments(comments);
          renderComments();
        });
        actions.appendChild(delBtn);
      }

      item.appendChild(head);
      item.appendChild(body);
      item.appendChild(actions);
      commentsList.appendChild(item);
    });
}

// helper to escape text
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// post new comment
postComment.addEventListener("click", () => {
  const name = (commentAuthor.value || "Аноним").trim();
  const text = (commentText.value || "").trim();
  if (!text) {
    alert("Введите текст отзыва");
    return;
  }
  const comments = loadComments();
  const id = "c_" + Date.now();
  const newC = {
    id,
    name,
    text,
    likes: 0,
    own: true,
    createdAt: Date.now(),
  };
  comments.push(newC);
  saveComments(comments);
  commentAuthor.value = "";
  commentText.value = "";
  renderComments();
});

resetComment.addEventListener("click", () => {
  commentAuthor.value = "";
  commentText.value = "";
});

followBtn.addEventListener("click", () => {
  const key = "chef_follow_" + sampleAuthor.id;
  const current = localStorage.getItem(key) === "1";
  localStorage.setItem(key, current ? "0" : "1");
  renderAuthor();
});

// initial render
renderAuthor();
renderComments();

// nav buttons simple
Array.from(document.querySelectorAll(".home")).forEach((b) =>
  b.addEventListener("click", () => (window.location.href = "index.html")),
);
Array.from(document.querySelectorAll(".profile")).forEach((b) =>
  b.addEventListener("click", () => (window.location.href = "profile.html")),
);
Array.from(document.querySelectorAll(".search")).forEach((b) =>
  b.addEventListener("click", () => (window.location.href = "search.html")),
);

document.querySelectorAll("button[data-href]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const href = btn.dataset.href;
    if (href) window.location.href = href;
  });
});
