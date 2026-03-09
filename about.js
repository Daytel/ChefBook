// навигация
document.querySelectorAll("button[data-href]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const href = btn.dataset.href;
    if (href) window.location.href = href;
  });
});
document
  .querySelectorAll(".planner")
  .forEach((b) =>
    b.addEventListener("click", () => (window.location.href = "planner.html")),
  );

document.getElementById("contactBtn").addEventListener("click", () => {
  window.location.href = "help.html";
});

document.getElementById("teamMore").addEventListener("click", () => {
  alert(
    "Здесь можно добавить подробные профили участников (ссылка на GitHub, соцсети и т.п.).",
  );
});
