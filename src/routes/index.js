/**
 * Ruta de la página principal (UI)
 * - Renderiza la vista EJS con la config actual para pre-cargar valores.
 */

const express = require('express');
const router = express.Router();
const { getConfig } = require('../models/configModel');

router.get('/', (_req, res) => {
  const cfg = getConfig();     // Pasamos la config a la vista para hidratar selects/inputs
  res.render('index', { cfg }); // Render de /views/index.ejs
});

module.exports = router;
