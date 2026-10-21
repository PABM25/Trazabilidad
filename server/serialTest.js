const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
require('dotenv').config(); // Asegúrate de que dotenv está importado

// Lee las variables de entorno
const serialPortPath = process.env.SERIAL_PORT || 'COM3';
const baudRate = parseInt(process.env.BAUD_RATE, 10) || 9600;

//Se crea la instacia de SerialPort
const portSerial = new SerialPort({
    path: serialPortPath,
    baudRate: baudRate
});

//Configura el parser de datos
const parser = portSerial.pipe(new ReadlineParser({ delimiter: '\n' }));

//Se define el evento para recibir los datos
parser.on('data', (data) => {
    console.log(`Datos recibidos: ${data}`);
});

//Manejo de errores
portSerial.on('error', (err) => {
    console.error(`Error en puerto serial: ${err.message}`);
});


console.log(`Esperando datos en ${serialPortPath} a ${baudRate} baudios...`);
