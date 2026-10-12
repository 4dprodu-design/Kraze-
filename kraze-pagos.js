/* ============================================================
   KRAZE · Motor de Pagos
   © 2026 Erian C.A. — Todos los derechos reservados
   Archivo: js/kraze-pagos.js
   Descripción: Capa de abstracción de pagos. Por ahora funciona
                en modo SIMULADO. Cuando conectemos pasarelas
                reales (Venepagos, COBRO, etc.) solo hay que
                reemplazar los adaptadores sin tocar el resto.
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     CONFIGURACIÓN
     ============================================================ */
  var CONFIG = {
    /* Modo actual: 'simulado' | 'venepagos' | 'cobro' | 'vexpay' */
    proveedorActivo: 'simulado',

    /* Moneda por defecto del sistema */
    monedaDefault: 'USD',

    /* Monedas soportadas */
    monedas: {
      USD: { simbolo: '$', nombre: 'Dólares' },
      VES: { simbolo: 'Bs.', nombre: 'Bolívares' },
      USDT: { simbolo: '₮', nombre: 'USDT (cripto)' }
    },

    /* Métodos de pago que vamos a soportar */
    metodos: {
      efectivo:     { nombre: 'Efectivo',         icono: '💵', activo: true,  proveedor: null },
      pago_movil:   { nombre: 'Pago Móvil',       icono: '📱', activo: true,  proveedor: 'venepagos' },
      transferencia:{ nombre: 'Transferencia',    icono: '🏦', activo: true,  proveedor: 'venepagos' },
      zelle:        { nombre: 'Zelle',            icono: '💸', activo: true,  proveedor: 'cobro' },
      usdt:         { nombre: 'USDT',             icono: '₮',  activo: true,  proveedor: 'cobro' },
      tarjeta:      { nombre: 'Tarjeta',          icono: '💳', activo: false, proveedor: 'cobro' }
    }
  };

  /* ============================================================
     ADAPTADORES DE PAGO
     Cada uno se encarga de un proveedor distinto. Ahora mismo
     el "simulado" es el único activo. Los demás son plantillas
     listas para llenar cuando tengamos las API keys.
     ============================================================ */

  /* --- Adaptador SIMULADO (modo actual) --- */
  var adaptadorSimulado = {
    nombre: 'simulado',

    /* Inicia un pago. Devuelve una promesa con el resultado. */
    iniciar: function (datos) {
      return new Promise(function (resolve) {
        console.log('[Kraze.pagos/simulado] Pago iniciado:', datos);

        /* Aquí es donde en el futuro se abriría el checkout real.
           Por ahora solo simulamos que queda pendiente. */
        setTimeout(function () {
          resolve({
            estado: 'pendiente',
            metodo: datos.metodo || 'efectivo',
            monto: datos.monto,
            moneda: datos.moneda || CONFIG.monedaDefault,
            referencia: 'SIM_' + Date.now(),
            mensaje: 'Pago pendiente de confirmación manual.'
          });
        }, 600);
      });
    },

    /* Verifica el estado de un pago (para webhooks futuros) */
    verificar: function (referencia) {
      return Promise.resolve({
        referencia: referencia,
        estado: 'pendiente'
      });
    },

    /* Cancela un pago */
    cancelar: function (referencia) {
      return Promise.resolve({ referencia: referencia, estado: 'cancelado' });
    }
  };

  /* --- Adaptador VENEPAGOS (plantilla, aún no activo) --- */
  var adaptadorVenepagos = {
    nombre: 'venepagos',

    iniciar: function (datos) {
      /* TODO: cuando tengamos las credenciales, hacer:
         const venepagos = require('venepagos');
         const cliente = new venepagos({ apiKey: '...' });
         return cliente.crearPago({ monto, moneda, ... }); */
      return Promise.reject(new Error('Venepagos no está configurado aún'));
    },

    verificar: function () {
      return Promise.reject(new Error('Venepagos no está configurado aún'));
    },

    cancelar: function () {
      return Promise.reject(new Error('Venepagos no está configurado aún'));
    }
  };

  /* --- Adaptador COBRO (plantilla, aún no activo) --- */
  var adaptadorCobro = {
    nombre: 'cobro',

    iniciar: function (datos) {
      /* TODO: cuando tengamos las credenciales, llamar a la API de COBRO */
      return Promise.reject(new Error('COBRO no está configurado aún'));
    },

    verificar: function () {
      return Promise.reject(new Error('COBRO no está configurado aún'));
    },

    cancelar: function () {
      return Promise.reject(new Error('COBRO no está configurado aún'));
    }
  };

  /* --- Mapa de adaptadores disponibles --- */
  var adaptadores = {
    'simulado':  adaptadorSimulado,
    'venepagos': adaptadorVenepagos,
    'cobro':     adaptadorCobro
  };

  /* ============================================================
     REGISTRO DE PAGOS
     Guarda cada intento de pago en localStorage (historial).
     En el futuro esto vendrá de Supabase.
     ============================================================ */
  var STORAGE_KEY = 'kraze_pagos_historial';

  function guardarEnHistorial(pago) {
    try {
      var historial = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      historial.push(pago);
      /* Limitar a los últimos 200 pagos */
      if (historial.length > 200) {
        historial = historial.slice(-200);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(historial));
    } catch (e) {
      console.warn('[Kraze.pagos] No se pudo guardar historial:', e);
    }
  }

  function leerHistorial() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  /* ============================================================
     API PÚBLICA
     ============================================================ */
  var pagos = {

    /* --- Iniciar un pago --- */
    iniciar: function (datos) {
      var proveedor = CONFIG.proveedorActivo;
      var adaptador = adaptadores[proveedor];

      if (!adaptador) {
        return Promise.reject(new Error('Proveedor de pago no encontrado: ' + proveedor));
      }

      if (!datos || !datos.monto || datos.monto <= 0) {
        return Promise.reject(new Error('Monto inválido'));
      }

      var pago = {
        id: 'pago_' + Date.now(),
        concepto: datos.concepto || 'Pago',
        monto: parseFloat(datos.monto),
        moneda: datos.moneda || CONFIG.monedaDefault,
        metodo: datos.metodo || 'efectivo',
        proveedor: proveedor,
        estado: 'iniciando',
        creada: new Date().toISOString(),
        pedido: datos.pedido || null
      };

      return adaptador.iniciar(pago)
        .then(function (resultado) {
          pago.estado = resultado.estado;
          pago.referencia = resultado.referencia;
          pago.mensaje = resultado.mensaje;
          guardarEnHistorial(pago);
          return pago;
        });
    },

    /* --- Ver estado de un pago --- */
    verificar: function (referencia) {
      var adaptador = adaptadores[CONFIG.proveedorActivo];
      if (!adaptador) {
        return Promise.reject(new Error('Proveedor no disponible'));
      }
      return adaptador.verificar(referencia);
    },

    /* --- Cancelar un pago --- */
    cancelar: function (referencia) {
      var adaptador = adaptadores[CONFIG.proveedorActivo];
      if (!adaptador) {
        return Promise.reject(new Error('Proveedor no disponible'));
      }
      return adaptador.cancelar(referencia);
    },

    /* --- Listar métodos disponibles --- */
    metodosDisponibles: function () {
      var lista = [];
      for (var k in CONFIG.metodos) {
        if (CONFIG.metodos.hasOwnProperty(k) && CONFIG.metodos[k].activo) {
          lista.push({
            id: k,
            nombre: CONFIG.metodos[k].nombre,
            icono: CONFIG.metodos[k].icono
          });
        }
      }
      return lista;
    },

    /* --- Cambiar proveedor activo --- */
    setProveedor: function (nombre) {
      if (!adaptadores[nombre]) {
        console.warn('[Kraze.pagos] Proveedor inexistente:', nombre);
        return false;
      }
      CONFIG.proveedorActivo = nombre;
      console.log('[Kraze.pagos] Proveedor activo:', nombre);
      return true;
    },

    /* --- Historial de pagos --- */
    historial: leerHistorial,

    /* --- Configuración (lectura) --- */
    config: CONFIG,

    /* --- Formatear precio --- */
    formato: function (monto, moneda) {
      var m = moneda || CONFIG.monedaDefault;
      var info = CONFIG.monedas[m] || CONFIG.monedas.USD;
      var num = parseFloat(monto) || 0;
      return info.simbolo + ' ' + num.toFixed(2);
    }
  };

  /* ============================================================
     EXPORTAR
     ============================================================ */
  var Kraze = window.Kraze = window.Kraze || {};
  Kraze.pagos = pagos;

  console.log('Kraze Pagos lista · proveedor:', CONFIG.proveedorActivo);

})();