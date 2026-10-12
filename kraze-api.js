/* ============================================================
   KRAZE · Cliente de API
   © 2026 Erian C.A. — Todos los derechos reservados
   Archivo: js/kraze-api.js
   Descripción: Cliente único para llamar al backend de Kraze.
                Toda la app usa Kraze.api.* en vez de hacer
                fetch directo a cada endpoint.
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     CONFIGURACIÓN
     ============================================================ */
  var BASE_URL = 'https://moto-llave-backend.vercel.app';

  var CONFIG = {
    timeout: 15000,
    retries: 1,
    cacheConfigMin: 10
  };

  /* ============================================================
     UTILIDADES
     ============================================================ */
  function fetchConTimeout(url, opciones, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var timeout = setTimeout(function () {
        reject(new Error('Tiempo de espera agotado'));
      }, timeoutMs || CONFIG.timeout);

      fetch(url, opciones)
        .then(function (res) {
          clearTimeout(timeout);
          resolve(res);
        })
        .catch(function (err) {
          clearTimeout(timeout);
          reject(err);
        });
    });
  }

  function postJSON(ruta, datos) {
    return fetchConTimeout(BASE_URL + ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos || {})
    })
    .then(function (res) {
      return res.text().then(function (txt) {
        var data;
        try {
          data = JSON.parse(txt);
        } catch (e) {
          throw new Error('Respuesta invalida: ' + txt.substring(0, 150));
        }
        if (!res.ok) {
          throw new Error(data.error || ('HTTP ' + res.status));
        }
        return data;
      });
    });
  }

  function getJSON(ruta) {
    return fetchConTimeout(BASE_URL + ruta, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  /* ============================================================
     CACHÉ LOCAL DE CONFIG
     ============================================================ */
  var CACHE_KEY = 'kraze_api_config_cache';

  function leerCacheConfig() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (!c.timestamp || (Date.now() - c.timestamp) > (CONFIG.cacheConfigMin * 60000)) {
        return null;
      }
      return c.data;
    } catch (e) { return null; }
  }

  function guardarCacheConfig(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: data
      }));
    } catch (e) {}
  }

  /* ============================================================
     MÓDULOS
     ============================================================ */

  /* --- Configuración pública --- */
  var config = {
    /* Trae la config del backend (con caché 10 min) */
    obtener: function () {
      var cache = leerCacheConfig();
      if (cache) return Promise.resolve(cache);

      return getJSON('/api/config-publica')
        .then(function (data) {
          guardarCacheConfig(data);
          return data;
        });
    },

    /* Fuerza recargar sin caché */
    refrescar: function () {
      try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
      return config.obtener();
    }
  };

  /* --- Viajes --- */
  var viaje = {
    /* Cotizar viaje (precio viene del servidor) */
    cotizar: function (datos) {
      /* datos: { origen: {lat,lng}, destino: {lat,lng}, categoria, extras } */
      return postJSON('/api/viaje/cotizar', datos);
    },

    /* Estimar tiempo de llegada */
    estimarTiempo: function (datos) {
      return postJSON('/api/viaje/cotizar', datos)
        .then(function (r) {
          return {
            minutos: r.tiempoEstimadoMin || 15,
            distanciaKm: r.distanciaKm || 0
          };
        });
    }
  };

  /* --- Pedidos --- */
  var pedido = {
    /* Validar un pedido antes de guardarlo */
    validar: function (datos) {
      /* datos: { store_id, items: [...], total } */
      return postJSON('/api/pedido/validar', datos);
    },

    /* Confirmar pedido (después de validar) */
    crear: function (datos) {
      return pedido.validar(datos).then(function (validacion) {
        if (!validacion.ok) {
          throw new Error(validacion.error || 'Pedido no valido');
        }

        /* Si pasa validación, guardar en Supabase desde el cliente
           (temporalmente hasta que el backend tenga acceso completo) */
        if (window.Kraze && Kraze.db) {
          return Kraze.db.insert('orders', datos)
            .then(function (resultado) {
              return { ok: true, pedido: resultado, validacion: validacion };
            });
        }
        throw new Error('Base de datos no disponible');
      });
    }
  };

  /* --- Asistente Eri --- */
  var eri = {
    /* Preguntar a Eri */
    preguntar: function (texto, contexto) {
      return postJSON('/api/claude', {
        texto: texto,
        contexto: contexto || ''
      });
    }
  };
  /* ============================================================
     SALUD DEL BACKEND
     ============================================================ */
  function ping() {
    return getJSON('/api/config-publica')
      .then(function () { return { ok: true, mensaje: 'Backend disponible' }; })
      .catch(function (e) { return { ok: false, error: e.message }; });
  }

  /* ============================================================
     API PÚBLICA
     ============================================================ */
  var Kraze = window.Kraze = window.Kraze || {};

  Kraze.api = {
    base: BASE_URL,

    /* Módulos */
    config: config,
    viaje:  viaje,
    pedido: pedido,
    eri:    eri,

    /* Utilidades */
    ping:   ping,
    post:   postJSON,
    get:    getJSON
  };

  console.log(
    '%cKraze API lista',
    'color:#FFFFFF;background:#1A1F2E;padding:2px 8px;border-radius:4px;font-weight:bold'
  );

})();