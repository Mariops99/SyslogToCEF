/**
 * Controlador del ciclo de vida del servicio (start/stop)
 * - Orquesta el arranque/parada de los servidores de entrada.
 * - Sin lógica de parseo ni de IO de salida (eso es de los servicios).
 */

const state = require('../models/state');
const { getConfig, updateConfig } = require('../models/configModel');
const { startServers, stopServers } = require('../services/io/syslogServer');

// Arranca servidores y marca running=true (en memoria y persistente)
function start() {
  startServers();
  state.running = true;

  // Guardamos "running: true" en config.json para recordar estado entre reinicios
  updateConfig({ ...getConfig(), running: true });
  return { running: true };
}

// Detiene servidores y marca running=false
function stop() {
  stopServers();
  state.running = false;

  updateConfig({ ...getConfig(), running: false });
  return { running: false };
}

// Si config.json decía running=true, intentamos arrancar al iniciar la app (app.js)
function startIfEnabled() {
  const cfg = getConfig();
  if (cfg.running) {
    try {
      startServers();
      state.running = true;
    } catch (e) {
      console.error('[Svc] Error al reanudar:', e.message);
      state.running = false;
    }
  }
}

module.exports = { start, stop, startIfEnabled };
