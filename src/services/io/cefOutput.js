/**
 * Salida de eventos en formato CEF.
 * - Soporta protocolo UDP o TCP.
 * - Host/IP y puerto configurables (desde la UI -> config.json).
 * - UDP: socket reutilizable; TCP: conexión efímera por envío (robusta y simple).
 */

const dgram = require('dgram');
const net = require('net');
const state = require('../../models/state');
const { getConfig } = require('../../models/configModel');

function sendCEF(cefStr) {
  // Leemos la config "en caliente" (por si cambió desde la UI)
  const cfg = getConfig();
  const { protocol, port, host } = cfg.output;
  const destHost = host || '127.0.0.1';

  if (protocol === 'udp') {
    // Reutilizamos un socket UDP para reducir overhead
    if (!state.outputUdpSocket) state.outputUdpSocket = dgram.createSocket('udp4');
    const buf = Buffer.from(cefStr, 'utf8');
    state.outputUdpSocket.send(buf, 0, buf.length, port, destHost, (err) => {
      if (err) console.error('[OUT][UDP] Error enviando CEF:', err.message);
    });

  } else {
    // TCP: abrimos conexión, enviamos y cerramos (evita fugas si el receptor cae)
    const client = new net.Socket();
    client.connect(port, destHost, () => {
      client.write(cefStr + '\n');  // convención: una línea por evento
      client.end();
    });
    client.on('error', (e) => console.error('[OUT][TCP] Error:', e.message));
  }
}

module.exports = { sendCEF };
