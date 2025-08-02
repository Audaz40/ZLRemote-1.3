const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

class WebSocketServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3001;
        this.sessions = new Map();
        this.clients = new Map();
        
        this.setupExpress();
        this.setupWebSocketServer();
    }

    setupExpress() {
        // --- Configuración de CORS ---
        const allowedOrigins = [
            'http://localhost:3000',                // Desarrollo Web
            'https://zlremote-13-production.up.railway.app/',  // Tu dominio de producción
            'https://zlremote.netlify.app'             // ¡RECUERDA CAMBIAR ESTO POR TU URL DE NETLIFY!
        ];
        const corsOptions = {
            origin: function (origin, callback) {
                if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true
        };
        this.app.use(cors(corsOptions));
        // --- Fin de CORS ---
        
        this.app.use(express.json());
        
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                sessions: this.sessions.size,
                clients: this.clients.size,
                timestamp: new Date().toISOString()
            });
        });

        this.server = require('http').createServer(this.app);
    }

    setupWebSocketServer() {
        this.wss = new WebSocket.Server({ server: this.server });

        this.wss.on('connection', (ws, req) => {
            const clientId = uuidv4();
            ws.clientId = clientId;
            
            this.clients.set(clientId, {
                socket: ws,
                type: null,
                sessionId: null,
                deviceInfo: null,
                connectedAt: Date.now()
            });

            console.log(`[WebSocket] Client connected: ${clientId}`);

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleMessage(ws, message);
                } catch (error) {
                    console.error('[WebSocket] Invalid message:', error);
                }
            });

            ws.on('close', () => {
                this.handleDisconnect(clientId);
            });

            ws.on('error', (error) => {
                console.error(`[WebSocket] Client ${clientId} error:`, error);
            });

            ws.send(JSON.stringify({
                type: 'client_id',
                clientId: clientId
            }));
        });
    }

    handleMessage(ws, message) {
        console.log(`[WebSocket] Message from ${ws.clientId}: ${message.type}`);
        
        switch (message.type) {
            case 'register_host':
                this.registerHost(ws, message);
                break;
            case 'connect_to_host':
                this.connectToHost(ws, message);
                break;
            case 'viewer_ready':
                this.notifyHostViewerReady(ws);
                break;
            case 'webrtc_offer':
                this.relayWebRTCOffer(ws, message);
                break;
            case 'webrtc_answer':
                this.relayWebRTCAnswer(ws, message);
                break;
            case 'ice_candidate':
                this.relayICECandidate(ws, message);
                break;
            case 'input_event':
                this.relayInputEvent(ws, message);
                break;
            case 'chat_message':
                this.relayChatMessage(ws, message);
                break;
        }
    }

    registerHost(ws, message) {
        const sessionId = this.generateSessionId();
        const client = this.clients.get(ws.clientId);
        
        client.type = 'host';
        client.sessionId = sessionId;
        client.deviceInfo = message.deviceInfo;

        this.sessions.set(sessionId, {
            hostId: ws.clientId,
            viewers: new Set(),
            password: message.password || null,
            createdAt: Date.now(),
            settings: message.settings || {}
        });

        ws.send(JSON.stringify({
            type: 'host_registered',
            sessionId: sessionId
        }));

        console.log(`[Session] Host registered: ${sessionId} by ${ws.clientId}`);
    }

    connectToHost(ws, message) {
        const session = this.sessions.get(message.sessionId);
        
        if (!session) {
            ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
            return;
        }

        if (session.password && session.password !== message.password) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid password' }));
            return;
        }

        const client = this.clients.get(ws.clientId);
        client.type = 'viewer';
        client.sessionId = message.sessionId;
        session.viewers.add(ws.clientId);

        const hostClient = this.clients.get(session.hostId);
        if (hostClient && hostClient.socket.readyState === WebSocket.OPEN) {
            hostClient.socket.send(JSON.stringify({ type: 'viewer_joined', viewerId: ws.clientId }));
        }

        ws.send(JSON.stringify({ type: 'connected_to_host', sessionId: message.sessionId }));
        console.log(`[Session] Viewer ${ws.clientId} connected to session ${message.sessionId}`);
    }

    notifyHostViewerReady(ws) {
        const client = this.clients.get(ws.clientId);
        const session = this.sessions.get(client.sessionId);
        if (!session) return;

        const hostClient = this.clients.get(session.hostId);
        if (hostClient && hostClient.socket.readyState === WebSocket.OPEN) {
            hostClient.socket.send(JSON.stringify({ type: 'viewer_ready', viewerId: ws.clientId }));
        }
    }

    relayWebRTCOffer(ws, message) {
        const client = this.clients.get(ws.clientId);
        const session = this.sessions.get(message.sessionId || client.sessionId);
        if (!session) return;
        
        if (client.type === 'host') {
            session.viewers.forEach(viewerId => {
                const viewer = this.clients.get(viewerId);
                if (viewer && viewer.socket.readyState === WebSocket.OPEN) {
                    viewer.socket.send(JSON.stringify({ type: 'webrtc_offer', offer: message.offer, hostId: ws.clientId }));
                }
            });
        }
    }

    relayWebRTCAnswer(ws, message) {
        const client = this.clients.get(ws.clientId);
        const session = this.sessions.get(client.sessionId);
        if (!session) return;

        const host = this.clients.get(session.hostId);
        if (host && host.socket.readyState === WebSocket.OPEN) {
            host.socket.send(JSON.stringify({ type: 'webrtc_answer', answer: message.answer, viewerId: ws.clientId }));
        }
    }

    relayICECandidate(ws, message) {
        const client = this.clients.get(ws.clientId);
        const session = this.sessions.get(client.sessionId || message.sessionId);
        if (!session) return;
        
        const targetIsHost = client.type === 'viewer';
        const recipients = targetIsHost ? [session.hostId] : Array.from(session.viewers);
        
        recipients.forEach(recipientId => {
            if (recipientId !== ws.clientId) {
                const recipient = this.clients.get(recipientId);
                if (recipient && recipient.socket.readyState === WebSocket.OPEN) {
                    recipient.socket.send(JSON.stringify({ type: 'ice_candidate', candidate: message.candidate, senderId: ws.clientId }));
                }
            }
        });
    }

    relayInputEvent(ws, message) {
        const client = this.clients.get(ws.clientId);
        const session = this.sessions.get(client.sessionId);
        if (!session || client.type !== 'viewer') return;

        const hostClient = this.clients.get(session.hostId);
        if (hostClient && hostClient.socket.readyState === WebSocket.OPEN) {
            hostClient.socket.send(JSON.stringify({ type: 'input_event', data: message.data, viewerId: ws.clientId }));
        }
    }

    relayChatMessage(ws, message) {
        const client = this.clients.get(ws.clientId);
        const session = this.sessions.get(client.sessionId);
        if (!session) return;

        const chatMessage = {
            type: 'chat_message',
            data: { ...message.data, senderId: ws.clientId, senderType: client.type, timestamp: Date.now() }
        };

        const allParticipants = [session.hostId, ...session.viewers];
        allParticipants.forEach(participantId => {
            if (participantId !== ws.clientId) {
                const participant = this.clients.get(participantId);
                if (participant && participant.socket.readyState === WebSocket.OPEN) {
                    participant.socket.send(JSON.stringify(chatMessage));
                }
            }
        });
    }

    handleDisconnect(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        console.log(`[WebSocket] Client disconnected: ${clientId} (${client.type})`);

        if (client.sessionId) {
            const session = this.sessions.get(client.sessionId);
            if (session) {
                if (client.type === 'host') {
                    session.viewers.forEach(viewerId => {
                        const viewer = this.clients.get(viewerId);
                        if (viewer && viewer.socket.readyState === WebSocket.OPEN) {
                            viewer.socket.send(JSON.stringify({ type: 'host_disconnected' }));
                        }
                    });
                    this.sessions.delete(client.sessionId);
                    console.log(`[Session] Session closed: ${client.sessionId}`);
                } else if (client.type === 'viewer') {
                    session.viewers.delete(clientId);
                    const host = this.clients.get(session.hostId);
                    if (host && host.socket.readyState === WebSocket.OPEN) {
                        host.socket.send(JSON.stringify({ type: 'viewer_left', viewerId: clientId }));
                    }
                }
            }
        }
        this.clients.delete(clientId);
    }

    generateSessionId() {
        return Math.random().toString(36).substr(2, 8).toUpperCase();
    }

    start() {
        this.server.listen(this.port, '0.0.0.0', () => {
            // Log de inicio ahora en el archivo principal server.js
        });
    }

    stop() {
        this.wss.close();
        this.server.close();
        console.log('[WebSocket] Server stopped.');
    }
}

module.exports = WebSocketServer;