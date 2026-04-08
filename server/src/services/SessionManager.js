const { v4: uuidv4 } = require('uuid');

class SessionManager {
  constructor(supabaseClient, redisClient) {
    this.supabase = supabaseClient;
    this.redis = redisClient;
    this.sessionTimeout = 3600;
    this.sessionKeyPrefix = 'session:';
  }

  async createSession(hostId, settings = {}) {
    const sessionId = this._generateSessionId();
    const sessionData = {
      id: sessionId,
      host_id: hostId,
      quality: settings.quality || 'adaptive',
      max_fps: settings.maxFPS || 144,
      adaptive_bitrate: settings.adaptiveBitrate !== false,
      anti_lag: settings.antiLag !== false,
      encryption_enabled: settings.encryption !== false,
      is_recording: settings.isRecording || false,
      status: 'active',
      total_viewers: 0,
      data_transferred: 0,
      avg_latency: 0,
      password: settings.password || null
    };

    const { data, error } = await this.supabase
      .from('sessions')
      .insert([sessionData])
      .select();

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    await this.redis.setex(
      `${this.sessionKeyPrefix}${sessionId}`,
      this.sessionTimeout,
      JSON.stringify(data[0])
    );

    return data[0];
  }

  async getSession(sessionId) {
    const cachedSession = await this.redis.get(`${this.sessionKeyPrefix}${sessionId}`);
    if (cachedSession) {
      return JSON.parse(cachedSession);
    }

    const { data, error } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (error || !data) {
      throw new Error('Session not found');
    }

    await this.redis.setex(
      `${this.sessionKeyPrefix}${sessionId}`,
      this.sessionTimeout,
      JSON.stringify(data)
    );

    return data;
  }

  async addViewer(sessionId, viewerData) {
    const { data, error } = await this.supabase
      .from('session_viewers')
      .insert([
        {
          session_id: sessionId,
          viewer_id: viewerData.viewerId || null,
          viewer_name: viewerData.viewerName,
          viewer_ip: viewerData.viewerIp
        }
      ])
      .select();

    if (error) {
      throw new Error(`Failed to add viewer: ${error.message}`);
    }

    await this.supabase
      .from('sessions')
      .update({ total_viewers: this.redis.incr(`session:viewers:${sessionId}`) })
      .eq('id', sessionId);

    return data[0];
  }

  async removeViewer(sessionId, viewerId) {
    const now = new Date().toISOString();

    const { error } = await this.supabase
      .from('session_viewers')
      .update({ disconnected_at: now })
      .eq('id', viewerId);

    if (error) {
      throw new Error(`Failed to remove viewer: ${error.message}`);
    }

    return true;
  }

  async updateSessionStats(sessionId, stats) {
    const { error } = await this.supabase
      .from('sessions')
      .update({
        avg_latency: stats.avgLatency || 0,
        data_transferred: stats.dataTransferred || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      throw new Error(`Failed to update session stats: ${error.message}`);
    }

    const cacheKey = `${this.sessionKeyPrefix}${sessionId}`;
    await this.redis.del(cacheKey);

    return true;
  }

  async endSession(sessionId) {
    const now = new Date().toISOString();

    const { error } = await this.supabase
      .from('sessions')
      .update({
        status: 'ended',
        ended_at: now,
        updated_at: now
      })
      .eq('id', sessionId);

    if (error) {
      throw new Error(`Failed to end session: ${error.message}`);
    }

    const cacheKey = `${this.sessionKeyPrefix}${sessionId}`;
    await this.redis.del(cacheKey);

    return true;
  }

  async recordEvent(sessionId, userId, eventType, eventData = {}, ipAddress = '') {
    const { error } = await this.supabase
      .from('session_events')
      .insert([
        {
          session_id: sessionId,
          user_id: userId || null,
          event_type: eventType,
          event_data: eventData,
          ip_address: ipAddress
        }
      ]);

    if (error) {
      console.error(`Failed to record event: ${error.message}`);
    }

    return !error;
  }

  async recordNetworkStats(sessionId, viewerId, stats) {
    const { error } = await this.supabase
      .from('network_stats')
      .insert([
        {
          session_id: sessionId,
          viewer_id: viewerId || null,
          latency_ms: stats.latency || 0,
          jitter_ms: stats.jitter || 0,
          packet_loss_percent: stats.packetLoss || 0,
          bandwidth_kbps: stats.bandwidth || 0,
          quality_score: stats.quality || 'unknown'
        }
      ]);

    if (error) {
      console.error(`Failed to record network stats: ${error.message}`);
    }

    return !error;
  }

  async getUserSessions(userId) {
    const { data, error } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('host_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user sessions: ${error.message}`);
    }

    return data || [];
  }

  _generateSessionId() {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  }
}

module.exports = SessionManager;
