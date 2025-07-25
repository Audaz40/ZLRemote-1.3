const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * @typedef {Object} ZLServerType
 * @property {Map} sessions
 * @property {Map} clients
 * @property {Function} generateSessionId
 */

/**
 * ZLRemote REST API Server
 */
class ZLRemoteAPI {
    /**
     * @param {ZLServerType} zlServer 
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
        // Seguridad
        this.app.use(helmet({
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false
        }));
        
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
            credentials: true
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 100, // máximo 100 requests por ventana
            message: {
                error: 'Too many requests',
                retryAfter: '15 minutes'
            },
            standardHeaders: true,
            legacyHeaders: false
        });
        this.app.use('/api/', limiter);

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        const router = express.Router();

        // Autenticación
        router.post('/auth/login', (req, res) => this.login(req, res));
        router.post('/auth/register', (req, res) => this.register(req, res));
        router.post('/auth/apikey', (req, res, next) => this.authenticateUser(req, res, next), (req, res) => this.generateApiKey(req, res));

        // Sesiones
        router.get('/sessions', (req, res, next) => this.authenticateAPI(req, res, next), (req, res) => this.getSessions(req, res));
        router.post('/sessions', (req, res, next) => this.authenticateAPI(req, res, next), (req, res) => this.createSession(req, res));
        router.get('/sessions/:id', (req, res, next) => this.authenticateAPI(req, res, next), (req, res) => this.getSession(req, res));
        router.delete('/sessions/:id', (req, res, next) => this.authenticateAPI(req, res, next), (req, res) => this.deleteSession(req, res));
        router.post('/sessions/:id/control', (req, res, next) => this.authenticateAPI(req, res, next), (req, res) => this.controlSession(req, res));

        // Grabaciones
        router.get('/recordings', (req, res, next) => this.authenticateAPI(req, res, next), (req, res) => this.getRecordings(req, res));
        router.get('/recordings/:id', (req, res, next) => this.authenticateAPI(req, res, next), (req, res) => this.getRecording(req, res));
        router.get('/recordings/:id/download', (req, res, next) => this.authenticateAPI(req, res, next), (req, res) => this.downloadRecording(req, res));
        router.delete('/recordings/:id', (req, res, next) => this.authenticateAPI(req, res, next), (req, res) => this.deleteRecording(req, res));

        // Estadísticas
        router.get('/stats', (req, res, next) => this.authenticateAPI(req, res, next), (req, res) => this.getStats(req, res));
        router.get('/stats/sessions', (req, res, next) => this.authenticateAPI(req, res, next), (req, res) => this.getSessionStats(req, res));
        router.get('/stats/performance', (req, res, next) => this.authenticateAPI(req, res, next), (req, res) => this.getPerformanceStats(req, res));

        // Webhooks
        router.post('/webhooks', (req, res, next) => this.authenticateAPI(req, res, next), (req, res) => this.createWebhook(req, res));
        router.get('/webhooks', (req, res, next) => this.authenticateAPI(req, res, next), (req, res) => this.getWebhooks(req, res));
        router.delete('/webhooks/:id', (req, res, next) => this.authenticateAPI(req, res, next), (req, res) => this.deleteWebhook(req, res));

        // Configuración
        router.get('/config', (req, res, next) => this.authenticateAPI(req, res, next), (req, res) => this.getConfig(req, res));
        router.put('/config', (req, res, next) => this.authenticateAPI(req, res, next), (req, res) => this.updateConfig(req, res));

        // Salud del sistema
        router.get('/health', (req, res) => this.getHealth(req, res));
        router.get('/metrics', (req, res, next) => this.authenticateAPI(req, res, next), (req, res) => this.getMetrics(req, res));

        this.app.use('/api/v1', router);

        // Documentación API
        this.app.get('/api/docs', (req, res) => {
            res.json(this.getAPIDocumentation());
        });
    }

    setupErrorHandling() {
        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Endpoint not found',
                message: `${req.method} ${req.originalUrl} does not exist`
            });
        });

        // Error handler
        this.app.use((error, req, res, next) => {
            console.error('API Error:', error);
            res.status(error.status || 500).json({
                error: error.message || 'Internal server error',
                timestamp: new Date().toISOString(),
                path: req.path
            });
        });
    }

    // Middleware de autenticación
    authenticateUser(req, res, next) {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'zlremote-secret');
            req.user = decoded;
            next();
        } catch (error) {
            res.status(401).json({ error: 'Invalid token' });
        }
    }

    authenticateAPI(req, res, next) {
        const apiKey = req.headers['x-api-key'] || req.query.apiKey;
        
        if (!apiKey) {
            return res.status(401).json({ error: 'API key required' });
        }

        const keyData = this.apiKeys.get(apiKey);
        if (!keyData || keyData.expiresAt < Date.now()) {
            return res.status(401).json({ error: 'Invalid or expired API key' });
        }

        req.apiKey = keyData;
        next();
    }

    // Endpoints (rest of methods remain the same but with explicit return types)
    async login(req, res) {
        try {
            const { username, password } = req.body;
            
            if (username === 'admin' && password === 'admin123') {
                const token = jwt.sign(
                    { userId: 1, username: 'admin', role: 'admin' },
                    process.env.JWT_SECRET || 'zlremote-secret',
                    { expiresIn: '24h' }
                );
                
                res.json({
                    token,
                    user: { id: 1, username: 'admin', role: 'admin' },
                    expiresIn: '24h'
                });
            } else {
                res.status(401).json({ error: 'Invalid credentials' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async register(req, res) {
        try {
            const { username, password, email } = req.body;
            
            if (!username || !password || !email) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            
            res.status(201).json({
                message: 'User registered successfully',
                user: { username, email }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async generateApiKey(req, res) {
        try {
            const { name, permissions = [], expiresIn = '30d' } = req.body;
            
            const apiKey = `zlr_${uuidv4().replace(/-/g, '')}`;
            const expirationMs = this.parseExpiration(expiresIn);
            
            const keyData = {
                key: apiKey,
                name,
                userId: req.user.userId,
                permissions,
                createdAt: Date.now(),
                expiresAt: Date.now() + expirationMs,
                lastUsed: null,
                requestCount: 0
            };

            this.apiKeys.set(apiKey, keyData);
            
            res.status(201).json({
                apiKey,
                name,
                permissions,
                expiresAt: new Date(keyData.expiresAt).toISOString()
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Resto de métodos permanecen igual...
    async getSessions(req, res) {
        try {
            const { status, limit = 50, offset = 0 } = req.query;
            
            const sessions = Array.from(this.zlServer.sessions.entries()).map(([id, session]) => ({
                id,
                status: session.viewers.size > 0 ? 'active' : 'idle',
                viewerCount: session.viewers.size,
                hasPassword: !!session.password,
                createdAt: session.createdAt || Date.now(),
                hostInfo: session.hostInfo || {}
            }));

            const filteredSessions = status ? 
                sessions.filter(s => s.status === status) : 
                sessions;

            const paginatedSessions = filteredSessions.slice(Number(offset), Number(offset) + Number(limit));

            res.json({
                sessions: paginatedSessions,
                total: filteredSessions.length,
                limit: Number(limit),
                offset: Number(offset)
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getHealth(req, res) {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            services: {
                websocket: this.zlServer ? 'up' : 'down',
                api: 'up'
            },
            uptime: process.uptime()
        };

        res.json(health);
    }

    getAPIDocumentation() {
        return {
            name: 'ZLRemote API',
            version: '1.0.0',
            description: 'REST API for ZLRemote management and integration',
            baseUrl: `http://localhost:${this.port}/api/v1`,
            authentication: {
                type: 'API Key',
                header: 'X-API-Key',
                description: 'Obtain an API key by logging in and calling /auth/apikey'
            },
            endpoints: {
                auth: {
                    'POST /auth/login': 'Login with username/password',
                    'POST /auth/register': 'Register new user',
                    'POST /auth/apikey': 'Generate API key (requires login)'
                },
                sessions: {
                    'GET /sessions': 'List all sessions',
                    'POST /sessions': 'Create new session',
                    'GET /sessions/:id': 'Get session details',
                    'DELETE /sessions/:id': 'Delete session',
                    'POST /sessions/:id/control': 'Control session (kick viewers, etc.)'
                },
                stats: {
                    'GET /stats': 'Get general statistics',
                    'GET /health': 'Check API health'
                },
                webhooks: {
                    'POST /webhooks': 'Create webhook',
                    'GET /webhooks': 'List webhooks',
                    'DELETE /webhooks/:id': 'Delete webhook'
                }
            }
        };
    }

    parseExpiration(expiresIn) {
        const units = {
            'd': 24 * 60 * 60 * 1000,
            'h': 60 * 60 * 1000,
            'm': 60 * 1000,
            's': 1000
        };

        const match = expiresIn.match(/^(\d+)([dhms])$/);
        if (!match) {
            throw new Error('Invalid expiration format');
        }

        const [, value, unit] = match;
        return parseInt(value) * units[unit];
    }

    start() {
        this.server = this.app.listen(this.port, () => {
            console.log(`ZLRemote API server running on port ${this.port}`);
            console.log(`Documentation available at http://localhost:${this.port}/api/docs`);
        });
        return this.server;
    }

    stop() {
        if (this.server) {
            this.server.close();
        }
    }
}

module.exports = ZLRemoteAPI;