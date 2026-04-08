const AuthService = require('../src/services/AuthService');

describe('AuthService', () => {
  let authService;
  let mockSupabase;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis()
    };

    authService = new AuthService(mockSupabase);
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'TestPassword123!';
      const hash = await authService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toEqual(password);
    });

    it('should produce different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await authService.hashPassword(password);
      const hash2 = await authService.hashPassword(password);

      expect(hash1).not.toEqual(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await authService.hashPassword(password);
      const isValid = await authService.verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const hash = await authService.hashPassword(password);
      const isValid = await authService.verifyPassword('WrongPassword', hash);

      expect(isValid).toBe(false);
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const userId = 'test-user-id';
      const tokens = authService.generateTokens(userId);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid token', () => {
      const userId = 'test-user-id';
      const tokens = authService.generateTokens(userId);
      const decoded = authService.verifyAccessToken(tokens.accessToken);

      expect(decoded.sub).toBe(userId);
      expect(decoded.type).toBe('access');
    });

    it('should reject invalid token', () => {
      expect(() => {
        authService.verifyAccessToken('invalid-token');
      }).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const userId = 'test-user-id';
      const tokens = authService.generateTokens(userId);
      const decoded = authService.verifyRefreshToken(tokens.refreshToken);

      expect(decoded.sub).toBe(userId);
      expect(decoded.type).toBe('refresh');
    });
  });
});
