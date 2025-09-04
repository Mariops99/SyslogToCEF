/**
 * Controlador de Server-Sent Events (SSE) para la UI
 * - GET /api/stream: mantiene una conexión abierta y envía "muestras" en tiempo real.
 * - Los eventos se publican desde services/io/syslogServer.js a través de state.emitter.
 */

const state = require('../models/state');

// Establece la conexión SSE y suscribe el cliente a "sample"
function sse(req, res) {
  // Cabeceras obligatorias para SSE + desactivar caches/proxies
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.flushHeaders(); // envía cabeceras ya (Express mantiene el socket abierto)

  // Callback que enviará al cliente cada muestra como un "data: {...}\n\n"
  const onSample = (sample) => res.write(`data: ${JSON.stringify({ type: 'sample', payload: sample })}\n\n`);

  // Suscribir a eventos en memoria
  state.emitter.on('sample', onSample);

  // Mensaje inicial (opcional) para confirmar que hay conexión
  res.write(`data: ${JSON.stringify({ type: 'hello', ts: Date.now() })}\n\n`);

  // Limpieza: al cerrar el navegador o desconectarse, desuscribimos
  req.on('close', () => state.emitter.off('sample', onSample));
}

module.exports = { sse };
