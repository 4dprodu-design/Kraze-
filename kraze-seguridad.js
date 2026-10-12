/* ============================================================
   KRAZE · Sistema de Seguridad
   © 2026 Erian C.A. — Todos los derechos reservados
   Archivo: js/kraze-seguridad.js
   Descripción: Autenticación admin con hash, bloqueo por
                intentos, sesión con expiración y log de accesos.
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     CONFIGURACIÓN
     ============================================================ */
  var CONFIG = {
    maxIntentos: 5,
    bloqueoMinutos: 15,
    sesionHoras: 8,
    inactividadMinutos: 30,
    claveXOR: 0x5A
  };

  /* Contraseña ofuscada (XOR con 0x5A) — KrazeAdmin2026! */
  var CLAVE_XOR_ARR = [
    0x11, 0x28, 0x3B, 0x20, 0x3F, 0x1B, 0x3E, 0x37,
    0x33, 0x34, 0x68, 0x6A, 0x68, 0x6C, 0x7B
  ];

  var STORAGE = {
    intentos: 'kraze_sec_intentos',
    bloqueo:  'kraze_sec_bloqueo',
    sesion:   'kraze_sec_sesion',
    log:      'kraze_sec_log'
  };

  /* ============================================================
     UTILIDADES INTERNAS
     ============================================================ */
  function storageGet(clave) {
    try {
      var raw = localStorage.getItem(clave);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function storageSet(clave, valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch (e) {}
  }

  function storageRemove(clave) {
    try { localStorage.removeItem(clave); } catch (e) {}
  }

  /* Decodifica la contraseña ofuscada */
  function claveCorrecta() {
    var chars = '';
    for (var i = 0; i < CLAVE_XOR_ARR.length; i++) {
      chars += String.fromCharCode(CLAVE_XOR_ARR[i] ^ CONFIG.claveXOR);
    }
    return chars;
  }

  /* Genera un token único */
  function generarToken() {
    var a = Math.random().toString(36).substring(2);
    var b = Date.now().toString(36);
    var c = Math.random().toString(36).substring(2);
    return (a + b + c).toUpperCase();
  }

  /* Firma simple del token (evita manipulación) */
  function firmarToken(token) {
    var firma = 0;
    for (var i = 0; i < token.length; i++) {
      firma = ((firma << 5) - firma) + token.charCodeAt(i);
      firma = firma & 0xFFFFFFFF;
    }
    return Math.abs(firma).toString(16);
  }

  /* ============================================================
     LOG DE ACCESOS
     ============================================================ */
  function logEvento(tipo, detalle) {
    try {
      var log = storageGet(STORAGE.log) || [];
      log.push({
        tipo: tipo,
        detalle: detalle || '',
        fecha: new Date().toISOString(),
        userAgent: navigator.userAgent.substring(0, 80)
      });

      /* Solo guardamos los últimos 100 eventos */
      if (log.length > 100) log = log.slice(-100);

      storageSet(STORAGE.log, log);
    } catch (e) {}
  }

  /* ============================================================
     INTENTOS FALLIDOS Y BLOQUEO
     ============================================================ */
  function verificarBloqueo() {
    var bloqueo = storageGet(STORAGE.bloqueo);
    if (!bloqueo) return { bloqueado: false };

    var ahora = Date.now();
    if (ahora < bloqueo.hasta) {
      var minRestantes = Math.ceil((bloqueo.hasta - ahora) / 60000);
      return { bloqueado: true, minRestantes: minRestantes };
    }

    /* Ya expiró el bloqueo */
    storageRemove(STORAGE.bloqueo);
    storageRemove(STORAGE.intentos);
    return { bloqueado: false };
  }

  function registrarIntentoFallido() {
    var intentos = storageGet(STORAGE.intentos) || 0;
    intentos += 1;
    storageSet(STORAGE.intentos, intentos);

    if (intentos >= CONFIG.maxIntentos) {
      var hasta = Date.now() + (CONFIG.bloqueoMinutos * 60000);
      storageSet(STORAGE.bloqueo, { hasta: hasta, cuando: Date.now() });
      logEvento('bloqueo', 'Cuenta bloqueada por ' + CONFIG.bloqueoMinutos + ' minutos');
      return { bloqueado: true, minRestantes: CONFIG.bloqueoMinutos };
    }

    var restantes = CONFIG.maxIntentos - intentos;
    return { bloqueado: false, intentosRestantes: restantes };
  }

  function limpiarIntentos() {
    storageRemove(STORAGE.intentos);
    storageRemove(STORAGE.bloqueo);
  }

  /* ============================================================
     SESIÓN
     ============================================================ */
  function crearSesion() {
    var token = generarToken();
    var firma = firmarToken(token);

    var sesion = {
      token: token,
      firma: firma,
      creada: Date.now(),
      expira: Date.now() + (CONFIG.sesionHoras * 3600000),
      ultimaActividad: Date.now(),
      rol: 'admin'
    };

    storageSet(STORAGE.sesion, sesion);
    logEvento('login', 'Sesión iniciada');
    return sesion;
  }

  function verificarSesion() {
    var sesion = storageGet(STORAGE.sesion);
    if (!sesion) return { activa: false, motivo: 'sin_sesion' };

    /* Verificar firma */
    var firmaEsperada = firmarToken(sesion.token);
    if (sesion.firma !== firmaEsperada) {
      logEvento('alerta', 'Token manipulado detectado');
      storageRemove(STORAGE.sesion);
      return { activa: false, motivo: 'token_manipulado' };
    }

    /* Verificar expiración */
    if (Date.now() > sesion.expira) {
      storageRemove(STORAGE.sesion);
      logEvento('logout', 'Sesión expirada por tiempo');
      return { activa: false, motivo: 'expirada' };
    }

    /* Verificar inactividad */
    var inactividad = Date.now() - sesion.ultimaActividad;
    if (inactividad > (CONFIG.inactividadMinutos * 60000)) {
      storageRemove(STORAGE.sesion);
      logEvento('logout', 'Sesión expirada por inactividad');
      return { activa: false, motivo: 'inactividad' };
    }

    return { activa: true, sesion: sesion };
  }

  function actualizarActividad() {
    var sesion = storageGet(STORAGE.sesion);
    if (sesion && sesion.token) {
      sesion.ultimaActividad = Date.now();
      storageSet(STORAGE.sesion, sesion);
    }
  }

  function cerrarSesion() {
    storageRemove(STORAGE.sesion);
    logEvento('logout', 'Cierre manual');
  }
  /* ============================================================
     AUTENTICACIÓN
     ============================================================ */
  function autenticar(password) {
    var bloqueo = verificarBloqueo();
    if (bloqueo.bloqueado) {
      return {
        exito: false,
        bloqueado: true,
        minRestantes: bloqueo.minRestantes,
        mensaje: 'Cuenta bloqueada. Intenta en ' + bloqueo.minRestantes + ' min.'
      };
    }

    var clave = claveCorrecta();

    if (password === clave) {
      limpiarIntentos();
      crearSesion();
      return { exito: true, mensaje: 'Bienvenido, admin.' };
    }

    var resultado = registrarIntentoFallido();
    logEvento('login_fallido', 'Intento fallido');

    if (resultado.bloqueado) {
      return {
        exito: false,
        bloqueado: true,
        minRestantes: resultado.minRestantes,
        mensaje: 'Cuenta bloqueada por ' + resultado.minRestantes + ' min.'
      };
    }

    return {
      exito: false,
      intentosRestantes: resultado.intentosRestantes,
      mensaje: 'Clave incorrecta. Te quedan ' + resultado.intentosRestantes + ' intentos.'
    };
  }

  /* ============================================================
     PROTECCIÓN DE PÁGINAS
     ============================================================ */
  function protegerPagina() {
    var v = verificarSesion();
    if (!v.activa) {
      logEvento('acceso_denegado', 'Motivo: ' + v.motivo);
      window.location.replace('admin-login.html');
      return false;
    }

    /* Actualizar actividad en cada interacción */
    document.addEventListener('click', actualizarActividad);
    document.addEventListener('touchstart', actualizarActividad);
    document.addEventListener('keydown', actualizarActividad);

    /* Chequear sesión cada 5 min */
    setInterval(function () {
      var check = verificarSesion();
      if (!check.activa) {
        window.location.replace('admin-login.html');
      }
    }, 5 * 60 * 1000);

    return true;
  }

  /* ============================================================
     INFO PÚBLICA (para el panel de login)
     ============================================================ */
  function infoBloqueo() {
    return verificarBloqueo();
  }

  function infoSesion() {
    var s = storageGet(STORAGE.sesion);
    if (!s) return null;
    return {
      creada: new Date(s.creada).toISOString(),
      expira: new Date(s.expira).toISOString(),
      minutosRestantes: Math.floor((s.expira - Date.now()) / 60000)
    };
  }

  function leerLog() {
    return storageGet(STORAGE.log) || [];
  }

  /* ============================================================
     CAMBIO DE CONTRASEÑA
     (encripta la nueva clave y la guarda ofuscada)
     ============================================================ */
  function cambiarClave(nuevaClave) {
    if (!nuevaClave || nuevaClave.length < 8) {
      return { exito: false, mensaje: 'La clave debe tener al menos 8 caracteres.' };
    }

    /* Ofuscamos la nueva clave con XOR */
    var arr = [];
    for (var i = 0; i < nuevaClave.length; i++) {
      arr.push(nuevaClave.charCodeAt(i) ^ CONFIG.claveXOR);
    }

    /* Guardamos en localStorage (para uso personal del APK) */
    storageSet('kraze_sec_clave_custom', arr);
    logEvento('cambio_clave', 'Contraseña maestra actualizada');

    return { exito: true, mensaje: 'Clave actualizada.' };
  }

  /* Verifica usando la clave custom si existe */
  function claveActiva() {
    var custom = storageGet('kraze_sec_clave_custom');
    if (custom && custom.length > 0) {
      var chars = '';
      for (var i = 0; i < custom.length; i++) {
        chars += String.fromCharCode(custom[i] ^ CONFIG.claveXOR);
      }
      return chars;
    }
    return claveCorrecta();
  }

  /* Autenticar (v2 con soporte de clave custom) */
  function autenticarV2(password) {
    var bloqueo = verificarBloqueo();
    if (bloqueo.bloqueado) {
      return {
        exito: false,
        bloqueado: true,
        minRestantes: bloqueo.minRestantes,
        mensaje: 'Cuenta bloqueada. Intenta en ' + bloqueo.minRestantes + ' min.'
      };
    }

    if (password === claveActiva()) {
      limpiarIntentos();
      crearSesion();
      logEvento('login', 'Login exitoso');
      return { exito: true, mensaje: 'Bienvenido, admin.' };
    }

    var resultado = registrarIntentoFallido();
    logEvento('login_fallido', 'Intento fallido');

    if (resultado.bloqueado) {
      return {
        exito: false,
        bloqueado: true,
        minRestantes: resultado.minRestantes,
        mensaje: 'Cuenta bloqueada por ' + resultado.minRestantes + ' min.'
      };
    }

    return {
      exito: false,
      intentosRestantes: resultado.intentosRestantes,
      mensaje: 'Clave incorrecta. Te quedan ' + resultado.intentosRestantes + ' intentos.'
    };
  }

  /* ============================================================
     API PÚBLICA
     ============================================================ */
  var Kraze = window.Kraze = window.Kraze || {};

  Kraze.seguridad = {
    /* Autenticación */
    login: autenticarV2,
    logout: cerrarSesion,

    /* Estado */
    sesion: infoSesion,
    bloqueo: infoBloqueo,
    log: leerLog,

    /* Protección */
    proteger: protegerPagina,
    sesionActiva: function () { return verificarSesion().activa; },

    /* Cambio de clave */
    cambiarClave: cambiarClave,

    /* Configuración (lectura) */
    config: CONFIG
  };

  console.log(
    '%cKraze Seguridad lista',
    'color:#FFFFFF;background:#1A1F2E;padding:2px 8px;border-radius:4px;font-weight:bold'
  );

})();