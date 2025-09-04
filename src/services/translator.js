/**
 * Traductor SYSLOG -> CEF
 * - Parser "tolerante" que intenta extraer PRI, timestamp, hostname y mensaje.
 * - Mapea a una línea CEF con extensiones estándar y campos personalizados (cs1..cs6).
 * - Extrae pares k=v del mensaje y los vuelca como csNLabel/csN (hasta cs6 para no exagerar).
 * Nota: Es un punto ideal para afinar mapeos a necesidades reales de cada fuente.
 */

// Helpers de fecha y escape básico para CEF
function toEpochMillis(date) { try { return new Date(date).getTime(); } catch { return Date.now(); } }
function nowIso() { return new Date().toISOString(); }
function esc(v) { if (v == null) return ''; return String(v).replace(/\\/g, '\\\\').replace(/=/g, '\\='); }

function syslogToCEF(syslogStr, inboundProto = 'udp') {
  let pri = null, timestamp = null, hostname = null, message = syslogStr;

  // 1) PRI (si llega como <134> al inicio). No es imprescindible, pero útil para signatureId.
  const priMatch = syslogStr.match(/^<(\d+)>/);
  if (priMatch) {
    pri = priMatch[1];
    syslogStr = syslogStr.replace(/^<\d+>/, ''); // quitamos el prefijo para el resto del parseo
  }

  // 2) Heurística para dividir timestamp, hostname y message.
  //    - Si la primera "palabra" parsea como fecha: la usamos de timestamp.
  //    - Si no, probamos primeras 3 palabras (ej. "Aug 26 12:34:56").
  //    - Si nada encaja, asumimos parts[0]=hostname y el resto=message con timestamp ahora.
  const parts = syslogStr.trim().split(/\s+/);
  if (parts.length >= 3) {
    const first = parts[0];
    const tsCandidate = Date.parse(first) ? first : null;

    if (tsCandidate) {
      timestamp = first;
      hostname = parts[1];
      message = parts.slice(2).join(' ');
    } else {
      const first3 = parts.slice(0, 3).join(' ');
      const tsCandidate2 = Date.parse(first3);
      if (!isNaN(tsCandidate2)) {
        timestamp = first3;
        hostname = parts[3] || 'unknown';
        message = parts.slice(4).join(' ');
      } else {
        hostname = parts[0];
        timestamp = nowIso();
        message = parts.slice(1).join(' ');
      }
    }
  } else {
    timestamp = nowIso();
    hostname = 'unknown';
    message = syslogStr.trim();
  }

  // 3) Montar línea CEF. Los 7 campos base + extensiones al final.
  //    Version|Vendor|Product|Version|Signature ID|Name|Severity|Extension(s)
  const cef =
    `CEF:0|Custom|Syslog2CEF|1.0|${pri ? `syslog-${pri}` : 'syslog'}|Translated syslog|0|` +
    [
      // Extensiones "básicas" para poder buscar en el SIEM
      `msg=${esc(message)}`,                          // Mensaje "útil" (sin cabecera)
      `shost=${esc(hostname)}`,                       // Host remitente según parseo
      `rt=${toEpochMillis(timestamp)}`,               // Received Time en milisegundos epoch
      `deviceInboundInterface=${esc(inboundProto)}`,  // De dónde vino (udp/tcp)

      // Guardamos el syslog "sin PRI" completo por si se necesita re-procesar más tarde
      `cs1=${esc(syslogStr.trim())}`,

      // Pares k=v del mensaje como cs2..cs6 (máx. 5 para no inflar)
      ...(() => {
        const kvRegex = /(\w+)=([^\s]+)/g; // clave=valor hasta siguiente espacio
        let m; const arr = []; let cs = 2;
        while ((m = kvRegex.exec(message)) !== null && cs <= 6) {
          arr.push(`cs${cs}Label=${esc(m[1])}`);
          arr.push(`cs${cs}=${esc(m[2])}`);
          cs++;
        }
        return arr;
      })()
    ].join(' ');

  return cef;
}

module.exports = { syslogToCEF };
