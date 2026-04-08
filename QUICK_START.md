# Quick Start Guide - ZLRemote Enhancements

## What's New

Your ZLRemote application has been enhanced with production-grade features while keeping the UI intact.

## Key Improvements at a Glance

### Database Integration
- **Supabase** integration with 9 tables (users, sessions, recordings, chat, file transfers, etc.)
- Row Level Security (RLS) on all tables
- Automatic indexes for performance

### Authentication System
- JWT-based login/register/refresh flow
- Secure password hashing with bcrypt
- API key management for integrations

### Security Enhancements
- Rate limiting (5 auth attempts/15min, 100 API calls/min)
- Input validation on all endpoints
- Security headers (Helmet.js)
- SSL/TLS support
- CORS protection

### Real-time Features
- Redis caching for sessions (optional, falls back to in-memory)
- Real-time network monitoring
- Adaptive video quality based on network conditions
- Chat message history with persistence

### File Management
- File transfer with automatic compression
- Progress tracking
- Storage path management
- Compression metrics

### Logging & Monitoring
- Structured logging with Pino
- Error tracking with correlation IDs
- Performance metrics
- Audit trails for all operations

## Environment Setup

### Update Your .env

```bash
NODE_ENV=development
JWT_SECRET=change-this-to-a-random-string-in-production
JWT_REFRESH_SECRET=change-this-to-another-random-string-in-production
LOG_LEVEL=debug
REDIS_HOST=localhost
REDIS_PORT=6379
APP_URL=http://localhost:3000
```

### Install Dependencies

```bash
npm install
```

### Start the Server

```bash
npm run dev:server  # Development with nodemon
# or
npm start           # Production
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user

### Sessions
- `POST /api/v1/sessions/create` - Create session
- `GET /api/v1/sessions` - List user's sessions
- `GET /api/v1/sessions/:sessionId` - Get session details
- `POST /api/v1/sessions/:sessionId/end` - End session

### Utilities
- `GET /health` - Health check
- `GET /api/v1/ice-servers` - Get STUN/TURN servers

## WebSocket Messages

### Connection Flow

1. **Connect** → Server sends `client_config`
2. **Authenticate** → Send `authenticate` with JWT token
3. **Register as Host** → Send `register_host` message
4. **Viewers Join** → They send `connect_to_host` with session ID

### Message Types Supported

- `authenticate` - Authenticate with JWT token
- `register_host` - Create a hosting session
- `connect_to_host` - Join as viewer
- `webrtc_offer/answer` - WebRTC negotiation
- `ice_candidate` - ICE connectivity
- `stream_data` - Video/audio frames
- `chat_message` - Chat messages (persisted)
- `input_event` - Keyboard/mouse input
- `network_stats` - Network metrics
- `file_transfer_start` - Start file transfer

## Database Schema

### User Management
```sql
users (id, email, password_hash, username, display_name, avatar_url)
api_keys (id, user_id, key_hash, key_name, is_active, expires_at)
```

### Session Management
```sql
sessions (id, host_id, quality, max_fps, is_recording, status)
session_viewers (id, session_id, viewer_id, viewer_name, viewer_ip)
session_events (id, session_id, user_id, event_type, event_data)
```

### Content Storage
```sql
chat_messages (id, session_id, sender_id, content, is_encrypted, is_read)
file_transfers (id, session_id, sender_id, receiver_id, file_name, status)
recordings (id, session_id, user_id, file_name, file_size, storage_url)
```

### Monitoring
```sql
network_stats (id, session_id, viewer_id, latency_ms, jitter_ms, packet_loss_percent)
```

## Testing

Run tests:

```bash
npm test
```

Test files include:
- `server/tests/AuthService.test.js` - Authentication testing
- `server/tests/WebRTCOptimizer.test.js` - Quality adaptation testing

## Project Structure

```
server/
├── src/
│   ├── server.js                 # Main server
│   ├── services/
│   │   ├── AuthService.js        # Authentication
│   │   ├── SessionManager.js     # Session management
│   │   ├── FileTransferService.js # File operations
│   │   ├── WebRTCOptimizer.js    # Quality adaptation
│   │   └── Logger.js             # Logging
│   ├── middleware/
│   │   ├── auth.js               # Token verification
│   │   ├── security.js           # Rate limiting, validation
│   │   └── errorHandler.js       # Error handling
│   └── routes/
│       ├── auth.js               # Auth endpoints
│       └── sessions.js           # Session endpoints
└── tests/                        # Test suite
```

## Key Features Explained

### Network Adaptive Quality

The system automatically adjusts video quality based on network conditions:

- **Excellent** (<50ms latency) → 120 FPS, 1920x1080
- **Good** (<100ms latency) → 60 FPS, 1440x810
- **Fair** (<200ms latency) → 30 FPS, 960x540
- **Poor** (>200ms latency) → 15 FPS, 640x480

### Session Persistence

All sessions are stored in Supabase with:
- Session metadata (quality, FPS, encryption settings)
- Viewer list with connection times
- Network statistics for each viewer
- Event audit log
- Total data transferred

### Security Layers

1. **Authentication** - JWT tokens with refresh capability
2. **Authorization** - Row Level Security (RLS) on database
3. **Rate Limiting** - Protect against abuse
4. **Validation** - All inputs validated
5. **Encryption** - TLS/HTTPS support

## Production Deployment

### Pre-Deployment Checklist

- [ ] Change JWT secrets to random values
- [ ] Configure Redis for caching
- [ ] Set up SSL certificates
- [ ] Configure database backups
- [ ] Set up error tracking (Sentry optional)
- [ ] Configure logging aggregation
- [ ] Test with production data volumes
- [ ] Set up monitoring and alerts

### Environment Variables for Production

```bash
NODE_ENV=production
JWT_SECRET=<generate-secure-random-string>
JWT_REFRESH_SECRET=<generate-another-secure-random-string>
LOG_LEVEL=info
REDIS_HOST=<your-redis-host>
REDIS_PORT=6379
REDIS_PASSWORD=<your-redis-password>
APP_URL=https://yourdomain.com
SSL_KEY_PATH=/etc/ssl/private/key.pem
SSL_CERT_PATH=/etc/ssl/certs/cert.pem
TURN_SERVER=turn:your-server.com:3478
TURN_USERNAME=zlremote
TURN_PASSWORD=<your-password>
```

## Common Tasks

### Adding a New User
```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","username":"user","password":"SecurePass123!"}'
```

### Creating a Session
```bash
curl -X POST http://localhost:3001/api/v1/sessions/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quality":"adaptive","maxFPS":60}'
```

### Checking Server Health
```bash
curl http://localhost:3001/health
```

## Troubleshooting

### SSL Certificate Error
- Set `SSL_KEY_PATH` and `SSL_CERT_PATH` environment variables
- Or remove them to use HTTP (dev only)

### Redis Connection Error
- Ensure Redis is running on configured host:port
- System will fallback to in-memory storage if unavailable

### Database Connection Error
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`
- Check Supabase project is active
- Verify migrations were applied

### JWT Token Expired
- Client should use refresh endpoint to get new token
- Token expiry: 15 minutes (access), 7 days (refresh)

## Performance Tips

1. **Enable Redis** for distributed session caching
2. **Use CDN** for static assets
3. **Enable Compression** on HTTP responses (already enabled)
4. **Monitor Network Stats** to identify bottlenecks
5. **Configure Database Indexes** for your query patterns
6. **Use Connection Pooling** for database
7. **Enable GZIP** on WebSocket frames (already enabled)

## Support & Documentation

See `IMPROVEMENTS.md` for detailed technical documentation of all enhancements.

## License

Same as ZLRemote parent project
