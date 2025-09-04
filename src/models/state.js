/**
 * "Estado" del proceso (en memoria)
 * - Referencias a sockets/servidores abiertos.
 * - EventEmitter para publicar muestras a la UI (SSE).
 * - Flag running (apoyo rápido; la verdad canónica está en config.json).
 */

const { EventEmitter } = require('events');

const state = {
  udpServer: null,            // Servidor UDP de entrada SYSLOG
  tcpServer: null,            // Servidor TCP de entrada SYSLOG
  outputUdpSocket: null,      // Socket UDP reutilizable de salida CEF
  outputTcpClients: new Set(),// (reservado para conexiones TCP persistentes si se quisiera)
  emitter: new EventEmitter(),// Canal de eventos "sample" -> UI via SSE
  running: false              // Copia en memoria del estado de ejecución (informativo)
};

module.exports = state;
