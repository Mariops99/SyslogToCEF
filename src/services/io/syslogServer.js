/**
 * Entrada SYSLOG (servidores UDP/TCP)
 * - Abre el listener según protocolo/puerto configurado.
 * - Por cada evento recibido: traduce -> envía como CEF -> notifica a la UI (SSE).
 * - Expone startServers/stopServers para el ciclo de vida gestionado desde controladores.
 */

const dgram = require('dgram');
const net = require('net');
const state = require('../../models/state');
const { getConfig } = require('../../models/configModel');
const { syslogToCEF } = require('../translator');
const { sendCEF } = require('./cefOutput');

// Arranca servidores de entrada (UDP o TCP) según cfg.input
function startServers() {
  // Por higiene: si había algo abierto, lo cerramos primero
  stopServers();

  const cfg = getConfig();

  if (cfg.input.protocol === 'udp') {
    // ----- Modo UDP -----
    state.udpServer = dgram.createSocket('udp4');

    // Cada datagrama equivale a un "evento"
    state.udpServer.on('message', (msg, rinfo) => {
      const raw = msg.toString('utf8');                         // trama SYSLOG recibida
      const cef = syslogToCEF(raw, 'udp');                      // traducción a CEF
      sendCEF(cef);                                             // envío por el canal de salida configurado
      state.emitter.emit('sample', {                            // muestra en la UI (SSE)
        raw, cef, when: new Date().toISOString(),
        from: `UDP ${rinfo.address}:${rinfo.port}`
      });
    });

    state.udpServer.on('error', (e) => console.error('[IN][UDP] Error:', e.message));

    // Bind en el puerto configurado, todas las interfaces por defecto (0.0.0.0)
    state.udpServer.bind(cfg.input.port, () =>
      console.log(`[IN][UDP] Escuchando SYSLOG en ${cfg.input.port}`)
    );

  } else {
    // ----- Modo TCP -----
    // Un socket por cliente; los eventos vienen normalmente separados por saltos de línea.
    state.tcpServer = net.createServer((socket) => {
      socket.setEncoding('utf8');

      let buffer = '';  // acumulador para trocear por líneas
      socket.on('data', (chunk) => {
        buffer += chunk;
        let idx;
        // Procesamos línea a línea: cada línea -> 1 evento SYSLOG
        while ((idx = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line) continue;

          const cef = syslogToCEF(line, 'tcp');                 // traducción a CEF
          sendCEF(cef);                                         // envío por el canal de salida configurado

          // Retroalimentamos la UI (útil para debug / confianza)
          state.emitter.emit('sample', {
            raw: line, cef, when: new Date().toISOString(),
            from: `TCP ${socket.remoteAddress}:${socket.remotePort}`
          });
        }
      });

      socket.on('error', (e) => console.error('[IN][TCP] Socket error:', e.message));
    });

    state.tcpServer.on('error', (e) => console.error('[IN][TCP] Error:', e.message));

    state.tcpServer.listen(cfg.input.port, () =>
      console.log(`[IN][TCP] Escuchando SYSLOG TCP en ${cfg.input.port}`)
    );
  }
}

// Detiene y limpia todos los recursos de IO abiertos
function stopServers() {
  if (state.udpServer)      { try { state.udpServer.close(); }      catch {} state.udpServer = null; }
  if (state.tcpServer)      { try { state.tcpServer.close(); }      catch {} state.tcpServer = null; }
  if (state.outputUdpSocket){ try { state.outputUdpSocket.close(); }catch {} state.outputUdpSocket = null; }

  // Por si en el futuro se usan conexiones TCP persistentes de salida
  for (const c of state.outputTcpClients) { try { c.destroy(); } catch {} }
  state.outputTcpClients.clear();
}

module.exports = { startServers, stopServers };
