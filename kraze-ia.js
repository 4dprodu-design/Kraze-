/* ============================================================
   KRAZE · Asistente Eri
   © 2026 Erian C.A. — Todos los derechos reservados
   Archivo: js/kraze-ia.js
   ============================================================ */

(function () {
  'use strict';

  var CONFIG = {
    name: 'Eri',
    endpoint: 'https://moto-llave-backend.vercel.app/api/claude',
    voiceLang: 'es-VE',
    maxHistory: 20
  };

  var PIN_SVG = '<svg viewBox="0 0 72 88" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M 36 0 C 16 0 0 16 0 36 C 0 52 10 64 24 76 L 36 88 L 48 76 C 62 64 72 52 72 36 C 72 16 56 0 36 0 Z" fill="#A4D65E"/>' +
    '<path d="M 36 22 C 36 22 30 15 23 15 C 16 15 11 20 11 27 C 11 33 15 38 21 44 L 36 60 L 51 44 C 57 38 61 33 61 27 C 61 20 56 15 49 15 C 42 15 36 22 36 22 Z" fill="#1A1F2E"/>' +
    '</svg>';

  var SUGERENCIAS = {
    'default': [
      'Como pido un viaje',
      'Como recargo mi billetera',
      'Que servicios ofrece Kraze',
      'Como cambio mi metodo de pago'
    ],
    '02-Login': [
      'Como creo mi cuenta',
      'Olvide mi contrasena',
      'Es seguro Kraze',
      'Que puedo hacer en Kraze'
    ],
    '03-Seleccion-Rol': [
      'Cual rol me conviene',
      'Puedo cambiar de rol despues',
      'Que necesito para conducir',
      'Como gano dinero'
    ],
    '15-Marketplace-FastFood': [
      'Como pido comida',
      'Que tiendas hay',
      'Cuanto tarda el envio',
      'Puedo pagar con creditos'
    ],
    '16-Pedido-Comida': [
      'Como hago el pedido',
      'Cuanto cuesta el envio',
      'Como pago',
      'Puedo cancelar'
    ],
    '17a-Registro-Datos': [
      'Que datos necesito',
      'Por que piden mi cedula',
      'Es seguro mi registro'
    ],
    '17b-Registro-Vehiculo': [
      'Que tipo de vehiculo elijo',
      'Que documentos necesito',
      'Puedo cambiar de vehiculo'
    ],
    '19-Registro-Tienda': [
      'Que necesito para registrar mi tienda',
      'Cuanto cuesta',
      'Cuando me aprueban',
      'Como subo mi menu'
    ]
  };

  var panelAbierto = false;
  var historial = [];
  var recognition = null;
  var escuchando = false;
  var synth = window.speechSynthesis;

  function crearEstilos() {
    if (document.getElementById('kraze-ia-styles')) return;

    var css = '';
    css += '.kraze-btn{position:fixed;bottom:100px;right:16px;width:64px;height:64px;border-radius:50%;background:#fff;border:2px solid #A4D65E;z-index:99998;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 20px rgba(26,31,46,0.22);padding:10px;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}';
    css += '.kraze-btn:active{transform:scale(0.92);}';
    css += '.kraze-btn svg{width:100%;height:100%;display:block;}';
    css += '.kraze-dot{position:absolute;top:2px;right:2px;width:14px;height:14px;border-radius:50%;background:#22C55E;border:2px solid #fff;}';
    css += '.kraze-panel{position:fixed;left:0;right:0;bottom:0;height:75vh;max-height:600px;background:#fff;border-top-left-radius:20px;border-top-right-radius:20px;box-shadow:0 -10px 40px rgba(26,31,46,0.25);z-index:99999;display:flex;flex-direction:column;transform:translateY(100%);transition:transform 0.3s ease;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-sizing:border-box;}';
    css += '.kraze-panel.on{transform:translateY(0);}';
    css += '.kraze-head{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid #E5E5DE;flex-shrink:0;}';
    css += '.kraze-av{width:44px;height:44px;border-radius:50%;background:#fff;border:2px solid #A4D65E;display:flex;align-items:center;justify-content:center;padding:8px;box-sizing:border-box;flex-shrink:0;}';
    css += '.kraze-av svg{width:100%;height:100%;display:block;}';
    css += '.kraze-info{flex:1;}';
    css += '.kraze-nm{font-weight:700;font-size:16px;color:#1A1F2E;}';
    css += '.kraze-st{font-size:12px;color:#22C55E;font-weight:500;}';
    css += '.kraze-x{background:transparent;border:none;font-size:22px;color:#8A8F80;cursor:pointer;padding:8px;font-family:inherit;}';
    css += '.kraze-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;-webkit-overflow-scrolling:touch;}';
    css += '.kraze-b{max-width:80%;padding:10px 14px;border-radius:16px;font-size:15px;line-height:1.4;word-wrap:break-word;}';
    css += '.kraze-b.bot{align-self:flex-start;background:#F5F5F0;color:#1A1F2E;border-bottom-left-radius:4px;}';
    css += '.kraze-b.user{align-self:flex-end;background:#A4D65E;color:#1A1F2E;border-bottom-right-radius:4px;}';
    css += '.kraze-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 10px;flex-shrink:0;}';
    css += '.kraze-chip{background:#F5F5F0;border:1px solid #E5E5DE;border-radius:20px;padding:6px 12px;font-size:13px;color:#1A1F2E;cursor:pointer;font-family:inherit;}';
    css += '.kraze-chip:active{background:#E5E5DE;}';
    css += '.kraze-row{display:flex;align-items:center;gap:8px;padding:12px 16px 20px;border-top:1px solid #E5E5DE;flex-shrink:0;}';
    css += '.kraze-inp{flex:1;padding:12px 14px;border:1.5px solid #E5E5DE;border-radius:24px;font-size:15px;background:#fff;color:#1A1F2E;outline:none;min-height:44px;box-sizing:border-box;font-family:inherit;}';
    css += '.kraze-inp:focus{border-color:#A4D65E;}';
    css += '.kraze-btn2{width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:inherit;}';
    css += '.kraze-mic{background:#F5F5F0;color:#1A1F2E;}';
    css += '.kraze-mic.on{background:#EF4444;color:#fff;}';
    css += '.kraze-snd{background:#A4D65E;color:#1A1F2E;}';

    var st = document.createElement('style');
    st.id = 'kraze-ia-styles';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function crearBoton() {
    if (document.getElementById('kraze-btn')) return;
    var btn = document.createElement('button');
    btn.id = 'kraze-btn';
    btn.className = 'kraze-btn';
    btn.setAttribute('aria-label', 'Abrir asistente Eri');
    btn.innerHTML = PIN_SVG + '<span class="kraze-dot"></span>';
    btn.onclick = alternar;
    document.body.appendChild(btn);
  }

  function crearPanel() {
    if (document.getElementById('kraze-panel')) return;

    var panel = document.createElement('div');
    panel.id = 'kraze-panel';
    panel.className = 'kraze-panel';

    var html = '';
    html += '<div class="kraze-head">';
    html +=   '<div class="kraze-av">' + PIN_SVG + '</div>';
    html +=   '<div class="kraze-info">';
    html +=     '<div class="kraze-nm">' + CONFIG.name + '</div>';
    html +=     '<div class="kraze-st">&#9679; En linea</div>';
    html +=   '</div>';
    html +=   '<button class="kraze-x" id="kraze-x">&#10005;</button>';
    html += '</div>';
    html += '<div class="kraze-msgs" id="kraze-msgs"></div>';
    html += '<div class="kraze-chips" id="kraze-chips"></div>';
    html += '<div class="kraze-row">';
    html +=   '<button class="kraze-btn2 kraze-mic" id="kraze-mic">&#127908;</button>';
    html +=   '<input type="text" class="kraze-inp" id="kraze-inp" placeholder="Escribe o habla..." autocomplete="off">';
    html +=   '<button class="kraze-btn2 kraze-snd" id="kraze-snd">&#10148;</button>';
    html += '</div>';

    panel.innerHTML = html;
    document.body.appendChild(panel);

    document.getElementById('kraze-x').onclick = cerrar;
    document.getElementById('kraze-snd').onclick = enviar;
    document.getElementById('kraze-mic').onclick = alternarMic;
    document.getElementById('kraze-inp').onkeydown = function (e) {
      if (e.key === 'Enter') enviar();
    };
  }
  function alternar() {
    if (panelAbierto) { cerrar(); } else { abrir(); }
  }

  function abrir() {
    var p = document.getElementById('kraze-panel');
    if (!p) return;
    p.classList.add('on');
    panelAbierto = true;

    if (historial.length === 0) {
      var pagina = paginaActual();
      var sugerencias = SUGERENCIAS[pagina] || SUGERENCIAS['default'];
      burbuja('bot', 'Hola, soy Eri. En que te ayudo hoy?');
      mostrarChips(sugerencias);
    }
  }

  function cerrar() {
    var p = document.getElementById('kraze-panel');
    if (!p) return;
    p.classList.remove('on');
    panelAbierto = false;
  }

  function paginaActual() {
    var path = window.location.pathname;
    var file = path.substring(path.lastIndexOf('/') + 1).replace('.html', '');
    return file || 'default';
  }

  function burbuja(tipo, texto) {
    var cont = document.getElementById('kraze-msgs');
    if (!cont) return;
    var b = document.createElement('div');
    b.className = 'kraze-b ' + tipo;
    b.textContent = texto;
    cont.appendChild(b);
    cont.scrollTop = cont.scrollHeight;
  }

  function mostrarChips(lista) {
    var cont = document.getElementById('kraze-chips');
    if (!cont) return;
    cont.innerHTML = '';
    var i;
    for (i = 0; i < lista.length; i++) {
      (function (txt) {
        var chip = document.createElement('button');
        chip.className = 'kraze-chip';
        chip.textContent = txt;
        chip.onclick = function () {
          var inp = document.getElementById('kraze-inp');
          if (inp) inp.value = txt;
          enviar();
        };
        cont.appendChild(chip);
      })(lista[i]);
    }
  }

  function quitarUltimoSiPensando() {
    var cont = document.getElementById('kraze-msgs');
    if (!cont) return;
    var ultimo = cont.lastChild;
    if (ultimo && ultimo.textContent === 'Pensando...') {
      cont.removeChild(ultimo);
    }
  }

  function enviar() {
    var inp = document.getElementById('kraze-inp');
    if (!inp) return;
    var texto = inp.value.trim();
    if (!texto) return;

    inp.value = '';
    burbuja('user', texto);
    historial.push({ role: 'user', content: texto });
    burbuja('bot', 'Pensando...');

    var payload = { texto: texto };

    fetch(CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error('HTTP ' + res.status + ' - ' + t.substring(0, 200));
        });
      }
      return res.json();
    })
    .then(function (data) {
      quitarUltimoSiPensando();
      var respuesta = data.respuesta || data.response || data.text || data.message || JSON.stringify(data);
      burbuja('bot', respuesta);
      historial.push({ role: 'assistant', content: respuesta });
      hablar(respuesta);
    })
    .catch(function (err) {
      quitarUltimoSiPensando();
      burbuja('bot', 'ERROR: ' + err.message);
      console.error('[Eri]', err);
    });
  }

  function alternarMic() {
    if (escuchando) { pararMic(); } else { iniciarMic(); }
  }

  function iniciarMic() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Tu navegador no soporta reconocimiento de voz.');
      return;
    }
    if (!recognition) {
      recognition = new SR();
      recognition.lang = CONFIG.voiceLang;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = function (e) {
        var inp = document.getElementById('kraze-inp');
        if (inp) inp.value = e.results[0][0].transcript;
        pararMic();
        enviar();
      };
      recognition.onerror = function () { pararMic(); };
      recognition.onend = function () { pararMic(); };
    }
    try {
      recognition.start();
      escuchando = true;
      var m = document.getElementById('kraze-mic');
      if (m) m.classList.add('on');
    } catch (e) {}
  }

  function pararMic() {
    if (recognition && escuchando) {
      try { recognition.stop(); } catch (e) {}
    }
    escuchando = false;
    var m = document.getElementById('kraze-mic');
    if (m) m.classList.remove('on');
  }

  function hablar(texto) {
    if (!synth) return;
    synth.cancel();
    var u = new SpeechSynthesisUtterance(texto);
    u.lang = CONFIG.voiceLang;
    u.rate = 1.0;
    u.pitch = 1.0;
    synth.speak(u);
  }

  var Kraze = window.Kraze = window.Kraze || {};
  Kraze.ia = {
    abrir: abrir,
    cerrar: cerrar,
    toggle: alternar,
    enviar: function (t) {
      var i = document.getElementById('kraze-inp');
      if (i) i.value = t;
      enviar();
    },
    silenciar: function () { if (synth) synth.cancel(); }
  };

  function init() {
    crearEstilos();
    crearBoton();
    crearPanel();
    console.log('Eri lista');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();