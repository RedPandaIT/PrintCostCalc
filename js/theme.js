// Light/dark theme. Loaded in <head> so the saved theme is applied before the
// page paints. Without a saved choice it follows the system setting.
var PPC = window.PPC || {};

PPC.theme = {
  KEY: 'ppc.theme',

  current() {
    try {
      const saved = localStorage.getItem(this.KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) {}
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  },

  apply(theme) {
    document.documentElement.dataset.theme = theme;
    const button = document.getElementById('theme-toggle');
    if (button) button.textContent = theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode';
  },

  // Called once the button exists in the page.
  initToggle() {
    document.getElementById('theme-toggle').addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(this.KEY, next);
      } catch (e) {}
      this.apply(next);
    });
    this.apply(this.current());
  },
};

PPC.theme.apply(PPC.theme.current());
