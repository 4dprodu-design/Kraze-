/* ============================================================
   KRAZE · Navegación y estado de sesión
   © 2026 Erian C.A. — Todos los derechos reservados
   Archivo: js/nav.js
   
   Este archivo define el objeto global Kraze.nav, que maneja:
   - El rol del usuario (pasajero / transportista)
   - Las rutas de los archivos HTML
   - La sesión activa (localStorage)
   - Helpers de navegación
   ============================================================ */

(function () {
  'use strict';

  /* --- Crear el namespace global si no existe --- */
  window.Kraze = window.Kraze || {};

  /* --- Configuración de rutas --- */
  var RUTAS = {
    splash:             '01-Splash.html',
    login:              '02-Login.html',
    recuperar:          '02a-Recuperar-Password.html',
    seleccionRol:       '03-Seleccion-Rol.html',
    homePasajero:       '04-Home-Pasajero.html',
    homeTransportista:  '04-Home-Transportista.html',
    pedirViaje:         '05-Pedir-Viaje.html',
    ubicacion:          '06-Ubicacion-Tiempo-Real.html',
    resenas:            '07-Reseñas.html',
    perfilPasajero:     '08-Perfil-Pasajero.html',
    panelTransportista: '09-Panel-Transportista.html',
    perfilTransportista:'10-Perfil-Transportista.html',
    misViajes:          '11-Mis-Viajes.html',
    creditos:           '12-Creditos.html',
    billetera:          '13-Billetera.html',
    publicidad:         '14-Publicidad.html',
    marketplace:        '15-Marketplace-FastFood.html',
    pedidoComida:       '16-Pedido-Comida.html',
    registroConfirmar:  '17-Registro-Confirmar.html',
    registroDatos:      '17a-Registro-Datos.html',
    registroVehiculo:   '17b-Registro-Vehiculo.html',
    editarPerfil:       '18-Editar-Perfil.html',
    registroTienda:     '19-Registro-Tienda.html',
    subirDocumentos:    '19a-Subir-Documentos.html',
    editorMenu:         '19b-Editor-Menu.html',
    panelAdminTiendas:  '19c-Panel-Admin-Tiendas.html',
    solicitudes:        '20-Solicitudes.html',
    adminLogin:         'admin-login.html'
  };

  /* --- Claves de localStorage --- */
  var CLAVES = {
    rol:      'kraze_rol',
    telefono: 'kraze_telefono',
    userId:   'kraze_user_id',
    email:    'kraze_email',
    nombre:   'kraze_nombre',
    sesion:   'kraze_sesion'
  };

  /* --- Helpers de sesión --- */
  function getRol() {
    try {
      return localStorage.getItem(CLAVES.rol) || null;
    } catch (e) {
      return null;
    }
  }

  function setRol(rol) {
    try {
      if (rol) {
        localStorage.setItem(CLAVES.rol, rol);
      } else {
        localStorage.removeItem(CLAVES.rol);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function getTelefono() {
    try { return localStorage.getItem(CLAVES.telefono) || null; }
    catch (e) { return null; }
  }

  function setTelefono(tel) {
    try {
      if (tel) localStorage.setItem(CLAVES.telefono, tel);
      else localStorage.removeItem(CLAVES.telefono);
      return true;
    } catch (e) { return false; }
  }

  function getUserId() {
    try { return localStorage.getItem(CLAVES.userId) || null; }
    catch (e) { return null; }
  }

  function setUserId(id) {
    try {
      if (id) localStorage.setItem(CLAVES.userId, id);
      else localStorage.removeItem(CLAVES.userId);
      return true;
    } catch (e) { return false; }
  }

  function getEmail() {
    try { return localStorage.getItem(CLAVES.email) || null; }
    catch (e) { return null; }
  }

  function setEmail(email) {
    try {
      if (email) localStorage.setItem(CLAVES.email, email);
      else localStorage.removeItem(CLAVES.email);
      return true;
    } catch (e) { return false; }
  }

  function getNombre() {
    try { return localStorage.getItem(CLAVES.nombre) || null; }
    catch (e) { return null; }
  }

  function setNombre(nombre) {
    try {
      if (nombre) localStorage.setItem(CLAVES.nombre, nombre);
      else localStorage.removeItem(CLAVES.nombre);
      return true;
    } catch (e) { return false; }
  }

  function haySesion() {
    return !!(getRol() && getUserId());
  }

  function cerrarSesion() {
    try {
      localStorage.removeItem(CLAVES.rol);
      localStorage.removeItem(CLAVES.telefono);
      localStorage.removeItem(CLAVES.userId);
      localStorage.removeItem(CLAVES.email);
      localStorage.removeItem(CLAVES.nombre);
      localStorage.removeItem(CLAVES.sesion);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* --- Navegación --- */
  function ir(ruta) {
    if (!ruta) return;
    window.location.href = ruta;
  }

  function reemplazar(ruta) {
    if (!ruta) return;
    window.location.replace(ruta);
  }

  function irAtras() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      reemplazar(RUTAS.splash);
    }
  }

  function irAlHome() {
    var rol = getRol();
    if (rol === 'pasajero') return reemplazar(RUTAS.homePasajero);
    if (rol === 'transportista') return reemplazar(RUTAS.homeTransportista);
    return reemplazar(RUTAS.login);
  }

  /* --- Bloquear botón atrás (opcional, para pantallas críticas) --- */
  function bloquearAtras() {
    try {
      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', function () {
        window.history.pushState(null, '', window.location.href);
      });
    } catch (e) { /* ignorar */ }
  }

  /* --- Exportar API --- */
  window.Kraze.nav = {
    config: RUTAS,
    claves: CLAVES,

    getRol: getRol,
    setRol: setRol,

    getTelefono: getTelefono,
    setTelefono: setTelefono,

    getUserId: getUserId,
    setUserId: setUserId,

    getEmail: getEmail,
    setEmail: setEmail,

    getNombre: getNombre,
    setNombre: setNombre,

    haySesion: haySesion,
    cerrarSesion: cerrarSesion,

    ir: ir,
    reemplazar: reemplazar,
    irAtras: irAtras,
    irAlHome: irAlHome,
    bloquearAtras: bloquearAtras
  };

})();
