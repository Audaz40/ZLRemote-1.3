require('dotenv').config();

const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');
const compression = require('compression');
const { createClient } = require('@supabase/supabase-js');
const redis = require('redis');

const Logger = require('./services/Logger');
const AuthService = require('./services/AuthService');
const SessionManager = require('./services/SessionManager');
const FileTransferService = require('./services/FileTransferService');
const AuthMiddleware = require('./middleware/auth');
const ErrorHandler = require('./middleware/errorHandler');
const { securityHeaders, authRateLimit, apiRateLimit } = require('./middleware/security');

const PORT = process.env.PORT || 3001;
const app = express();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  Logger.error('Missing Supabase configuration', new Error('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set'));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      Logger.warn('Redis connection refused, using in-memory session storage');
      return new Error('Redis unavailable');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Redis retry time exhausted');
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

redisClient.on('error', (err) => {
  Logger.warn('Redis error, falling back to in-memory storage', { error: err.message });
});

const authService = new AuthService(supabase);
const authMiddleware = new AuthMiddleware(authService);
const sessionManager = new SessionManager(supabase, redisClient);
const fileTransferService = new FileTransferService(supabase, null);

app.use(compression());
app.use(securityHeaders);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(apiRateLimit);

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/v1/ice-servers', (req, res) => {
  res.json({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      ...(process.env.TURN_SERVER ? [{
        urls: process.env.TURN_SERVER,
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_PASSWORD
      }] : [])
    ],
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  });
});

const createAuthRoutes = require('./routes/auth');
const createSessionRoutes = require('./routes/sessions');

app.use('/api/v1/auth', createAuthRoutes(authService, authMiddleware));
app.use('/api/v1/sessions', createSessionRoutes(sessionManager, authMiddleware));

app.use(ErrorHandler.notFound);
app.use(ErrorHandler.handle.bind(ErrorHandler));

let server;
try {
  const sslOptions = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH || './ssl/private.key'),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH || './ssl/certificate.crt')
  };
  server = https.createServer(sslOptions, app);
  Logger.info('HTTPS server created with SSL certificates');
} catch (error) {
  server = http.createServer(app);
  Logger.warn('SSL certificates not found, using HTTP (not recommended for production)', { error: error.message });
}

const wss = new WebSocket.Server({
  server,
  perMessageDeflate: {
    zlibDeflateOptions: {
      threshold: 1024,
      concurrencyLimit: 10
    },
    zlibInflateOptions: {
      chunkSize: 16 * 1024
    }
  }
});

const clients = new Map();
const sessions = new Map();

wss.on('connection', (ws, req) => {
  const clientId = require('uuid').v4();
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  Logger.websocket('Client connected', clientId, { ip: clientIP });

  const client = {
    id: clientId,
    socket: ws,
    ip: clientIP,
    connectedAt: Date.now(),
    userId: null,
    sessionId: null,
    type: null,
    networkStats: {
      latency: 0,
      jitter: 0,
      packetLoss: 0,
      bandwidth: 0
    }
  };

  clients.set(clientId, client);

  ws.send(JSON.stringify({
    type: 'client_config',
    clientId,
    serverFeatures: {
      adaptiveQuality: true,
      antiLag: true,
      encryption: true,
      fileTransfer: true
    }
  }));

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      await handleWebSocketMessage(clientId, message);
    } catch (error) {
      Logger.error('Invalid message from client', error, { clientId });
    }
  });

  ws.on('close', () => {
    handleDisconnect(clientId);
  });

  ws.on('error', (error) => {
    Logger.error('WebSocket error', error, { clientId });
  });

  setupConnectionMonitoring(client);
});

async function handleWebSocketMessage(clientId, message) {
  const client = clients.get(clientId);
  if (!client) return;

  switch (message.type) {
    case 'authenticate':
      try {
        const decoded = authMiddleware.verifyWSToken(message.token);
        client.userId = decoded.sub;
        client.socket.send(JSON.stringify({ type: 'authenticated', clientId }));
      } catch (error) {
        Logger.security('Authentication failed', { clientId, error: error.message });
        client.socket.send(JSON.stringify({ type: 'auth_error', message: 'Invalid token' }));
      }
      break;

    case 'register_host':
      try {
        const session = await sessionManager.createSession(client.userId, message.settings);
        client.type = 'host';
        client.sessionId = session.id;
        sessions.set(session.id, { hostId: clientId, viewers: new Set() });

        await sessionManager.recordEvent(session.id, client.userId, 'host_registered', {}, client.ip);

        client.socket.send(JSON.stringify({
          type: 'host_registered',
          sessionId: session.id,
          externalUrl: `${process.env.APP_URL || 'https://app.zlremote.com'}/join/${session.id}`
        }));

        Logger.session('Host registered', session.id, { userId: client.userId });
      } catch (error) {
        Logger.error('Failed to register host', error, { clientId });
        client.socket.send(JSON.stringify({ type: 'error', message: error.message }));
      }
      break;

    case 'connect_to_host':
      try {
        const session = sessions.get(message.sessionId) || await sessionManager.getSession(message.sessionId);
        if (!session) {
          client.socket.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
          break;
        }

        client.type = 'viewer';
        client.sessionId = message.sessionId;

        if (sessions.has(message.sessionId)) {
          sessions.get(message.sessionId).viewers.add(clientId);
        }

        const viewer = await sessionManager.addViewer(message.sessionId, {
          viewerId: client.userId,
          viewerName: message.viewerName || 'Anonymous',
          viewerIp: client.ip
        });

        const hostClient = clients.get(sessions.get(message.sessionId)?.hostId);
        if (hostClient && hostClient.socket.readyState === WebSocket.OPEN) {
          hostClient.socket.send(JSON.stringify({
            type: 'viewer_joined',
            viewerId: clientId,
            viewerName: message.viewerName || 'Anonymous'
          }));
        }

        client.socket.send(JSON.stringify({
          type: 'connected_to_host',
          sessionId: message.sessionId
        }));

        Logger.session('Viewer joined', message.sessionId, { viewerId: clientId });
      } catch (error) {
        Logger.error('Failed to connect to host', error, { clientId });
        client.socket.send(JSON.stringify({ type: 'error', message: error.message }));
      }
      break;

    case 'webrtc_offer':
    case 'webrtc_answer':
    case 'ice_candidate':
      relayP2PMessage(clientId, message);
      break;

    case 'stream_data':
      relayStreamData(clientId, message);
      break;

    case 'chat_message':
      relayChatMessage(clientId, message);
      break;

    case 'input_event':
      relayInputEvent(clientId, message);
      break;

    case 'network_stats':
      updateNetworkStats(client, message);
      break;

    case 'file_transfer_start':
      handleFileTransferStart(clientId, message);
      break;
  }
}

function relayP2PMessage(clientId, message) {
  const sender = clients.get(clientId);
  if (!sender || !sender.sessionId) return;

  const session = sessions.get(sender.sessionId);
  if (!session) return;

  const recipientId = sender.type === 'host' ? message.viewerId : session.hostId;

  if (!recipientId) {
    if (sender.type === 'host') {
      session.viewers.forEach(vid => {
        const viewer = clients.get(vid);
        if (viewer && viewer.socket.readyState === WebSocket.OPEN) {
          viewer.socket.send(JSON.stringify({ ...message, senderId: clientId }));
        }
      });
    }
    return;
  }

  const recipient = clients.get(recipientId);
  if (recipient && recipient.socket.readyState === WebSocket.OPEN) {
    recipient.socket.send(JSON.stringify({ ...message, senderId: clientId }));
  }
}

function relayStreamData(clientId, message) {
  const sender = clients.get(clientId);
  if (!sender || !sender.sessionId) return;

  const session = sessions.get(sender.sessionId);
  if (!session) return;

  if (sender.type === 'host') {
    session.viewers.forEach(vid => {
      const viewer = clients.get(vid);
      if (viewer && viewer.socket.readyState === WebSocket.OPEN) {
        viewer.socket.send(JSON.stringify({
          type: 'stream_data',
          data: message.data
        }));
      }
    });
  }
}

function relayChatMessage(clientId, message) {
  const sender = clients.get(clientId);
  if (!sender || !sender.sessionId) return;

  const session = sessions.get(sender.sessionId);
  if (!session) return;

  const chatMessage = {
    type: 'chat_message',
    senderId: clientId,
    senderName: message.senderName || 'Anonymous',
    content: message.content,
    timestamp: Date.now()
  };

  const allParticipants = [session.hostId, ...session.viewers];
  allParticipants.forEach(participantId => {
    const participant = clients.get(participantId);
    if (participant && participant.socket.readyState === WebSocket.OPEN) {
      participant.socket.send(JSON.stringify(chatMessage));
    }
  });
}

function relayInputEvent(clientId, message) {
  const sender = clients.get(clientId);
  if (!sender || sender.type !== 'viewer') return;

  const session = sessions.get(sender.sessionId);
  if (!session) return;

  const host = clients.get(session.hostId);
  if (host && host.socket.readyState === WebSocket.OPEN) {
    host.socket.send(JSON.stringify({
      type: 'input_event',
      senderId: clientId,
      event: message.event
    }));
  }
}

function updateNetworkStats(client, message) {
  client.networkStats = {
    latency: message.latency || 0,
    jitter: message.jitter || 0,
    packetLoss: message.packetLoss || 0,
    bandwidth: message.bandwidth || 0
  };

  if (client.sessionId && client.userId) {
    sessionManager.recordNetworkStats(client.sessionId, client.userId, client.networkStats).catch(err => {
      Logger.error('Failed to record network stats', err);
    });
  }
}

async function handleFileTransferStart(clientId, message) {
  const client = clients.get(clientId);
  if (!client || !client.sessionId) return;

  try {
    const transfer = await fileTransferService.createTransfer(
      client.sessionId,
      message.fileName,
      message.fileSize,
      message.fileType,
      client.userId
    );

    client.socket.send(JSON.stringify({
      type: 'file_transfer_ready',
      transferId: transfer.transferId,
      chunkSize: transfer.chunkSize,
      shouldCompress: transfer.shouldCompress
    }));
  } catch (error) {
    Logger.error('Failed to start file transfer', error);
    client.socket.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}

function setupConnectionMonitoring(client) {
  const pingInterval = setInterval(() => {
    if (client.socket.readyState === WebSocket.OPEN) {
      const pingTime = Date.now();
      client.socket.ping();

      client.socket.once('pong', () => {
        const latency = Date.now() - pingTime;
        client.networkStats.latency = client.networkStats.latency * 0.8 + latency * 0.2;

        const jitter = Math.abs(latency - client.networkStats.latency);
        client.networkStats.jitter = client.networkStats.jitter * 0.9 + jitter * 0.1;
      });
    } else {
      clearInterval(pingInterval);
    }
  }, 5000);
}

function handleDisconnect(clientId) {
  const client = clients.get(clientId);
  if (!client) return;

  Logger.websocket('Client disconnected', clientId, { type: client.type });

  if (client.sessionId) {
    const session = sessions.get(client.sessionId);
    if (session) {
      if (client.type === 'host') {
        session.viewers.forEach(viewerId => {
          const viewer = clients.get(viewerId);
          if (viewer && viewer.socket.readyState === WebSocket.OPEN) {
            viewer.socket.send(JSON.stringify({ type: 'host_disconnected' }));
          }
        });
        sessions.delete(client.sessionId);
        sessionManager.endSession(client.sessionId).catch(err => {
          Logger.error('Failed to end session', err);
        });
      } else if (client.type === 'viewer') {
        session.viewers.delete(clientId);
        sessionManager.removeViewer(client.sessionId, clientId).catch(err => {
          Logger.error('Failed to remove viewer', err);
        });

        const host = clients.get(session.hostId);
        if (host && host.socket.readyState === WebSocket.OPEN) {
          host.socket.send(JSON.stringify({
            type: 'viewer_left',
            viewerId: clientId
          }));
        }
      }
    }
  }

  clients.delete(clientId);
}

server.listen(PORT, '0.0.0.0', () => {
  Logger.info('ZLRemote Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    publicDomain: process.env.RAILWAY_PUBLIC_DOMAIN || 'localhost'
  });
});

process.on('SIGTERM', () => {
  Logger.info('SIGTERM received, gracefully shutting down');
  server.close(() => {
    Logger.info('Server closed');
    process.exit(0);
  });
});
