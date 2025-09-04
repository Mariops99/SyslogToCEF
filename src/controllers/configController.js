/**
 * Controlador de configuración (API)
 * - GET /api/config: devuelve la configuración actual.
 * - POST /api/config: valida/normaliza y persiste cambios.
 *   * Si cambian parámetros de IO (entrada/salida), se detiene el servicio si estaba corriendo:
 *     el usuario deberá pulsar "Iniciar" para reabrir sockets con la nueva config.
 */

const { getConfig, updateConfig, validateAndNormalize } = require('../models/configModel');
const { stop } = require('./syslogController');

// GET /api/config
function get(_req, res) {
  res.json(getConfig());
}

// POST /api/config
function save(req, res) {
  try {
    const { input, output, uiPort } = req.body || {};

    // 1) Mezclamos con lo que ya hay y validamos
    const merged = validateAndNormalize({ ...getConfig(), input, output, uiPort });

    // 2) Si se cambió algo de IO (entrada/salida), y el servicio está en marcha, lo detenemos
    const oldCfg = getConfig();
    const changingIO =
      JSON.stringify(oldCfg.input)  !== JSON.stringify(merged.input) ||
      JSON.stringify(oldCfg.output) !== JSON.stringify(merged.output);

    const saved = updateConfig(merged);

    if (changingIO && saved.running) {
      // Paramos para que el usuario decida cuándo reabrir con la nueva configuración
      stop();
    }

    res.json({ ok: true, running: getConfig().running });

  } catch (e) {
    res.status(400).json({ ok: false, error: e.message, running: getConfig().running });
  }
}

module.exports = { get, save };
