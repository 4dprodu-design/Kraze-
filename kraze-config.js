/* ============================================================
   KRAZE · Motor de Configuración Central
   © 2026 Erian C.A. — Todos los derechos reservados
   Archivo: js/kraze-config.js
   Descripción: Lee kraze-config.json y lo expone como
                Kraze.config. Cachea 6 horas. Fallback local
                si no hay internet. Todo lo configurable de la
                app vive aquí.
   ============================================================ */

(function () {
  'use strict';

  var CACHE_KEY   = 'kraze_config_cache';
  var CACHE_HOURS = 6;
  var REMOTE_URL  = 'https://moto-llave-backend.vercel.app/kraze-config.json';
  var LOCAL_URL   = 'kraze-config.json';

  var config = null;

  /* ============================================================
     UTILIDADES
     ============================================================ */
  function isCacheValid(cache) {
    if (!cache || !cache.timestamp) return false;
    var age = Date.now() - cache.timestamp;
    return age < (CACHE_HOURS * 3600 * 1000);
  }

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        config: data
      }));
    } catch (e) {}
  }

  function fetchJSON(url) {
    return fetch(url, { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      });
  }

  /* ============================================================
     CARGAR CONFIGURACIÓN
     ============================================================ */
  function loadConfig() {
    /* 1. Cache fresca */
    var cache = readCache();
    if (isCacheValid(cache) && cache.config) {
      config = cache.config;
      return Promise.resolve(config);
    }

    /* 2. Remoto */
    return fetchJSON(REMOTE_URL)
      .then(function (data) {
        config = data;
        writeCache(config);
        return config;
      })
      .catch(function () {
        /* 3. Local */
        return fetchJSON(LOCAL_URL)
          .then(function (data) {
            config = data;
            writeCache(config);
            return config;
          })
          .catch(function () {
            console.warn('[Kraze.config] No se pudo cargar config, usando fallback');
            config = FALLBACK;
            return config;
          });
      });
  }

  /* ============================================================
     FALLBACK (si todo falla)
     ============================================================ */
  var FALLBACK = {
    appName: 'Kraze',
    empresa: 'Erian C.A.',
    soporte: { telefono: '+58 412 149 9545' },
    viajes: {
      activo: true,
      categorias: {
        economica: { nombre: 'Economica', precioBase: 2.00 },
        estandar:  { nombre: 'Estandar',  precioBase: 4.00 },
        premium:   { nombre: 'Premium',   precioBase: 6.00 }
      },
      comision: { base: 10 }
    },
    features: {
      marketplace: true,
      delivery: true,
      publicidad: true
    },
    mensajes: {
      errorGeneral: 'Algo salio mal. Intenta de nuevo.'
    }
  };

  /* ============================================================
     API DE ACCESO
     ============================================================ */

  /* Lee una ruta tipo 'viajes.categorias.economica.precioBase' */
  function get(ruta, porDefecto) {
    if (!config) return porDefecto;
    var partes = ruta.split('.');
    var actual = config;
    for (var i = 0; i < partes.length; i++) {
      if (actual === null || actual === undefined) return porDefecto;
      actual = actual[partes[i]];
    }
    return (actual === undefined) ? porDefecto : actual;
  }

  /* Verifica si una feature está activa */
  function feature(nombre) {
    var val = get('features.' + nombre, false);
    return val === true;
  }

  /* Devuelve todos los métodos de pago activos */
  function metodosPago() {
    var metodos = get('pagos.metodos', {});
    var activos = [];
    for (var k in metodos) {
      if (metodos.hasOwnProperty(k) && metodos[k].activo) {
        activos.push({
          id: k,
          nombre: metodos[k].nombre,
          icono: metodos[k].icono
        });
      }
    }
    return activos;
  }

  /* Devuelve todos los vehículos activos */
  function vehiculosActivos() {
    var lista = get('vehiculos.lista', {});
    var activos = [];
    for (var k in lista) {
      if (lista.hasOwnProperty(k) && lista[k].activo) {
        activos.push({
          id: k,
          nombre: lista[k].nombre,
          icono: lista[k].icono
        });
      }
    }
    return activos;
  }

  /* Devuelve categorías de marketplace activas */
  function categoriasMarketplace() {
    var cats = get('marketplace.categorias', {});
    var activas = [];
    for (var k in cats) {
      if (cats.hasOwnProperty(k) && cats[k].activo) {
        activas.push({
          id: k,
          nombre: cats[k].nombre
        });
      }
    }
    return activas;
  }

  /* Devuelve un mensaje configurado */
  function mensaje(clave) {
    return get('mensajes.' + clave, '');
  }

  /* Soporte (teléfono, whatsapp, email) */
  function soporte() {
    return get('soporte', {});
  }

  /* Formato de precio según moneda base */
  function precio(monto, moneda) {
    var simbolos = get('monedas.simbolos', { USD: '$', VES: 'Bs.', USDT: '₮' });
    var m = moneda || get('monedas.base', 'USD');
    var sim = simbolos[m] || '$';
    var num = parseFloat(monto) || 0;
    return sim + num.toFixed(2);
  }
  /* ============================================================
     RECARGAR (para actualizar sin reiniciar la app)
     ============================================================ */
  function refresh() {
    localStorage.removeItem(CACHE_KEY);
    return loadConfig();
  }

  /* ============================================================
     API PÚBLICA
     ============================================================ */
  var Kraze = window.Kraze = window.Kraze || {};

  Kraze.config = {
    /* Carga y estado */
    ready: function () { return config !== null; },
    load:  loadConfig,
    refresh: refresh,

    /* Lectura */
    get:     get,
    feature: feature,

    /* Helpers específicos */
    metodosPago:          metodosPago,
    vehiculosActivos:     vehiculosActivos,
    categoriasMarketplace: categoriasMarketplace,
    mensaje:              mensaje,
    soporte:              soporte,
    precio:               precio,

    /* Acceso directo al objeto crudo (por si se necesita algo que no esté en helpers) */
    raw: function () { return config; }
  };

  /* ============================================================
     AUTO-INIT
     ============================================================ */
  loadConfig().then(function () {
    console.log(
      '%cKraze Config lista · v' + (config.version || '?'),
      'color:#1A1F2E;background:#A4D65E;padding:2px 8px;border-radius:4px;font-weight:bold'
    );
  });

})();