/* ============================================================
   KRAZE · Sistema de Temas Dinámico
   © 2026 Erian C.A. — Todos los derechos reservados
   Archivo: js/theme.js
   Descripción: Lee theme.json, aplica variables CSS y expone
                API pública (Kraze.theme) para cambiar temas.
   ============================================================ */

(function () {
  'use strict';

  const CACHE_KEY   = 'kraze_theme_cache';
  const ACTIVE_KEY  = 'kraze_active_theme';
  const CACHE_HOURS = 6;
  const REMOTE_URL  = 'https://moto-llave-backend.vercel.app/theme.json';
  const LOCAL_URL   = 'theme.json';

  /* --- SECCIÓN: Estado interno --- */
  let config = null;

  /* --- SECCIÓN: Utilidades --- */
  function isCacheValid(cache) {
    if (!cache || !cache.timestamp) return false;
    const age = Date.now() - cache.timestamp;
    return age < (CACHE_HOURS * 3600 * 1000);
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        config: data
      }));
    } catch (e) { /* silencio */ }
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  /* --- SECCIÓN: Carga de configuración --- */
  async function loadConfig() {
    const cache = readCache();
    if (isCacheValid(cache) && cache.config) {
      config = cache.config;
      return config;
    }

    try {
      config = await fetchJSON(REMOTE_URL);
      writeCache(config);
      return config;
    } catch (e) {
      console.warn('[Kraze.theme] Remoto falló, usando local:', e.message);
    }

    try {
      config = await fetchJSON(LOCAL_URL);
      writeCache(config);
      return config;
    } catch (e) {
      console.error('[Kraze.theme] Local también falló:', e.message);
      return null;
    }
  }

  /* --- SECCIÓN: Aplicar tema --- */
  function applyTheme(themeKey) {
    if (!config || !config.themes) return false;

    const theme = config.themes[themeKey] || config.themes[config.activeTheme] || config.themes.default;
    if (!theme || !theme.colors) return false;

    const root = document.documentElement;
    for (const [key, value] of Object.entries(theme.colors)) {
      root.style.setProperty('--' + key, value);
    }

    root.setAttribute('data-theme', themeKey);
    localStorage.setItem(ACTIVE_KEY, themeKey);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme.colors['bg-primary'] || '#FFFFFF');

    window.dispatchEvent(new CustomEvent('kraze:theme-changed', {
      detail: { theme: themeKey, colors: theme.colors }
    }));

    return true;
  }

  /* --- SECCIÓN: API pública --- */
  const Kraze = window.Kraze = window.Kraze || {};

  Kraze.theme = {
    getConfig: () => config,
    list: () => config ? Object.keys(config.themes) : [],
    info: (key) => config && config.themes[key] ? config.themes[key] : null,
    current: () => localStorage.getItem(ACTIVE_KEY) || (config && config.activeTheme) || 'default',

    set: function (key) {
      if (!config || !config.themes[key]) {
        console.warn('[Kraze.theme] Tema inexistente:', key);
        return false;
      }
      return applyTheme(key);
    },

    refresh: async function () {
      localStorage.removeItem(CACHE_KEY);
      await loadConfig();
      return applyTheme(Kraze.theme.current());
    },

    autoSeasonal: function () {
      const now = new Date();
      const m = now.getMonth() + 1;
      const d = now.getDate();

      if (m === 10) return 'halloween';
      if (m === 12) return 'navidad';
      if ((m === 3 && d >= 20) || (m === 4 && d <= 20)) return 'semana-santa';
      if (m >= 6 && m <= 8) return 'verano';

      return 'default';
    }
  };

  /* --- SECCIÓN: Auto-init --- */
  (async function init() {
    await loadConfig();

    const saved = localStorage.getItem(ACTIVE_KEY);
    const finalTheme = saved || (config && config.activeTheme) || 'default';

    applyTheme(finalTheme);
  })();

  console.log('%c🛵 Kraze Theme Engine', 'color:#D4FF00;background:#111;padding:2px 8px;border-radius:4px;font-weight:bold');
})();