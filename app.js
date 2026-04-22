(function () {
  const prefix = window.__APP_PREFIX__ || "";

  function withPrefix(path) {
    if (!prefix || !path || !path.startsWith("/") || path.startsWith(prefix + "/")) {
      return path;
    }
    return `${prefix}${path}`;
  }

  document.querySelectorAll('a[href^="/"]').forEach((link) => {
    const href = link.getAttribute("href");
    if (href && !href.startsWith("//")) {
      link.setAttribute("href", withPrefix(href));
    }
  });

  document.querySelectorAll('form[action^="/"]').forEach((form) => {
    const action = form.getAttribute("action");
    if (action) {
      form.setAttribute("action", withPrefix(action));
    }
  });

  const root = document.documentElement;
  const themeButton = document.querySelector("[data-theme-toggle]");
  let theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

  function applyTheme(nextTheme) {
    theme = nextTheme;
    root.setAttribute("data-theme", theme);
    if (themeButton) {
      themeButton.querySelector("span").textContent = theme === "dark" ? "☼" : "☾";
      themeButton.setAttribute("aria-label", theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему");
    }
  }

  applyTheme(theme);
  if (themeButton) {
    themeButton.addEventListener("click", () => applyTheme(theme === "dark" ? "light" : "dark"));
  }

  const trainer = document.querySelector(".trainer");
  if (!trainer) return;

  const cards = Array.from(document.querySelectorAll(".study-word-card"));
  const currentText = document.querySelector("[data-card-current]");
  const progress = document.querySelector("[data-study-progress]");
  const completion = document.querySelector("[data-completion]");
  let currentIndex = 0;

  function updateProgress() {
    if (currentText) currentText.textContent = Math.min(currentIndex + 1, cards.length).toString();
    if (progress) progress.style.width = `${Math.round((currentIndex / cards.length) * 100)}%`;
  }

  function showCard(index) {
    cards.forEach((card, cardIndex) => card.classList.toggle("active", cardIndex === index));
    currentIndex = index;
    updateProgress();
  }

  function apiUrl(path) {
    if (prefix) return `${prefix}${path}`;
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts[0] === "port" && parts[1]) {
      return `/${parts[0]}/${parts[1]}${path}`;
    }
    return path;
  }

  async function submitReview(wordId, result) {
    const response = await fetch(apiUrl("/api/review"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word_id: wordId, result }),
    });
    if (!response.ok) {
      throw new Error("Не удалось сохранить результат");
    }
    return response.json();
  }

  cards.forEach((card, index) => {
    const reveal = card.querySelector("[data-reveal]");
    const meaning = card.querySelector("[data-meaning]");
    const resultButtons = Array.from(card.querySelectorAll("[data-result]"));
    const wordId = card.dataset.wordId;

    if (reveal) {
      reveal.addEventListener("click", () => {
        if (meaning) meaning.hidden = false;
        resultButtons.forEach((button) => {
          button.disabled = false;
        });
        reveal.disabled = true;
      });
    }

    resultButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        resultButtons.forEach((item) => {
          item.disabled = true;
        });
        button.textContent = "Сохраняю...";
        try {
          await submitReview(wordId, button.dataset.result);
          const nextIndex = index + 1;
          if (nextIndex < cards.length) {
            showCard(nextIndex);
          } else {
            cards.forEach((item) => item.classList.remove("active"));
            if (progress) progress.style.width = "100%";
            if (completion) {
              completion.hidden = false;
              completion.style.display = "grid";
            }
          }
        } catch (_error) {
          button.textContent = "Ошибка";
          resultButtons.forEach((item) => {
            item.disabled = false;
          });
        }
      });
    });
  });

  showCard(0);
})();
