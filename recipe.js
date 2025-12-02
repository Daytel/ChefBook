(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    /* Навигация */
    document.querySelectorAll("button[data-href]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const href = btn.dataset.href;
        if (href) window.location.href = href;
      });
    });

    const authorReviewsBtn = document.getElementById("authorReviewsBtn");
    if (authorReviewsBtn) {
      authorReviewsBtn.addEventListener("click", function () {
        window.location.href = "reviews.html";
      });
    }

    /* Комментарии */
    function escapeHtml(s) {
      return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }

    const postBtn = document.getElementById("postCommentBtn");
    if (postBtn) {
      postBtn.addEventListener("click", function () {
        const box = document.getElementById("commentBox");
        const list = document.getElementById("commentList");
        if (!box || !list) return;
        const v = box.value.trim();
        if (!v) return alert("Введите комментарий");
        const p = document.createElement("p");
        p.innerHTML = "<strong>Вы:</strong> " + escapeHtml(v);
        list.prepend(p);
        box.value = "";
      });
    }

    /* Сохранение рецепта (сердечко) */
    (function setupFavorite() {
      const recipeId = "tortilla-airgrill"; // уникальный ID рецепта
      const savedRecipes = JSON.parse(localStorage.getItem("savedRecipes") || "[]");

      // Создаём кнопку
      const heartBtn = document.createElement("button");
      heartBtn.className = "btn-heart";
      heartBtn.type = "button";
      heartBtn.setAttribute("aria-label", "Сохранить рецепт");
      heartBtn.innerHTML = savedRecipes.includes(recipeId)
        ? "❤️"
        : "🤍";

      // Стили кнопки (можно вынести в CSS)
      heartBtn.style.fontSize = "28px";
      heartBtn.style.border = "none";
      heartBtn.style.background = "transparent";
      heartBtn.style.cursor = "pointer";
      heartBtn.style.marginLeft = "8px";

      // Добавляем кнопку рядом с заголовком рецепта
      const title = document.querySelector(".recipe-title");
      if (title) title.appendChild(heartBtn);

      function toggleFavorite() {
        let recipes = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
        if (recipes.includes(recipeId)) {
          recipes = recipes.filter((id) => id !== recipeId);
          heartBtn.innerHTML = "🤍";
        } else {
          recipes.push(recipeId);
          heartBtn.innerHTML = "❤️";
        }
        localStorage.setItem("savedRecipes", JSON.stringify(recipes));
      }

      heartBtn.addEventListener("click", toggleFavorite);
    })();

    /* Карусель */
    (function setupCarousel() {
      const carousel = document.getElementById("recipeCarousel");
      if (!carousel) return;

      const mainImg = document.getElementById("carouselImage");
      const thumbs = Array.from(
        carousel.querySelectorAll(".carousel-thumbs img")
      );
      const prevBtn = document.getElementById("carouselPrev");
      const nextBtn = document.getElementById("carouselNext");
      const mainWrapper = document.getElementById("carouselMainWrapper");

      if (!mainImg || !thumbs.length) return;

      // Список больших изображений (data-src предпочтительнее)
      const images = thumbs.map((t) => t.dataset.src || t.src);

      // Начальный индекс — по aria-current
      let currentIndex = thumbs.findIndex(
        (t) => t.getAttribute("aria-current") === "true"
      );
      if (currentIndex === -1) currentIndex = 0;

      // Показать слайд
      function showSlide(index, opts = {}) {
        if (!images.length) return;
        if (index < 0) index = images.length - 1;
        if (index >= images.length) index = 0;
        currentIndex = index;

        const src = images[currentIndex];
        const alt = thumbs[currentIndex].alt || "";

        // Подменяем главное изображение
        mainImg.src = src;
        mainImg.alt = alt;

        // Обновляем aria-label контейнера (полезно для скринридеров)
        if (mainWrapper)
          mainWrapper.setAttribute("aria-label", "Просмотр — " + alt);

        // Обновляем миниатюры
        thumbs.forEach((t, i) => {
          if (i === currentIndex) t.setAttribute("aria-current", "true");
          else t.removeAttribute("aria-current");
        });

        if (opts.updateFocus) {
          try {
            mainImg.focus({ preventScroll: true });
          } catch (e) {
            mainImg.focus();
          }
        }
      }

      // Кнопки prev/next
      if (prevBtn)
        prevBtn.addEventListener("click", () => showSlide(currentIndex - 1));
      if (nextBtn)
        nextBtn.addEventListener("click", () => showSlide(currentIndex + 1));

      // Миниатюры: click + клавиатура
      thumbs.forEach((t, i) => {
        if (t.tabIndex === undefined || t.tabIndex === -1) t.tabIndex = 0;
        t.addEventListener("click", () => showSlide(i));
        t.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            showSlide(i);
          }
        });
      });

      // Клавиши стрелок при фокусе внутри карусели
      carousel.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          showSlide(currentIndex - 1);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          showSlide(currentIndex + 1);
        }
      });

      // Свайп (touch)
      let touchStartX = null;
      mainImg.addEventListener(
        "touchstart",
        (e) => {
          if (e.touches && e.touches.length === 1)
            touchStartX = e.touches[0].clientX;
        },
        { passive: true }
      );

      mainImg.addEventListener("touchend", (e) => {
        if (touchStartX == null) return;
        const endX = (e.changedTouches && e.changedTouches[0].clientX) || 0;
        const diff = touchStartX - endX;
        if (Math.abs(diff) > 30) {
          if (diff > 0) showSlide(currentIndex + 1);
          else showSlide(currentIndex - 1);
        }
        touchStartX = null;
      });

      // Лайтбокс
      function openLightbox(index) {
        index = typeof index === "number" ? index : currentIndex;
        const overlay = document.createElement("div");
        overlay.className = "lightbox";
        overlay.tabIndex = -1; // чтобы можно было слушать клавиши

        const closeBtn = document.createElement("button");
        closeBtn.className = "close-btn";
        closeBtn.type = "button";
        closeBtn.setAttribute("aria-label", "Закрыть (Esc)");
        closeBtn.textContent = "✕";

        const img = document.createElement("img");
        img.alt = thumbs[index].alt || "";
        img.src = images[index];

        overlay.appendChild(closeBtn);
        overlay.appendChild(img);
        document.body.appendChild(overlay);

        closeBtn.focus();

        function closeLightbox() {
          document.removeEventListener("keydown", onDocumentKey);
          overlay.remove();
          try {
            (document.activeElement || mainImg).focus();
          } catch (e) {}
        }

        function onDocumentKey(e) {
          if (e.key === "Escape") closeLightbox();
          if (e.key === "ArrowLeft") {
            showSlide(currentIndex - 1);
            img.src = images[currentIndex];
          }
          if (e.key === "ArrowRight") {
            showSlide(currentIndex + 1);
            img.src = images[currentIndex];
          }
        }

        overlay.addEventListener("click", (ev) => {
          if (ev.target === overlay) closeLightbox();
        });

        closeBtn.addEventListener("click", closeLightbox);
        document.addEventListener("keydown", onDocumentKey);

        // Свайп в лайтбоксе
        let lbStartX = null;
        img.addEventListener(
          "touchstart",
          (e) => {
            if (e.touches && e.touches.length === 1)
              lbStartX = e.touches[0].clientX;
          },
          { passive: true }
        );
        img.addEventListener("touchend", (e) => {
          if (lbStartX == null) return;
          const endX = (e.changedTouches && e.changedTouches[0].clientX) || 0;
          const diff = lbStartX - endX;
          if (Math.abs(diff) > 30) {
            if (diff > 0) {
              showSlide(currentIndex + 1);
              img.src = images[currentIndex];
            } else {
              showSlide(currentIndex - 1);
              img.src = images[currentIndex];
            }
          }
          lbStartX = null;
        });
      }

      mainImg.addEventListener("click", () => openLightbox(currentIndex));

      showSlide(currentIndex);

      function preloadNearby() {
        if (!images.length) return;
        const next = (currentIndex + 1) % images.length;
        const prev = (currentIndex - 1 + images.length) % images.length;
        [next, prev].forEach((i) => {
          const im = new Image();
          im.src = images[i];
        });
      }

      const originalShow = showSlide;
      showSlide = function (index, opts) {
        originalShow(index, opts);
        preloadNearby();
      };
    })();
  });
})();
