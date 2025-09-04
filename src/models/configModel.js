/**
 * Modelo de configuración
 * - Persistencia en disco (config.json).
 * - Valores por defecto y migraciones suaves.
 * - Validación de campos (protocolos, puertos, host/IP).
 * Este "modelo" es deliberadamente simple (no DB) y suficiente para un servicio local.
 */

const fs = require('fs');
const path = require('path');

// Ruta al fichero de configuración a nivel de proyecto (raíz)
const CONFIG_FILE = path.join(__dirname, '../../config.json');

// Config por defecto: UI en 3000, entrada SYSLOG UDP:1514, salida CEF UDP:5514 a localhost, y servicio detenido.
const DEFAULT_CFG = {
  uiPort: 3000,
  input:  { protocol: 'udp', port: 1514 },
  output: { protocol: 'udp', host: '127.0.0.1', port: 5514 },
  running: false
};

// Lee config.json o devuelve defaults si no existe o está corrupto
function readFile() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); }
  catch { return { ...DEFAULT_CFG }; }
}

// Escribe config.json (bloqueante por simplicidad; para volúmenes bajos es aceptable)
function writeFile(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

// Validación de host/IP:
// - Acepta IPv4 (simple) o hostname (RFC 1123 simplificado).
function isValidHost(h) {
  if (typeof h !== 'string' || !h.trim()) return false;
  const host = h.trim();
  const ipv4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  if (ipv4.test(host)) return true;
  const dns = /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/;
  return dns.test(host);
}

// Valida y normaliza (mezcla con defaults por si faltan claves)
function validateAndNormalize(inputCfg) {
  const cfg = { ...DEFAULT_CFG, ...inputCfg };

  // Validaciones “humanas” + límites de puertos
  if (!['udp', 'tcp'].includes(cfg.input.protocol))  throw new Error('Protocolo de entrada inválido');
  if (!['udp', 'tcp'].includes(cfg.output.protocol)) throw new Error('Protocolo de salida inválido');
  if (!(cfg.input.port  > 0 && cfg.input.port  < 65536)) throw new Error('Puerto de entrada inválido');
  if (!(cfg.output.port > 0 && cfg.output.port < 65536)) throw new Error('Puerto de salida inválido');
  if (!isValidHost(cfg.output.host)) throw new Error('Host/IP de salida inválido');
  if (!(cfg.uiPort > 0 && cfg.uiPort < 65536)) cfg.uiPort = 3000; // fallback si alguien lo rompe

  return cfg;
}

// Devuelve config cargada + “migraciones suaves” (rellena claves nuevas si faltan)
function getConfig() {
  const cfg = readFile();
  if (!cfg.output) cfg.output = { ...DEFAULT_CFG.output };
  if (!cfg.output.host) cfg.output.host = '127.0.0.1';
  if (!cfg.input) cfg.input = { ...DEFAULT_CFG.input };
  if (typeof cfg.running !== 'boolean') cfg.running = false;
  if (!cfg.uiPort) cfg.uiPort = 3000;
  return cfg;
}

// Actualiza config: aplica patch -> valida/normaliza -> persiste -> devuelve final
function updateConfig(patch) {
  const merged = validateAndNormalize({ ...getConfig(), ...patch });
  writeFile(merged);
  return merged;
}

module.exports = { getConfig, updateConfig, validateAndNormalize };
