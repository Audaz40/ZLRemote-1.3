/*
  # ZLRemote Core Tables and Security Setup

  1. New Tables
    - `users` - User authentication and profile data
    - `sessions` - Remote desktop sessions with metadata
    - `session_viewers` - Track which users are viewing sessions
    - `recordings` - Video recording metadata and storage paths
    - `chat_messages` - Real-time chat history
    - `file_transfers` - File transfer history and metadata
    - `api_keys` - API key management for integrations
    - `session_events` - Audit log for session events
    - `network_stats` - Performance metrics tracking

  2. Security
    - Enable RLS on all tables
    - Create policies for authenticated users
    - Add proper ownership checks

  3. Indexes
    - Add indexes for common queries (userId, sessionId, createdAt)
    - Add GIN indexes for full-text search on chat messages

  4. Default Values
    - Timestamps with now()
    - Boolean flags with sensible defaults
    - Status fields with initial values
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  username text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  is_active boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  host_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_password text,
  quality text DEFAULT 'adaptive',
  max_fps integer DEFAULT 144,
  adaptive_bitrate boolean DEFAULT true,
  anti_lag boolean DEFAULT true,
  encryption_enabled boolean DEFAULT true,
  is_recording boolean DEFAULT false,
  status text DEFAULT 'active',
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  total_viewers integer DEFAULT 0,
  data_transferred bigint DEFAULT 0,
  avg_latency integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Session viewers tracking
CREATE TABLE IF NOT EXISTS session_viewers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  viewer_name text,
  viewer_ip text NOT NULL,
  connected_at timestamptz DEFAULT now(),
  disconnected_at timestamptz,
  bytes_sent bigint DEFAULT 0,
  bytes_received bigint DEFAULT 0,
  avg_latency integer DEFAULT 0,
  connection_quality text DEFAULT 'unknown'
);

-- Recordings table
CREATE TABLE IF NOT EXISTS recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size bigint,
  file_path text,
  storage_url text,
  duration_seconds integer,
  video_codec text,
  audio_codec text,
  resolution text,
  frame_rate integer,
  bitrate_kbps integer,
  is_processed boolean DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  content text NOT NULL,
  message_type text DEFAULT 'text',
  is_encrypted boolean DEFAULT true,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- File transfers
CREATE TABLE IF NOT EXISTS file_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id) ON DELETE SET NULL,
  receiver_id uuid REFERENCES users(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  file_type text,
  is_compressed boolean DEFAULT false,
  original_size bigint,
  compression_ratio numeric,
  storage_path text,
  status text DEFAULT 'pending',
  bytes_transferred bigint DEFAULT 0,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- API keys for integrations
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash text UNIQUE NOT NULL,
  key_name text NOT NULL,
  last_used_at timestamptz,
  ip_whitelist text[],
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Session events audit log
CREATE TABLE IF NOT EXISTS session_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_data jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Network statistics
CREATE TABLE IF NOT EXISTS network_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES users(id) ON DELETE SET NULL,
  latency_ms integer,
  jitter_ms integer,
  packet_loss_percent numeric,
  bandwidth_kbps integer,
  quality_score text,
  recorded_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for sessions table
CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (host_id = auth.uid());

CREATE POLICY "Users can view sessions they are invited to"
  ON sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_viewers
      WHERE session_viewers.session_id = sessions.id
      AND session_viewers.viewer_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

-- RLS Policies for session_viewers
CREATE POLICY "Users can view session viewers for their sessions"
  ON session_viewers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_viewers.session_id
      AND sessions.host_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert viewer records for their sessions"
  ON session_viewers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_viewers.session_id
      AND sessions.host_id = auth.uid()
    )
  );

-- RLS Policies for recordings
CREATE POLICY "Users can view own recordings"
  ON recordings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own recordings"
  ON recordings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their sessions"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = chat_messages.session_id
      AND (sessions.host_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM session_viewers
          WHERE session_viewers.session_id = chat_messages.session_id
          AND session_viewers.viewer_id = auth.uid()
        ))
    )
  );

CREATE POLICY "Users can insert messages in their sessions"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = chat_messages.session_id
      AND (sessions.host_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM session_viewers
          WHERE session_viewers.session_id = chat_messages.session_id
          AND session_viewers.viewer_id = auth.uid()
        ))
    )
  );

-- RLS Policies for file_transfers
CREATE POLICY "Users can view file transfers in their sessions"
  ON file_transfers FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid() OR receiver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = file_transfers.session_id
      AND (sessions.host_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM session_viewers
          WHERE session_viewers.session_id = file_transfers.session_id
          AND session_viewers.viewer_id = auth.uid()
        ))
    )
  );

-- RLS Policies for api_keys
CREATE POLICY "Users can view own API keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own API keys"
  ON api_keys FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own API keys"
  ON api_keys FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for session_events
CREATE POLICY "Users can view events for their sessions"
  ON session_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_events.session_id
      AND sessions.host_id = auth.uid()
    )
  );

CREATE POLICY "Sessions can log events"
  ON session_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for network_stats
CREATE POLICY "Users can view stats for their sessions"
  ON network_stats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = network_stats.session_id
      AND (sessions.host_id = auth.uid() OR viewer_id = auth.uid())
    )
  );

CREATE POLICY "Can insert network stats"
  ON network_stats FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_sessions_host_id ON sessions(host_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_session_viewers_session_id ON session_viewers(session_id);
CREATE INDEX idx_session_viewers_viewer_id ON session_viewers(viewer_id);
CREATE INDEX idx_recordings_session_id ON recordings(session_id);
CREATE INDEX idx_recordings_user_id ON recordings(user_id);
CREATE INDEX idx_recordings_created_at ON recordings(created_at DESC);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_file_transfers_session_id ON file_transfers(session_id);
CREATE INDEX idx_file_transfers_status ON file_transfers(status);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_session_events_session_id ON session_events(session_id);
CREATE INDEX idx_session_events_created_at ON session_events(created_at DESC);
CREATE INDEX idx_network_stats_session_id ON network_stats(session_id);
CREATE INDEX idx_network_stats_recorded_at ON network_stats(recorded_at DESC);

-- Create GIN index for full-text search on chat
CREATE INDEX idx_chat_messages_content_gin ON chat_messages USING gin(to_tsvector('english', content));