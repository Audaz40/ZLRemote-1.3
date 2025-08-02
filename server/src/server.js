// Importamos las clases de nuestros servidores
const WebSocketServer = require('./WebSocketServer'); // El archivo que acabas de renombrar
const ZLRemoteAPI = require('./api/RestAPI');

// Cargar variables de entorno desde .env
require('dotenv').config({ path: '../.env.production' });

console.log("🚀 Initializing ZLRemote Backend...");

// 1. Crear una instancia del servidor WebSocket
const zlWebSocketServer = new WebSocketServer();

// 2. Crear una instancia de la API REST y pasarle la instancia del WebSocketServer
//    Esto es clave: ahora la API puede acceder a las sesiones y clientes del WebSocket.
const zlApiServer = new ZLRemoteAPI(zlWebSocketServer, process.env.API_PORT || 3002);

// 3. Iniciar ambos servidores
zlWebSocketServer.start();
zlApiServer.start();

console.log("✅ ZLRemote Backend is running.");
console.log(`-> WebSocket Server on port: ${zlWebSocketServer.port}`);
console.log(`-> API Server on port: ${zlApiServer.port}`);

// Manejar cierre limpio
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down servers...');
    zlWebSocketServer.stop();
    zlApiServer.stop();
    process.exit(0);
});