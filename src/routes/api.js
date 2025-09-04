/**
 * Rutas de API (REST + SSE)
 * - /api/config   GET/POST: leer/actualizar configuración
 * - /api/start    POST: iniciar servicio
 * - /api/stop     POST: detener servicio
 * - /api/stream   GET: Server-Sent Events para muestras en tiempo real
 */

const express = require('express');
const router = express.Router();

const configCtl = require('../controllers/configController');
const { start, stop } = require('../controllers/syslogController');
const { sse } = require('../controllers/streamController');

// Configuración
router.get('/config',  configCtl.get);
router.post('/config', configCtl.save);

// Control del servicio
router.post('/start', (_req, res) => {
  try {
    const r = start();
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
router.post('/stop', (_req, res) => {
  try {
    const r = stop();
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Streaming (SSE)
router.get('/stream', sse);

module.exports = router;
