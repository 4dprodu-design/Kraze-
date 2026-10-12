/* ============================================================
   KRAZE · Navegación Central + Arranque Limpio
   © 2026 Erian C.A. — Todos los derechos reservados
   Archivo: js/nav.js
   Descripción: Sistema de navegación unificado. Maneja rutas,
                rol del usuario, arranque limpio y utilidades
                globales. Todas las páginas lo cargan.
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     SECCIÓN 1 · CONFIGURACIÓN GLOBAL
     ============================================================ */
  const CONFIG = {
    appName:   'Kraze',
    company:   'Erian C.A.',
    version:   '1.0.0',
    homePasajero:      '04-Home-Pasajero.html',
    homeTransportista: '04-Home-Transportista.html',
    splash:    '01-Splash.html',
    login:     '02-Login.html',
    seleccionRol: '03-Seleccion-Rol.html'
  };

  const KEYS = {
    rol:        'kraze_rol',           // 'pasajero' | 'transportista' | null
    user:       'kraze_user',          // objeto con datos del usuario
    viajeActivo:'kraze_viaje_activo',  // viaje en curso
    lastPage:   'kraze_last_page',     // última página visitada
    booted:     'kraze_booted'         // flag de arranque completado
  };

  /* ============================================================
     SECCIÓN 2 · UTILIDADES DE STORAGE
     ============================================================ */
  const Store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : (fallback ?? null);
      } catch (e) { return fallback ?? null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch (e) {}
    },
    clear() {
      try { localStorage.clear(); } catch (e) {}
    }
  };

  /* ============================================================
     SECCIÓN 3 · NAVEGACIÓN
     ============================================================ */
  function irA(url, opciones) {
    if (!url) return;
    const opts = opciones || {};
    if (opts.replace) {
      window.location.replace(url);
    } else {
      window.location.href = url;
    }
  }

  function irInicio() {
    const rol = Store.get(KEYS.rol);
    if (rol === 'transportista') return irA(CONFIG.homeTransportista);
    if (rol === 'pasajero')      return irA(CONFIG.homePasajero);
    return irA(CONFIG.splash);
  }

  function irAtras() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      irInicio();
    }
  }

  /* ============================================================
     SECCIÓN 4 · GESTIÓN DE ROL
     ============================================================ */
  function setRol(rol) {
    if (rol !== 'pasajero' && rol !== 'transportista') {
      console.warn('[Kraze.nav] Rol inválido:', rol);
      return false;
    }
    Store.set(KEYS.rol, rol);
    return true;
  }

  function getRol() {
    return Store.get(KEYS.rol);
  }

  function limpiarRol() {
    Store.remove(KEYS.rol);
  }

  /* ============================================================
     SECCIÓN 5 · ARRANQUE LIMPIO
     Limpia estado residual para que la app siempre arranque
     desde cero (splash). Se llama desde index.html / splash.
     ============================================================ */
  function arranqueLimpio() {
    // Limpiar viaje activo que haya quedado colgado
    Store.remove(KEYS.viajeActivo);

    // Marcar que ya arrancamos
    Store.set(KEYS.booted, true);

    // Disparar evento
    window.dispatchEvent(new CustomEvent('kraze:boot-clean'));
  }

  /* ============================================================
     SECCIÓN 6 · DETECCIÓN DE PÁGINA ACTUAL
     ============================================================ */
  function paginaActual() {
    const path = window.location.pathname;
    const file = path.substring(path.lastIndexOf('/') + 1);
    return file || 'index.html';
  }

  function esPagina(nombre) {
    return paginaActual().toLowerCase() === nombre.toLowerCase();
  }

  /* ============================================================
     SECCIÓN 7 · BLINDAJE DE NAVEGACIÓN
     Evita que el usuario caiga en páginas sin permisos.
     ============================================================ */
  function requiereRol(rolRequerido) {
    const rol = getRol();
    if (rol !== rolRequerido) {
      console.warn('[Kraze.nav] Requiere rol', rolRequerido, '→ redirigiendo');
      irA(CONFIG.seleccionRol);
      return false;
    }
    return true;
  }

  function requiereLogin() {
    const rol = getRol();
    if (!rol) {
      console.warn('[Kraze.nav] Requiere login → redirigiendo');
      irA(CONFIG.login);
      return false;
    }
    return true;
  }

  /* ============================================================
     SECCIÓN 8 · BOTÓN ATRÁS DEL NAVEGADOR (APK)
     ============================================================ */
  function bloquearAtrasEnSplash() {
    if (!esPagina(CONFIG.splash)) return;
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', function () {
      window.history.pushState(null, '', window.location.href);
    });
  }

  /* ============================================================
     SECCIÓN 9 · API PÚBLICA
     ============================================================ */
  const Kraze = window.Kraze = window.Kraze || {};

  Kraze.nav = {
    config:  CONFIG,
    keys:    KEYS,
    store:   Store,
    irA:     irA,
    irInicio: irInicio,
    irAtras: irAtras,
    setRol:  setRol,
    getRol:  getRol,
    limpiarRol: limpiarRol,
    arranqueLimpio: arranqueLimpio,
    paginaActual:   paginaActual,
    esPagina:       esPagina,
    requiereRol:    requiereRol,
    requiereLogin:  requiereLogin
  };

  /* ============================================================
     SECCIÓN 10 · AUTO-INIT
     Detecta si estamos en splash y activa el bloqueo de atrás.
     ============================================================ */
  (function init() {
    bloquearAtrasEnSplash();
  })();

  console.log(
    '%c🛵 Kraze Nav v' + CONFIG.version,
    'color:#D4FF00;background:#111;padding:2px 8px;border-radius:4px;font-weight:bold'
  );
})();