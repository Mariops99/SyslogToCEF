SYSLOG → CEF Bridge (MVC)

Servicio Node.js “always-on” que escucha SYSLOG (UDP/TCP), lo traduce a CEF y lo re-emite por un puerto (UDP/TCP) a un host/IP configurable. Incluye una UI web para arrancar/detener el servicio, configurar entrada/salida y visualizar en vivo la trama recibida y su traducción CEF.

✨ Características

Entrada SYSLOG por UDP o TCP (puerto configurable).

Salida CEF por UDP o TCP a host/IP + puerto configurables.

UI web (Express + EJS) para:

Arrancar/Detener el servicio.

Configurar entrada y salida.

Ver la última trama recibida y su CEF.

SSE (Server-Sent Events) para streaming de muestras en tiempo real.

Persistencia en config.json (recuerda si el servicio estaba ejecutándose).

🧱 Arquitectura (MVC ligero)
src/
├─ app.js                      # Arranque de la UI y wiring de rutas
├─ routes/
│  ├─ index.js                 # Vista principal (GET /)
│  └─ api.js                   # API REST + SSE (/api/*)
├─ controllers/
│  ├─ configController.js      # GET/POST config
│  ├─ streamController.js      # SSE (GET /api/stream)
│  └─ syslogController.js      # start/stop/startIfEnabled
├─ models/
│  ├─ configModel.js           # Persistencia + validación de config.json
│  └─ state.js                 # Estado de proceso (sockets, EventEmitter, running)
├─ services/
│  ├─ translator.js            # SYSLOG -> CEF (mapeo y escape)
│  └─ io/
│     ├─ syslogServer.js       # Entrada SYSLOG UDP/TCP
│     └─ cefOutput.js          # Salida CEF UDP/TCP (host + puerto)
├─ views/
│  └─ index.ejs                # UI (sin CSS inline)
└─ public/
   ├─ css/style.css            # Estilos UI
   └─ js/app.js                # Lógica cliente (fetch API + SSE)

🔧 Requisitos

Node.js ≥ 16

Puertos elegidos libres en el sistema.

(Windows) Permitir Node.js en el firewall para redes privadas al primer arranque.

🚀 Instalación
git clone <repo>
cd syslog2cef
npm install
npm run start        # UI en http://localhost:3000 (o el uiPort de config.json)
# Desarrollo con autoreload:
# npm run dev


El fichero config.json se crea la primera vez que guardas desde la UI (o al arrancar con defaults).

🖥️ Uso (UI)

Abre http://localhost:3000.

En Configuración:

Servicio: Iniciar / Detener.

Entrada (SYSLOG): protocolo (UDP/TCP) y puerto de escucha (p.ej. 1514).

Salida (CEF): Host/IP, protocolo (UDP/TCP) y puerto destino (p.ej. 5514).

Guardar para persistir.

Si cambias entrada/salida mientras el servicio está en marcha, el backend lo detiene para que lo reinicies con la nueva config.

Visualizador: muestra en tiempo real la trama recibida y la traducción CEF emitida.

⚙️ Configuración avanzada (config.json)

Ejemplo:

{
  "uiPort": 3000,
  "input":  { "protocol": "udp", "port": 1514 },
  "output": { "protocol": "udp", "host": "127.0.0.1", "port": 5514 },
  "running": false
}


Campos:

uiPort: puerto de la UI.

input.protocol: "udp" o "tcp".

input.port: puerto donde se escucha SYSLOG.

output.protocol: "udp" o "tcp".

output.host: IP o hostname destino de CEF.

output.port: puerto destino de CEF.

running: flag de “arrancar automáticamente” al iniciar la app.

Cambiar uiPort requiere reiniciar el proceso Node.

🧪 Pruebas end-to-end
A) UDP → UDP (local)

Receptor CEF en 5514:

node -e "const d=require('dgram').createSocket('udp4');d.on('message',m=>console.log('\n[CEF UDP]:',m.toString()));d.bind(5514,()=>console.log('👂 UDP 5514'));"


UI:

Entrada: UDP 1514

Salida: UDP 5514, Host/IP: 127.0.0.1

Guardar → Iniciar

Emisor SYSLOG al 1514:

node -e "const u=require('dgram').createSocket('udp4');const m='<134>Aug 26 10:15:30 mi-host app[1234]: user=jade action=login result=ok';u.send(Buffer.from(m),1514,'127.0.0.1',()=>{console.log('📨 SYSLOG UDP');u.close();});"

B) TCP → TCP (local)

Receptor CEF en 5515:

node -e "require('net').createServer(s=>s.on('data',d=>process.stdout.write('\n[CEF TCP]: '+d.toString()))).listen(5515,()=>console.log('👂 TCP 5515'));"


UI:

Entrada: TCP 1515

Salida: TCP 5515, Host/IP: 127.0.0.1

Guardar → Detener → Iniciar

Emisor SYSLOG (con \n):

node -e "const c=require('net').connect(1515,'127.0.0.1',()=>{c.write('<190>2025-08-26T10:22:00Z host-02 kernel: src=10.0.0.1 dst=10.0.0.2 action=drop\\n');c.end();console.log('📨 SYSLOG TCP');});"

C) UDP → UDP a host remoto (LAN)

En el host B (IP 192.168.1.50):

node -e "const d=require('dgram').createSocket('udp4');d.on('message',m=>console.log('\n[B][CEF UDP]:',m.toString()));d.bind(5514,()=>console.log('👂 [B] UDP 5514'));"


En UI del host A:

Entrada: UDP 1514

Salida: UDP 5514, Host/IP: 192.168.1.50

Guardar → Iniciar
Envío desde A:

node -e "const u=require('dgram').createSocket('udp4');const m='<134>Aug 26 12:00:00 fw-01 policy[999]: event=allow proto=tcp sport=12345 dport=443';u.send(Buffer.from(m),1514,'127.0.0.1',()=>u.close());"

🔁 Ejecución como servicio (pm2)
npm i -g pm2
pm2 start src/app.js --name syslog2cef
pm2 save
pm2 startup   # sigue las instrucciones para arranque al boot


Comandos útiles:

pm2 logs syslog2cef
pm2 restart syslog2cef
pm2 stop syslog2cef

📦 API (para integraciones)

GET /api/config → Config actual.

POST /api/config → { input:{protocol,port}, output:{protocol,port,host} }

Devuelve { ok: boolean, running: boolean }.

POST /api/start → Arranca servicio. Devuelve { ok, running:true }.

POST /api/stop → Detiene servicio. Devuelve { ok, running:false }.

GET /api/stream → SSE con eventos:

{ "type": "sample",
  "payload": { "raw": "<syslog...>", "cef": "CEF:0|...", "when": "ISO", "from": "UDP x.x.x.x:port" } }

🧠 Traducción SYSLOG → CEF (resumen)

Intenta extraer:

<PRI> → usado en signatureId (p.ej., syslog-134).

timestamp, hostname, message (heurísticas tolerantes a RFC3164 y RFC5424).

CEF base:

CEF:0|Custom|Syslog2CEF|1.0|<signatureId>|Translated syslog|0|


Extensiones:

msg=<message>

shost=<hostname>

rt=<epochMillis>

deviceInboundInterface=udp|tcp

cs1=<syslog sin PRI>

Pares k=v del mensaje → cs2Label=k cs2=v … hasta cs6.

🛠️ Personalización (en src/services/translator.js):

Sustituye pares k=v por extensiones CEF estándar cuando aplique:

src, dst, suser, duser, proto, spt, dpt, act, etc.

Si tu fuente emite | en el texto, considera escaparlo también (por defecto escapamos \ y =).

🔐 Seguridad y redes

Abre únicamente los puertos necesarios en el firewall.

En TCP, los mensajes se procesan por líneas (requiere \n).

No se implementa TLS por defecto (puede añadirse si tu SIEM lo requiere).

No hay autenticación en la UI (pensada para entornos controlados / redes internas).

🧩 Extensiones sugeridas

Bind de entrada a una IP concreta (no 0.0.0.0).

TLS en TCP (entrada/salida).

Logs a fichero/rotate.

Mapeos CEF específicos por origen (normalización avanzada).

Cola/buffer y reintentos para salida TCP persistente.

🧰 Solución de problemas

La consola “se cierra sola” en Windows: ejecuta desde PowerShell o usa un .bat con pause.

EADDRINUSE: cambia uiPort o los puertos de entrada/salida.

No veo CEF en destino:

Revisa firewall del destino.

Verifica host/IP y puerto en la UI.

En TCP, asegúrate de que el receptor escucha y de que hay \n al final del mensaje.

Cannot find module 'express': npm install en la raíz del proyecto.

🤝 Contribuir

Crea una rama desde main.

Cambios con estilo consistente y comentarios claros.

PR con descripción del cambio y pruebas realizadas.

📄 Licencia

MIT (o la que decidas). Añade un LICENSE si procede.

📬 Contacto

Para dudas técnicas sobre despliegue, mapeo CEF o soporte de nuevas fuentes SYSLOG, añadid un issue o comentad en el PR. Si queréis que dejemos bind de entrada por interfaz, TLS o un mapeo CEF estándar por tipo de evento, lo incorporamos rápido.