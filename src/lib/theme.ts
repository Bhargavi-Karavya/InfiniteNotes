/**
 * Inline theme boot script — prevents flash of wrong theme before hydration.
 * Must stay tiny and sync; reads localStorage + system preference.
 */
export const THEME_STORAGE_KEY = "infinitenotes-theme";

export const themeBootScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=localStorage.getItem(k);var t=s==='light'||s==='dark'?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var d=document.documentElement;d.dataset.theme=t;d.classList.toggle('dark',t==='dark');}catch(e){}})();`;
