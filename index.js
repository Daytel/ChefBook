document.addEventListener('DOMContentLoaded', function () {
  // --- Footer: автоподстановка data-href ---
  (function ensureFooterLinks() {
    const footerMap = {
      home: 'index.html',
      profile: 'profile.html',
      'only-about': 'about.html'
    };

    document.querySelectorAll('.site__footer .nav-item').forEach((el) => {
      if (!el.dataset.href) {
        for (const key of Object.keys(footerMap)) {
          if (el.classList.contains(key)) {
            el.dataset.href = footerMap[key];
            break;
          }
        }
      }
    });
  })();

  // --- Всплывающие окна "Состав" ---
  (function ingredientsPopup() {
    const composeButtons = Array.from(document.querySelectorAll('.compose-btn'));
    let openMenu = null;

    function closeOpen() {
      if (openMenu) {
        openMenu.style.display = 'none';
        const btn = openMenu.closest('.recipe-card')?.querySelector('.compose-btn');
        if (btn) btn.setAttribute('aria-expanded', 'false');
        openMenu = null;
      }
    }

    composeButtons.forEach((btn) => {
      btn.addEventListener('click', function (e) {
        // не даём клику всплыть до карточки
        e.stopPropagation();

        const card = btn.closest('.recipe-card');
        const menu = card?.querySelector('.ingredients');
        if (!menu) return;

        if (openMenu && openMenu !== menu) closeOpen();

        const isOpen = menu.style.display === 'block';
        if (isOpen) {
          menu.style.display = 'none';
          btn.setAttribute('aria-expanded', 'false');
          openMenu = null;
        } else {
          menu.style.display = 'block';
          btn.setAttribute('aria-expanded', 'true');
          openMenu = menu;
        }
      });
    });

    // закрыть по клику вне карточки
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.recipe-card')) closeOpen();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeOpen();
    });
  })();

  // --- Навигация: элементы с data-href ---
  (function navablesHandler() {
    function handleNavigationClick(e) {
      const el = e && e.currentTarget ? e.currentTarget : this;
      const href = el.getAttribute('data-href');
      if (!href) return;
      window.location.href = href;
    }

    const navables = Array.from(document.querySelectorAll('[data-href]'));
    navables.forEach((el) => {
      el.addEventListener('click', handleNavigationClick);
      el.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar' || ev.key === 'Space') {
          ev.preventDefault();
          handleNavigationClick.call(el, { currentTarget: el });
        }
      });
    });
  })();

  // --- Навигация по карточке рецепта (клик по карточке открывает рецепт) ---
  (function cardsNavigation() {
    const cards = Array.from(document.querySelectorAll('.recipe-card'));
    if (!cards.length) return;

    cards.forEach((card) => {
      // делаем карточку фокусируемой для доступности
      if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');

      function cardNavigate() {
        const explicitHref = card.getAttribute('data-href');
        if (explicitHref) {
          window.location.href = explicitHref;
          return;
        }
        const id = card.getAttribute('data-id');
        if (id) {
          const url = `recipe.html?id=${encodeURIComponent(id)}`;
          window.location.href = url;
        }
      }

      card.addEventListener('click', function (e) {
        // если кликнули по интерактивному элементу — не навигируем
        if (e.target.closest('button, a, input, textarea, select')) return;
        if (e.target.closest('[data-no-navigate]')) return;
        // защита: кнопка "Состав" уже вызывает stopPropagation, но оставим проверку
        if (e.target.closest('.compose-btn')) return;

        cardNavigate();
      });

      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.key === 'Space') {
          // Если фокус внутри интерактивного элемента — не навигируем
          const active = document.activeElement;
          if (active && (active.tagName === 'BUTTON' || active.tagName === 'A' || active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.closest('[data-no-navigate]'))) {
            return;
          }
          e.preventDefault();
          cardNavigate();
        }
      });
    });
  })();
});