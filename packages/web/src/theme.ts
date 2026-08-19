// Client-side theme switching, ported from the mdb app: One Dark is the
// bare :root default; every other theme is a `.theme-<name>` class on <html>.
// The choice is persisted to localStorage (server config stays untouched).

export const THEMES = [
  { value: 'one-dark', label: 'One Dark' },
  { value: 'tokyo-night', label: 'Tokyo Night' },
  { value: 'catppuccin-mocha', label: 'Catppuccin Mocha' },
  { value: 'github-dark', label: 'GitHub Dark' },
  { value: 'github-light', label: 'GitHub Light' },
] as const;

export type ThemeName = (typeof THEMES)[number]['value'];

const STORAGE_KEY = 'dume-theme';
const DEFAULT: ThemeName = 'one-dark';

export function getStoredTheme(): ThemeName {
  const stored = localStorage.getItem(STORAGE_KEY);
  return THEMES.some((t) => t.value === stored) ? (stored as ThemeName) : DEFAULT;
}

export function applyTheme(theme: ThemeName): void {
  document.documentElement.className = theme === 'one-dark' ? '' : `theme-${theme}`;
}

export function setTheme(theme: ThemeName): void {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}
