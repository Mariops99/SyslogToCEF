/**
 * Lado cliente (UI)
 * - Carga la configuración para hidratar controles.
 * - Permite guardar cambios (validados en backend).
 * - Inicia/detiene el servicio desde la UI.
 * - Escucha el stream SSE para mostrar la última trama recibida/traducida.
 */

// -------- Helpers de llamada a API --------

// Pide la config al backend y actualiza la UI (selects/inputs/estado)
async function loadConfig() {
  const res = await fetch('/api/config');
  const cfg = await res.json();

  // Entrada SYSLOG
  document.getElementById('inProto').value = cfg.input.protocol;
  document.getElementById('inPort').value  = cfg.input.port;

  // Salida CEF
  document.getElementById('outProto').value = cfg.output.protocol;
  document.getElementById('outPort').value  = cfg.output.port;
  document.getElementById('outHost').value  = cfg.output.host || '127.0.0.1';

  // Estado de ejecución (píldora al lado del título)
  document.getElementById('status').textContent = cfg.running ? 'en ejecución' : 'detenido';
}

// Recoge valores de la UI y los envía al backend para persistir
async function saveConfig() {
  // Construimos el objeto tal como lo espera el backend (configController)
  const input = {
    protocol: document.getElementById('inProto').value,
    port: Number(document.getElementById('inPort').value)
  };
  const output = {
    protocol: document.getElementById('outProto').value,
    port: Number(document.getElementById('outPort').value),
    host: document.getElementById('outHost').value.trim()
  };

  // POST /api/config
  const res  = await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ input, output })
  });
  const data = await res.json();

  // Mensaje corto de feedback
  document.getElementById('msg').textContent = data.ok ? 'Configuración guardada.' : (`Error: ${data.error}`);

  // Si backend devuelve "running", actualizamos la pill (p.ej. si ha detenido por cambio de IO)
  if (data.running !== undefined) {
    document.getElementById('status').textContent = data.running ? 'en ejecución' : 'detenido';
  }
}

// Ordena iniciar el servicio (abre sockets de entrada/salida)
async function startSvc() {
  const res  = await fetch('/api/start', { method: 'POST' });
  const data = await res.json();

  // Feedback + pill de estado
  document.getElementById('msg').textContent = data.ok ? 'Servicio iniciado.' : (`Error: ${data.error}`);
  document.getElementById('status').textContent = data.running ? 'en ejecución' : 'detenido';
}

// Ordena detener el servicio (cierra sockets)
async function stopSvc() {
  const res  = await fetch('/api/stop', { method: 'POST' });
  const data = await res.json();

  document.getElementById('msg').textContent = data.ok ? 'Servicio detenido.' : (`Error: ${data.error}`);
  document.getElementById('status').textContent = data.running ? 'en ejecución' : 'detenido';
}

// -------- Wire de eventos de la UI --------
document.getElementById('saveBtn').addEventListener('click',   saveConfig);
document.getElementById('startBtn').addEventListener('click',  startSvc);
document.getElementById('stopBtn').addEventListener('click',   stopSvc);
document.getElementById('reloadBtn').addEventListener('click', loadConfig);

// Cargamos valores iniciales al entrar
loadConfig();

// -------- Streaming de muestras (SSE) --------
// Abrimos la conexión con /api/stream. El servidor enviará objetos {type:'sample', payload:{...}}
const ev = new EventSource('/api/stream');

// Cada mensaje recibido actualiza los textareas y metadatos
ev.onmessage = (e) => {
  try {
    const data = JSON.parse(e.data);
    if (data.type === 'sample') {
      const p = data.payload || {};
      document.getElementById('raw').value = p.raw || '';
      document.getElementById('cef').value = p.cef || '';
      document.getElementById('meta').textContent =
        (p.when || '') + (p.from ? (' — ' + p.from) : '');
    }
  } catch {
    // Si por lo que sea llega algo no-JSON, lo ignoramos silenciosamente
  }
};
