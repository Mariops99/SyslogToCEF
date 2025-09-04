/**
 * Punto de entrada de la aplicación (capa de arranque / wiring).
 * - Configura Express, motor de vistas EJS y estáticos.
 * - Registra rutas de páginas y API.
 * - Levanta el servidor de la UI.
 * - Reanuda el servicio (entrada syslog + salida CEF) si estaba "running" en config.json.
 */

const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');

const { getConfig } = require('./models/configModel');     // Modelo de configuración persistente (config.json)
const apiRoutes = require('./routes/api');                  // Endpoints de API (config, start/stop, sse)
const pageRoutes = require('./routes/index');               // Ruta de la vista principal (UI)
const { startIfEnabled } = require('./controllers/syslogController'); // Controlador que arranca servidores si running=true

const app = express();
const cfg = getConfig();                                    // Leemos config actual (o valores por defecto)

// -------- Motor de vistas + ficheros estáticos --------
app.set('views', path.join(__dirname, 'views'));            // Carpeta de vistas .ejs
app.set('view engine', 'ejs');                              // Usamos EJS como templating engine
app.use('/static', express.static(path.join(__dirname, 'public'))); // Carpeta de JS/CSS/imagenes (ruta /static)
app.use(bodyParser.json());                                 // Body parser para JSON en peticiones POST

// -------- Rutas --------
app.use('/', pageRoutes);                                   // Render de la UI (GET /)
app.use('/api', apiRoutes);                                 // Endpoints REST/SSE (GET/POST /api/*)

// -------- Arranque de la UI --------
const port = cfg.uiPort || 3000;                            // Puerto de la UI configurable en config.json
const server = app.listen(port, () => {
  console.log(`[UI] Disponible en http://localhost:${port}`);
});

// Si la app se cerró con el servicio “en ejecución”, lo retomamos automáticamente al arrancar.
startIfEnabled();

// Manejo básico de error al abrir el puerto (p.ej. ocupado)
server.on('error', (e) => {
  console.error('[UI] Error al abrir puerto:', e);
});
