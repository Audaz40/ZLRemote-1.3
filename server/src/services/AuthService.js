const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

class AuthService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.accessTokenExpiry = '15m';
    this.refreshTokenExpiry = '7d';
  }

  async hashPassword(password) {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  generateTokens(userId) {
    const accessToken = jwt.sign(
      { sub: userId, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: this.accessTokenExpiry }
    );

    const refreshToken = jwt.sign(
      { sub: userId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: this.refreshTokenExpiry }
    );

    return { accessToken, refreshToken };
  }

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  async register(email, username, password, displayName = '') {
    const passwordHash = await this.hashPassword(password);
    const userId = uuidv4();

    const { data, error } = await this.supabase
      .from('users')
      .insert([
        {
          id: userId,
          email,
          username,
          password_hash: passwordHash,
          display_name: displayName || username,
          is_active: true
        }
      ])
      .select();

    if (error) {
      throw new Error(error.message);
    }

    const { accessToken, refreshToken } = this.generateTokens(userId);
    return {
      user: data[0],
      accessToken,
      refreshToken
    };
  }

  async login(email, password) {
    const { data: users, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error || !users) {
      throw new Error('Invalid email or password');
    }

    const passwordMatch = await this.verifyPassword(password, users.password_hash);
    if (!passwordMatch) {
      throw new Error('Invalid email or password');
    }

    await this.supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', users.id);

    const { accessToken, refreshToken } = this.generateTokens(users.id);
    return {
      user: {
        id: users.id,
        email: users.email,
        username: users.username,
        display_name: users.display_name,
        avatar_url: users.avatar_url
      },
      accessToken,
      refreshToken
    };
  }

  async refreshAccessToken(refreshToken) {
    const decoded = this.verifyRefreshToken(refreshToken);
    const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(decoded.sub);
    return { accessToken, refreshToken: newRefreshToken };
  }

  async verifyUser(userId) {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, email, username, display_name, avatar_url, is_active')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data || !data.is_active) {
      throw new Error('User not found or inactive');
    }

    return data;
  }
}

module.exports = AuthService;
