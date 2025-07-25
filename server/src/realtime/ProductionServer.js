const WebSocket = require('ws');
const express = require('express');
const https = require('https');
const fs = require('fs');
const cors = require('cors');

class ProductionZLRemoteServer {
    constructor(options = {}) {
        this.port = options.port || 443;
        this.httpPort = options.httpPort || 80;
        this.app = express();
        this.server = null;
        this.wss = null;
        this.sessions = new Map();
        this.clients = new Map();
        this.relayServers = new Map();
        
        // STUN/TURN Configuration
        this.iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            // TURN servers (replace with your own)
            {
                urls: 'turn:your-turn-server.com:3478',
                username: 'zlremote',
                credential: process.env.TURN_PASSWORD || 'your-turn-password'
            },
            {
                urls: 'turns:your-turn-server.com:5349',
                username: 'zlremote',
                credential: process.env.TURN_PASSWORD || 'your-turn-password'
            }
        ];
        
        this.setupExpress();
        this.setupSSL();
    }

    setupExpress() {
        this.app.use(cors({
            origin: true,
            credentials: true
        }));
        
        this.app.use(express.json());
        this.app.use(express.static('public'));
        
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                sessions: this.sessions.size,
                clients: this.clients.size,
                uptime: process.uptime()
            });
        });
        
        // ICE servers endpoint
        this.app.get('/api/ice-servers', (req, res) => {
            res.json({
                iceServers: this.iceServers,
                iceTransportPolicy: 'all',
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require'
            });
        });
    }

    setupSSL() {
        try {
            // SSL Certificate paths
            const sslOptions = {
                key: fs.readFileSync(process.env.SSL_KEY_PATH || './ssl/private.key'),
                cert: fs.readFileSync(process.env.SSL_CERT_PATH || './ssl/certificate.crt'),
                ca: fs.readFileSync(process.env.SSL_CA_PATH || './ssl/ca.crt')
            };
            
            this.server = https.createServer(sslOptions, this.app);
        } catch (error) {
            console.warn('SSL certificates not found, using HTTP (not recommended for production)');
            this.server = require('http').createServer(this.app);
        }
    }

    start() {
        // Setup WebSocket server
        this.wss = new WebSocket.Server({ 
            server: this.server,
            perMessageDeflate: {
                zlibDeflateOptions: {
                    threshold: 1024,
                    concurrencyLimit: 10,
                },
                zlibInflateOptions: {
                    chunkSize: 16 * 1024,
                },
                clientMaxWindowBits: 15,
                serverMaxWindowBits: 15,
                serverMaxNoContextTakeover: false,
                clientMaxNoContextTakeover: false,
                threshold: 1024,
                concurrencyLimit: 10,
            }
        });
        
        this.setupWebSocketHandlers();
        
        this.server.listen(this.port, '0.0.0.0', () => {
            console.log(`🚀 ZLRemote Production Server running on port ${this.port}`);
            console.log(`🌐 External access: https://your-domain.com:${this.port}`);
            console.log(`📊 Health check: https://your-domain.com:${this.port}/health`);
        });
        
        // HTTP redirect to HTTPS
        if (this.port === 443) {
            const httpApp = express();
            httpApp.use((req, res) => {
                res.redirect(301, `https://${req.headers.host}${req.url}`);
            });
            httpApp.listen(this.httpPort, '0.0.0.0');
        }
    }

    setupWebSocketHandlers() {
        this.wss.on('connection', (ws, req) => {
            const clientId = this.generateId();
            const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            
            console.log(`🔗 New client connected: ${clientId} from ${clientIP}`);
            
            const client = {
                id: clientId,
                socket: ws,
                ip: clientIP,
                userAgent: req.headers['user-agent'],
                connectedAt: Date.now(),
                lastPing: Date.now(),
                sessionId: null,
                type: null,
                networkStats: {
                    packetsReceived: 0,
                    packetsSent: 0,
                    bytesReceived: 0,
                    bytesSent: 0,
                    latency: 0,
                    jitter: 0,
                    packetLoss: 0
                }
            };
            
            this.clients.set(clientId, client);
            
            // Send initial configuration
            this.sendMessage(ws, {
                type: 'client_config',
                clientId,
                iceServers: this.iceServers,
                serverFeatures: {
                    adaptiveQuality: true,
                    antiLag: true,
                    multiRelay: true,
                    encryption: true
                }
            });
            
            // Setup message handling
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleMessage(clientId, message);
                    client.networkStats.packetsReceived++;
                    client.networkStats.bytesReceived += data.length;
                } catch (error) {
                    console.error('Invalid message from client:', clientId, error);
                }
            });
            
            // Setup disconnect handling
            ws.on('close', () => {
                this.handleDisconnect(clientId);
            });
            
            // Setup error handling
            ws.on('error', (error) => {
                console.error(`Client ${clientId} error:`, error);
                this.handleDisconnect(clientId);
            });
            
            // Setup ping/pong for connection monitoring
            this.setupConnectionMonitoring(client);
        });
    }

    setupConnectionMonitoring(client) {
        const pingInterval = setInterval(() => {
            if (client.socket.readyState === WebSocket.OPEN) {
                const pingTime = Date.now();
                client.socket.ping();
                
                client.socket.once('pong', () => {
                    const latency = Date.now() - pingTime;
                    this.updateNetworkStats(client, latency);
                });
            } else {
                clearInterval(pingInterval);
            }
        }, 5000); // Ping every 5 seconds
    }

    updateNetworkStats(client, latency) {
        const stats = client.networkStats;
        
        // Update latency with exponential moving average
        stats.latency = stats.latency * 0.8 + latency * 0.2;
        
        // Calculate jitter
        const jitter = Math.abs(latency - stats.latency);
        stats.jitter = stats.jitter * 0.9 + jitter * 0.1;
        
        // Update last ping time
        client.lastPing = Date.now();
        
        // Send network stats to client for adaptation
        this.sendMessage(client.socket, {
            type: 'network_stats',
            stats: {
                latency: Math.round(stats.latency),
                jitter: Math.round(stats.jitter),
                packetLoss: stats.packetLoss,
                quality: this.calculateConnectionQuality(stats)
            }
        });
    }

    calculateConnectionQuality(stats) {
        if (stats.latency < 50 && stats.jitter < 10 && stats.packetLoss < 0.1) {
            return 'excellent';
        } else if (stats.latency < 100 && stats.jitter < 20 && stats.packetLoss < 1) {
            return 'good';
        } else if (stats.latency < 200 && stats.jitter < 50 && stats.packetLoss < 3) {
            return 'fair';
        } else {
            return 'poor';
        }
    }

    handleMessage(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client) return;

        switch (message.type) {
            case 'register_host':
                this.registerHost(client, message);
                break;
            case 'connect_to_host':
                this.connectToHost(client, message);
                break;
            case 'webrtc_signal':
                this.relayWebRTCSignal(client, message);
                break;
            case 'stream_data':
                this.relayStreamData(client, message);
                break;
            case 'input_event':
                this.relayInputEvent(client, message);
                break;
            case 'network_feedback':
                this.handleNetworkFeedback(client, message);
                break;
        }
    }

    registerHost(client, message) {
        const sessionId = this.generateSessionId();
        
        const session = {
            id: sessionId,
            hostId: client.id,
            viewers: new Set(),
            createdAt: Date.now(),
            password: message.password,
            settings: {
                quality: message.quality || 'adaptive',
                maxFPS: message.maxFPS || 144,
                adaptiveBitrate: true,
                antiLag: true,
                ...message.settings
            },
            stats: {
                totalViewers: 0,
                dataTransferred: 0,
                avgLatency: 0,
                quality: 'excellent'
            }
        };
        
        this.sessions.set(sessionId, session);
        client.sessionId = sessionId;
        client.type = 'host';
        
        this.sendMessage(client.socket, {
            type: 'host_registered',
            sessionId,
            externalUrl: `https://your-domain.com/join/${sessionId}`,
            qrCode: this.generateQRCode(sessionId)
        });
        
        console.log(`📡 Host registered: ${sessionId} by ${client.ip}`);
    }

    generateQRCode(sessionId) {
        // Generate QR code data URL for easy sharing
        const joinUrl = `https://your-domain.com/join/${sessionId}`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`;
    }

    sendMessage(socket, message) {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
        }
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    generateSessionId() {
        return Math.random().toString(36).substr(2, 8).toUpperCase();
    }
}

module.exports = ProductionZLRemoteServer;