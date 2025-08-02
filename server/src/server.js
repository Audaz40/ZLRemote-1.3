// Cargar variables de entorno del archivo .env (útil para desarrollo local)
require('dotenv').config();

// --- Dependencias ---
const http = require('http');
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// --- Configuración Principal ---
// Usa el puerto que Railway proporciona, o 3001 si se ejecuta localmente.
const PORT = process.env.PORT || 3001; 
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server }); // Vincula WebSocket al mismo servidor HTTP

// --- Almacenamiento en Memoria ---
const sessions = new Map();
const clients = new Map();

// --- Configuración de Express (API & CORS) ---
// Lista de orígenes permitidos para conectarse a tu servidor.
const allowedOrigins = [
    'http://localhost:3000',                  // Para pruebas de la web en tu PC
    'https://zlremote.netlify.app',           // TU URL DE NETLIFY (Frontend)
    'https://zlremote-13-production.up.railway.app' // TU URL DE RAILWAY (Backend)
];

app.use(cors({
    origin: function (origin, callback) {
        // Permite peticiones si vienen de la lista o si no tienen origen (como la app desktop)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS: Acceso denegado para el origen: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    }
}));
app.use(express.json());

// --- Rutas de la API ---

// Ruta de "salud" para que Railway sepa que el servidor está vivo.
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', sessions: sessions.size, clients: clients.size, timestamp: new Date().toISOString() });
});

// Ruta para que los clientes obtengan la configuración de los servidores STUN/TURN.
app.get('/api/v1/ice-servers', (req, res) => {
    // Nota: Por ahora, sin servidor TURN en Railway gratuito.
    // Esto funcionará para la mayoría de las redes.
    res.json({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    });
});

// --- Lógica del Servidor WebSocket ---
wss.on('connection', (ws) => {
    const clientId = uuidv4();
    ws.clientId = clientId;
    clients.set(clientId, { socket: ws, type: null, sessionId: null });
    console.log(`[+] Cliente conectado: ${clientId} (${clients.size} en total)`);

    // Envía al nuevo cliente su ID único.
    ws.send(JSON.stringify({ type: 'client_id', clientId }));

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            //console.log(`[->] Mensaje de ${clientId}: ${message.type}`); // Descomentar para depuración intensa
            handleWebSocketMessage(ws, message);
        } catch (e) {
            console.error(`Error procesando mensaje de ${clientId}:`, e);
        }
    });

    ws.on('close', () => {
        handleDisconnect(clientId);
    });

    ws.on('error', (error) => {
        console.error(`Error en la conexión del cliente ${clientId}:`, error);
    });
});

function handleWebSocketMessage(ws, message) {
    const client = clients.get(ws.clientId);
    if (!client) return;

    switch (message.type) {
        case 'register_host':
            const sessionId = Math.random().toString(36).substr(2, 8).toUpperCase();
            client.type = 'host';
            client.sessionId = sessionId;
            sessions.set(sessionId, { hostId: ws.clientId, viewers: new Set() });
            ws.send(JSON.stringify({ type: 'host_registered', sessionId }));
            console.log(`[*] Sesión creada: ${sessionId} por Host ${ws.clientId}`);
            break;
        
        case 'connect_to_host':
            const sessionToJoin = sessions.get(message.sessionId);
            if (sessionToJoin) {
                client.type = 'viewer';
                client.sessionId = message.sessionId;
                sessionToJoin.viewers.add(ws.clientId);

                const hostClient = clients.get(sessionToJoin.hostId);
                if (hostClient && hostClient.socket.readyState === WebSocket.OPEN) {
                    hostClient.socket.send(JSON.stringify({ type: 'viewer_joined', viewerId: ws.clientId }));
                }
                ws.send(JSON.stringify({ type: 'connected_to_host', sessionId: message.sessionId }));
                console.log(`[>] Viewer ${ws.clientId} se unió a la sesión ${message.sessionId}`);
            } else {
                ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
            }
            break;

        case 'webrtc_offer':
        case 'webrtc_answer':
        case 'ice_candidate':
        case 'input_event':
            relayP2PMessage(ws, message);
            break;
        
        case 'chat_message':
            relayChatMessage(ws, message);
            break;
    }
}

function relayP2PMessage(ws, message) {
    const sender = clients.get(ws.clientId);
    if (!sender || !sender.sessionId) return;
    
    const session = sessions.get(sender.sessionId);
    if (!session) return;

    const isHost = sender.type === 'host';
    // Si el host envía, el destinatario es un viewer específico. Si un viewer envía, es el host.
    const recipientId = isHost ? message.viewerId : session.hostId;
    
    if (!recipientId) { // Difusión a todos los viewers si no se especifica uno
        if(isHost) {
            session.viewers.forEach(vid => {
                const viewer = clients.get(vid);
                if(viewer && viewer.socket.readyState === WebSocket.OPEN){
                     viewer.socket.send(JSON.stringify({ ...message, senderId: ws.clientId }));
                }
            });
            return;
        }
    }
    
    const recipient = clients.get(recipientId);
    if (recipient && recipient.socket.readyState === WebSocket.OPEN) {
        // Añade el senderId para que el receptor sepa quién envió el mensaje
        recipient.socket.send(JSON.stringify({ ...message, senderId: ws.clientId }));
    }
}

function relayChatMessage(ws, message) {
    const sender = clients.get(ws.clientId);
    if (!sender || !sender.sessionId) return;
    
    const session = sessions.get(sender.sessionId);
    if (!session) return;

    const chatMessage = { ...message, senderId: ws.clientId, senderType: sender.type };
    const allParticipants = [session.hostId, ...session.viewers];

    allParticipants.forEach(participantId => {
        if (participantId !== ws.clientId) {
            const participant = clients.get(participantId);
            if (participant && participant.socket.readyState === WebSocket.OPEN) {
                participant.socket.send(JSON.stringify(chatMessage));
            }
        }
    });
}


function handleDisconnect(clientId) {
    const client = clients.get(clientId);
    if (!client) return;
    
    console.log(`[-] Cliente desconectado: ${clientId} (${client.type || 'unknown'})`);
    
    if (client.sessionId) {
        const session = sessions.get(client.sessionId);
        if (session) {
            if (client.type === 'host') {
                // El Host se fue, notificar a todos los viewers y cerrar la sesión
                session.viewers.forEach(viewerId => {
                    const viewer = clients.get(viewerId);
                    if (viewer && viewer.socket.readyState === WebSocket.OPEN) {
                        viewer.socket.send(JSON.stringify({ type: 'host_disconnected' }));
                    }
                });
                sessions.delete(client.sessionId);
                console.log(`[x] Sesión cerrada: ${client.sessionId}`);
            } else if (client.type === 'viewer') {
                // Un Viewer se fue, notificar al Host
                session.viewers.delete(clientId);
                const host = clients.get(session.hostId);
                if (host && host.socket.readyState === WebSocket.OPEN) {
                    host.socket.send(JSON.stringify({ type: 'viewer_left', viewerId: clientId }));
                }
            }
        }
    }
    clients.delete(clientId);
}

// --- Iniciar el Servidor ---
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ ZLRemote Server está en vivo y escuchando en el puerto ${PORT}`);
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
        console.log(`   URL Pública: https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
    }
});