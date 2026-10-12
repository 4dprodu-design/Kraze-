/* KRAZE - Autenticacion con Supabase - Erian C.A. */

const SUPABASE_URL = 'https://xetqvxuiroalddfzrfzc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SARKcARFpIESQRUDSxbpig_kdlHrZh3';

window.KrazeAuth = (function () {
  'use strict';

  async function api(path, opciones = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${path}`;
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(opciones.headers || {})
    };
    const resp = await fetch(url, { ...opciones, headers });
    const texto = await resp.text();
    let data;
    try { data = texto ? JSON.parse(texto) : null; }
    catch (e) { data = { raw: texto }; }
    return { ok: resp.ok, status: resp.status, data };
  }

  async function registrar({ nombre, telefono, email, rol, cedula, bio }) {
    if (!nombre || !telefono) {
      return { exito: false, error: 'Nombre y telefono son obligatorios' };
    }
    const telefonoLimpio = String(telefono).replace(/[^\d+]/g, '');

    const check = await api(`profiles?telefono=eq.${encodeURIComponent(telefonoLimpio)}&select=id,telefono`);
    if (check.ok && Array.isArray(check.data) && check.data.length > 0) {
      return { exito: false, error: 'Este telefono ya esta registrado' };
    }

    const payload = {
      nombre: nombre.trim(),
      telefono: telefonoLimpio,
      full_name: nombre.trim(),
      phone: telefonoLimpio,
      email: email ? email.trim() : null,
      rol: rol || 'pasajero',
      role: rol || 'pasajero',
      cedula: cedula || null,
      bio: bio || null,
      ciudad: 'Socopo',
      city: 'Socopo',
      activo: true,
      verificado: false
    };

    const resp = await api('profiles', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const msg = resp.data?.message || `Error del servidor (${resp.status})`;
      return { exito: false, error: msg, detalle: resp.data };
    }

    const usuario = Array.isArray(resp.data) ? resp.data[0] : resp.data;

    try {
      localStorage.setItem('kraze_usuario', JSON.stringify(usuario));
      localStorage.setItem('kraze_rol', usuario.rol || usuario.role || 'pasajero');
      localStorage.setItem('kraze_usuario_id', usuario.id);
    } catch (e) {}

    return { exito: true, usuario };
  }

  async function buscarPorTelefono(telefono) {
    const tel = String(telefono).replace(/[^\d+]/g, '');
    const resp = await api(`profiles?telefono=eq.${encodeURIComponent(tel)}&select=*`);
    if (!resp.ok) return { exito: false, error: 'Error consultando' };
    if (!Array.isArray(resp.data) || resp.data.length === 0) {
      return { exito: false, error: 'Usuario no encontrado' };
    }
    return { exito: true, usuario: resp.data[0] };
  }

  async function actualizar(id, cambios) {
    if (!id) return { exito: false, error: 'Falta ID' };
    const resp = await api(`profiles?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(cambios)
    });
    if (!resp.ok) return { exito: false, error: 'Error al actualizar' };
    const usuario = Array.isArray(resp.data) ? resp.data[0] : resp.data;
    try { localStorage.setItem('kraze_usuario', JSON.stringify(usuario)); } catch (e) {}
    return { exito: true, usuario };
  }

  function obtenerUsuarioLocal() {
    try { return JSON.parse(localStorage.getItem('kraze_usuario') || 'null'); }
    catch (e) { return null; }
  }

  function obtenerIdLocal() {
    return localStorage.getItem('kraze_usuario_id');
  }

  function cerrarSesion() {
    localStorage.removeItem('kraze_usuario');
    localStorage.removeItem('kraze_rol');
    localStorage.removeItem('kraze_usuario_id');
  }

  return {
    registrar,
    buscarPorTelefono,
    actualizar,
    obtenerUsuarioLocal,
    obtenerIdLocal,
    cerrarSesion
  };
})();
