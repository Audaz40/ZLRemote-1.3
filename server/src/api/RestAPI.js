const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * @typedef {import('../WebSocketServer')} WebSocketServer
 */

class ZLRemoteAPI {
    /**
     * @param {WebSocketServer} zlServer
     * @param {number} port
     */
    constructor(zlServer, port = 3002) {
        this.zlServer = zlServer;
        this.app = express();
        this.port = port;
        this.apiKeys = new Map();
        this.webhooks = new Map();
        this.server = null;
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        this.app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
        
        const allowedOrigins = [
            'http://localhost:3000',
            'https://zlremote-13-production.up.railway.app/',  // Tu dominio de producción
            'https://zlremote.netlify.app'
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

        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 100,
            standardHeaders: true,
            legacyHeaders: false
        });
        this.app.use('/api/', limiter);

        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        this.app.use((req, res, next) => {
            console.log(`[API] ${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        const router = express.Router();
        
        // Endpoint para obtener la configuración de WebRTC (STUN/TURN)
        router.get('/ice-servers', (req, res) => {
            res.json({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    {
                        urls: [
                            `turn:${process.env.DOMAIN || 'localhost'}:3478?transport=udp`,
                            `turn:${process.env.DOMAIN || 'localhost'}:3478?transport=tcp`
                        ],
                        username: "zlremote",
                        credential: process.env.TURN_PASSWORD
                    },
                    {
                        urls: `turns:${process.env.DOMAIN || 'localhost'}:5349?transport=tcp`,
                        username: "zlremote",
                        credential: process.env.TURN_PASSWORD
                    }
                ]
            });
        });

        // Autenticación (ejemplos)
        router.post('/auth/login', (req, res) => this.login(req, res));
        router.post('/auth/apikey', (req, res, next) => this.authenticateUser(req, res, next), (req, res) => this.generateApiKey(req, res));

        // Sesiones (ahora puede acceder a zlServer.sessions)
        router.get('/sessions', (req, res) => this.getSessions(req, res));

        this.app.use('/api/v1', router);
    }

    setupErrorHandling() {
        this.app.use('*', (req, res) => {
            res.status(404).json({ error: 'Endpoint not found' });
        });
        this.app.use((error, req, res, next) => {
            console.error('[API] Error:', error);
            res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
        });
    }

    authenticateUser(req, res, next) {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'No token provided' });

        try {
            req.user = jwt.verify(token, process.env.JWT_SECRET || 'zlremote-secret');
            next();
        } catch (error) {
            res.status(401).json({ error: 'Invalid token' });
        }
    }

    async login(req, res) {
        const { username, password } = req.body;
        if (username === 'admin' && password === 'admin123') {
            const token = jwt.sign(
                { userId: 1, username: 'admin', role: 'admin' },
                process.env.JWT_SECRET || 'zlremote-secret',
                { expiresIn: '24h' }
            );
            return res.json({ token, user: { id: 1, username: 'admin' } });
        }
        res.status(401).json({ error: 'Invalid credentials' });
    }

    async generateApiKey(req, res) {
        const apiKey = `zlr_${uuidv4().replace(/-/g, '')}`;
        this.apiKeys.set(apiKey, { userId: req.user.userId, createdAt: Date.now() });
        res.status(201).json({ apiKey });
    }

    getSessions(req, res) {
        // Ahora podemos acceder a las sesiones del servidor WebSocket
        const sessions = Array.from(this.zlServer.sessions.values()).map(s => ({
            id: s.id,
            hostId: s.hostId,
            viewerCount: s.viewers.size,
            createdAt: s.createdAt
        }));
        res.json({ sessions });
    }

    start() {
        this.server = this.app.listen(this.port, () => {
            // Log de inicio ahora en el archivo principal server.js
        });
        return this.server;
    }

    stop() {
        if (this.server) {
            this.server.close(() => {
                console.log('[API] Server stopped.');
            });
        }
    }
}

module.exports = ZLRemoteAPI;