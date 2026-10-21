/**
 * Puente HTTP para lectores RFID conectados por puerto serial (Arduino, etc.).
 *
 * El lector debe enviar una línea por lectura, por ejemplo "UID: 04A1B2C3" o "04A1B2C3".
 * La aplicación web consulta GET /api/ultimo-uid cada segundo.
 *
 * Los datos (activos, eventos, usuarios) viven en Supabase; este servidor no guarda nada.
 *
 * Variables de entorno (.env):
 *   PORT=3000
 *   SERIAL_PORT=COM6          puerto del lector
 *   BAUD_RATE=9600
 *   SIMULAR=true              sin lector físico: las lecturas se envían con POST /api/simular
 *   ORIGEN_PERMITIDO=http://localhost:5173   URL(s) de la app web, separadas por coma
 *   HOST=127.0.0.1            interfaz de red; 127.0.0.1 = solo este equipo
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const puerto = process.env.PORT || 3000;
const host = process.env.HOST || '127.0.0.1';
const simular = process.env.SIMULAR === 'true';
const origenes = (process.env.ORIGEN_PERMITIDO || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

// Solo la app web configurada puede leer los códigos escaneados
app.disable('x-powered-by');
// Chrome pide este permiso cuando una página publicada (https) consulta a localhost.
// Va antes de cors(), que responde la consulta previa del navegador y corta la cadena.
app.use((req, res, next) => {
    if (req.headers['access-control-request-private-network']) {
        res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    next();
});
app.use(cors({ origin: origenes }));
app.use(express.json({ limit: '1kb' }));

// Un UID válido: letras, números y separadores comunes, sin textos arbitrarios
const UID_VALIDO = /^[A-Za-z0-9:_-]{1,64}$/;

let ultimaLectura = { uid: null, leido_en: null };
let conectado = false;

const registrarLectura = (texto) => {
    const uid = String(texto).trim().replace(/^UID:\s*/i, '').replace(/\s+/g, '');
    if (!UID_VALIDO.test(uid)) return false;
    ultimaLectura = { uid, leido_en: Date.now() };
    console.log(`Lectura: ${uid}`);
    return true;
};

if (simular) {
    conectado = true;
    console.log('Modo simulación: envía lecturas con POST /api/simular {"uid": "ABC123"}');
} else {
    const { SerialPort } = require('serialport');
    const { ReadlineParser } = require('@serialport/parser-readline');

    const ruta = process.env.SERIAL_PORT || 'COM6';
    const baudRate = parseInt(process.env.BAUD_RATE, 10) || 9600;

    const abrir = () => {
        const serial = new SerialPort({ path: ruta, baudRate, autoOpen: false });
        serial.pipe(new ReadlineParser({ delimiter: '\n' })).on('data', registrarLectura);
        serial.on('open', () => {
            conectado = true;
            console.log(`Lector conectado en ${ruta} a ${baudRate} baudios`);
        });
        serial.on('close', () => {
            conectado = false;
            console.log('Lector desconectado, reintentando en 5 s…');
            setTimeout(abrir, 5000);
        });
        serial.open((err) => {
            if (err) {
                conectado = false;
                console.error(`No se pudo abrir ${ruta}: ${err.message}. Reintentando en 5 s…`);
                setTimeout(abrir, 5000);
            }
        });
    };
    abrir();
}

app.get('/api/ultimo-uid', (req, res) => {
    res.json({ ...ultimaLectura, conectado });
});

if (simular) {
    app.post('/api/simular', (req, res) => {
        if (!registrarLectura(req.body?.uid ?? '')) return res.status(400).json({ error: 'uid inválido' });
        res.json(ultimaLectura);
    });
}

app.listen(puerto, host, () => {
    console.log(`Puente del lector en http://${host}:${puerto} (app permitida: ${origenes.join(', ')})`);
});
