(() => {
  const preferenceKey = "pad-ratnakar-info-language";
  const valid = (value) => value === "hi" || value === "en";
  let saved;
  try { saved = localStorage.getItem(preferenceKey); } catch { /* Optional. */ }
  const requested = new URL(location.href).searchParams.get("lang");
  const initial = valid(requested) ? requested : valid(saved) ? saved : "hi";
  function selectLanguage(language) {
    document.documentElement.lang = language;
    document.querySelectorAll("[data-language]").forEach((panel) => {
      panel.hidden = panel.dataset.language !== language;
      if (!panel.hidden) document.title = panel.dataset.title;
    });
    document.querySelectorAll("[data-set-language]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.setLanguage === language));
    });
    document.querySelectorAll("[data-language-link]").forEach((link) => {
      const url = new URL(link.href);
      url.searchParams.set("lang", language);
      link.href = url.href;
    });
    const url = new URL(location.href);
    url.searchParams.set("lang", language);
    history.replaceState(history.state, "", url);
    try { localStorage.setItem(preferenceKey, language); } catch { /* Reading still works. */ }
  }
  document.querySelectorAll("[data-set-language]").forEach((button) => {
    button.addEventListener("click", () => selectLanguage(button.dataset.setLanguage));
  });
  selectLanguage(initial);
  document.querySelector(".language-switch").hidden = false;
})();
