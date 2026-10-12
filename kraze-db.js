/* ============================================================
   KRAZE · Conexión a Supabase
   © 2026 Erian C.A. — Todos los derechos reservados
   Archivo: js/kraze-db.js
   ============================================================ */

(function () {
  'use strict';

  var URL = 'https://xetqvxuiroalddfzrfzc.supabase.co';
  var KEY = 'sb_publishable_SARKcARFpIESQRUDSxbpig_kdlHrZh3';

  function headers(extra) {
    var h = {
      'apikey': KEY,
      'Authorization': 'Bearer ' + KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
    if (extra) {
      for (var k in extra) {
        if (extra.hasOwnProperty(k)) h[k] = extra[k];
      }
    }
    return h;
  }

  function buildUrl(tabla, filtros) {
    var url = URL + '/rest/v1/' + tabla;
    if (filtros) {
      var params = [];
      for (var k in filtros) {
        if (filtros.hasOwnProperty(k)) {
          params.push(encodeURIComponent(k) + '=' + encodeURIComponent(filtros[k]));
        }
      }
      if (params.length > 0) url += '?' + params.join('&');
    }
    return url;
  }

  function handle(res) {
    if (!res.ok) {
      return res.text().then(function (t) {
        throw new Error('Supabase ' + res.status + ': ' + t.substring(0, 200));
      });
    }
    if (res.status === 204) return null;
    return res.json();
  }

  var db = {
    select: function (tabla, filtros) {
      return fetch(buildUrl(tabla, filtros), { method: 'GET', headers: headers() }).then(handle);
    },
    insert: function (tabla, datos) {
      return fetch(buildUrl(tabla), { method: 'POST', headers: headers(), body: JSON.stringify(datos) }).then(handle);
    },
    update: function (tabla, filtros, datos) {
      return fetch(buildUrl(tabla, filtros), { method: 'PATCH', headers: headers(), body: JSON.stringify(datos) }).then(handle);
    },
    remove: function (tabla, filtros) {
      return fetch(buildUrl(tabla), { method: 'DELETE', headers: headers() }).then(handle);
    }
  };

  var marketplace = {

    /* --- TIENDAS --- */
    tiendas: {
      /* Listar tiendas activas/aprobadas */
      activas: function (limite) {
        return db.select('stores', {
          'status': 'eq.active',
          'select': '*',
          'order': 'rating.desc,created_at.desc',
          'limit': limite || 50
        });
      },

      /* Todas las tiendas (para admin) */
      todas: function (limite) {
        return db.select('stores', {
          'select': '*',
          'order': 'created_at.desc',
          'limit': limite || 100
        });
      },

      /* Por categoría */
      porCategoria: function (cat, limite) {
        return db.select('stores', {
          'status': 'eq.active',
          'category': 'eq.' + cat,
          'select': '*',
          'order': 'rating.desc',
          'limit': limite || 50
        });
      },

      /* Buscar por nombre */
      buscar: function (term) {
        return db.select('stores', {
          'status': 'eq.active',
          'name': 'ilike.*' + term + '*',
          'select': '*',
          'limit': 30
        });
      },

      /* Por id */
      porId: function (id) {
        return db.select('stores', { 'id': 'eq.' + id, 'select': '*' })
          .then(function (l) { return l && l[0] ? l[0] : null; });
      },

      /* Por owner (dueño) */
      porOwner: function (ownerId) {
        return db.select('stores', { 'owner_id': 'eq.' + ownerId, 'select': '*' });
      },

      /* Crear nueva tienda (queda pendiente) */
      crear: function (datos) {
        datos.status = 'pending';
        datos.created_at = new Date().toISOString();
        return db.insert('stores', datos);
      },

      /* Actualizar */
      actualizar: function (id, datos) {
        return db.update('stores', { 'id': 'eq.' + id }, datos);
      }
    },

    /* --- MENUS --- */
    menus: {
      porTienda: function (storeId) {
        return db.select('menus', {
          'store_id': 'eq.' + storeId,
          'select': '*',
          'order': 'sort_order.asc'
        });
      },
      crear: function (datos) {
        datos.created_at = new Date().toISOString();
        return db.insert('menus', datos);
      },
      actualizar: function (id, datos) {
        return db.update('menus', { 'id': 'eq.' + id }, datos);
      },
      eliminar: function (id) {
        return db.remove('menus', { 'id': 'eq.' + id });
      }
    },

    /* --- PLATOS --- */
    platos: {
      porTienda: function (storeId) {
        return db.select('dishes', {
          'store_id': 'eq.' + storeId,
          'available': 'eq.true',
          'select': '*',
          'order': 'sort_order.asc,created_at.desc'
        });
      },
      porMenu: function (menuId) {
        return db.select('dishes', {
          'menu_id': 'eq.' + menuId,
          'available': 'eq.true',
          'select': '*',
          'order': 'sort_order.asc'
        });
      },
      porId: function (id) {
        return db.select('dishes', { 'id': 'eq.' + id, 'select': '*' })
          .then(function (l) { return l && l[0] ? l[0] : null; });
      },
      crear: function (datos) {
        datos.created_at = new Date().toISOString();
        if (typeof datos.available === 'undefined') datos.available = true;
        return db.insert('dishes', datos);
      },
      actualizar: function (id, datos) {
        return db.update('dishes', { 'id': 'eq.' + id }, datos);
      },
      eliminar: function (id) {
        return db.remove('dishes', { 'id': 'eq.' + id });
      }
    },

    /* --- PUBLICIDAD --- */
    publicidad: {
      activas: function () {
        return db.select('ads', {
          'select': '*',
          'order': 'created_at.desc',
          'limit': 20
        });
      }
    },

    /* --- VERIFICACIONES --- */
    verificaciones: {
      porTienda: function (storeId) {
        return db.select('verifications', {
          'store_id': 'eq.' + storeId,
          'select': '*'
        });
      },
      crear: function (datos) {
        datos.created_at = new Date().toISOString();
        return db.insert('verifications', datos);
      }
    }
  };

  var Kraze = window.Kraze = window.Kraze || {};
  Kraze.db = {
    config: { url: URL, anonKey: KEY },
    select: db.select,
    insert: db.insert,
    update: db.update,
    remove: db.remove,
    marketplace: marketplace
  };

  console.log('Kraze DB lista');

})();