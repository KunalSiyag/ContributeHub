// Kept from earlier releases so saved preferences survive the redesign.
export const THEME_STORAGE_KEY = 'contributehub_theme';

/**
 * Inline, render-blocking script that sets data-theme before first paint.
 * Without a saved choice the theme follows the system (Refero's anti-slop
 * rule: no dark-by-default unless the brief asks for it); "light" and
 * "dark" are explicit choices.
 */
export const themeInitScript = `(function(){var s=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');var d=p==='light'?false:p==='dark'?true:s;document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme',s?'dark':'light');}document.documentElement.setAttribute('data-js','');})();`;
