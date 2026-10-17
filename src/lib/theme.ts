// Public-site light/dark theme. The colors themselves live in app.css as CSS
// variables keyed off data-theme on <html>; this just flips the attribute and
// remembers the choice. app.html applies the saved value before first paint.

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'feed-theme';

export function getTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function setTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // storage unavailable (private mode etc.) — theme still applies for this page
  }
}
