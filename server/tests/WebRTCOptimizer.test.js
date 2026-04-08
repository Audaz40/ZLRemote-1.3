const WebRTCOptimizer = require('../src/services/WebRTCOptimizer');

describe('WebRTCOptimizer', () => {
  let optimizer;

  beforeEach(() => {
    optimizer = new WebRTCOptimizer();
  });

  describe('determineQuality', () => {
    it('should determine excellent quality', () => {
      const stats = { latency: 30, jitter: 5, packetLoss: 0.05 };
      const quality = optimizer.determineQuality(stats);
      expect(quality).toBe('excellent');
    });

    it('should determine good quality', () => {
      const stats = { latency: 80, jitter: 15, packetLoss: 0.5 };
      const quality = optimizer.determineQuality(stats);
      expect(quality).toBe('good');
    });

    it('should determine fair quality', () => {
      const stats = { latency: 150, jitter: 40, packetLoss: 2 };
      const quality = optimizer.determineQuality(stats);
      expect(quality).toBe('fair');
    });

    it('should determine poor quality', () => {
      const stats = { latency: 300, jitter: 100, packetLoss: 5 };
      const quality = optimizer.determineQuality(stats);
      expect(quality).toBe('poor');
    });
  });

  describe('calculateOptimalBitrate', () => {
    it('should calculate bitrate for excellent quality', () => {
      const stats = { latency: 30, jitter: 5, packetLoss: 0 };
      const bitrate = optimizer.calculateOptimalBitrate(stats);
      expect(bitrate).toBeGreaterThan(10000);
      expect(bitrate).toBeLessThanOrEqual(25000);
    });

    it('should reduce bitrate with packet loss', () => {
      const statsNoPL = { latency: 30, jitter: 5, packetLoss: 0 };
      const statsWithPL = { latency: 30, jitter: 5, packetLoss: 5 };

      const bitrateNoPL = optimizer.calculateOptimalBitrate(statsNoPL);
      const bitrateWithPL = optimizer.calculateOptimalBitrate(statsWithPL);

      expect(bitrateWithPL).toBeLessThan(bitrateNoPL);
    });
  });

  describe('getOptimalFrameRate', () => {
    it('should return 120fps for excellent quality', () => {
      const fps = optimizer.getOptimalFrameRate('excellent', 120);
      expect(fps).toBe(120);
    });

    it('should return 60fps for good quality', () => {
      const fps = optimizer.getOptimalFrameRate('good', 120);
      expect(fps).toBe(60);
    });

    it('should return 30fps for fair quality', () => {
      const fps = optimizer.getOptimalFrameRate('fair', 120);
      expect(fps).toBe(30);
    });

    it('should return 15fps for poor quality', () => {
      const fps = optimizer.getOptimalFrameRate('poor', 120);
      expect(fps).toBe(15);
    });
  });

  describe('getOptimalResolution', () => {
    it('should return full resolution for excellent quality', () => {
      const res = optimizer.getOptimalResolution('excellent', 1920, 1080);
      expect(res.width).toBe(1920);
      expect(res.height).toBe(1080);
    });

    it('should reduce resolution for fair quality', () => {
      const res = optimizer.getOptimalResolution('fair', 1920, 1080);
      expect(res.width).toBe(960);
      expect(res.height).toBe(540);
    });

    it('should significantly reduce resolution for poor quality', () => {
      const res = optimizer.getOptimalResolution('poor', 1920, 1080);
      expect(res.width).toBe(640);
      expect(res.height).toBe(480);
    });
  });

  describe('optimizeForNetworkCondition', () => {
    it('should return optimization parameters', () => {
      const stats = { latency: 50, jitter: 10, packetLoss: 0.5 };
      const result = optimizer.optimizeForNetworkCondition(stats);

      expect(result.quality).toBeDefined();
      expect(result.bitrate).toBeDefined();
      expect(result.fps).toBeDefined();
      expect(result.resolution).toBeDefined();
      expect(result.shouldAdapt).toBe(true);
    });

    it('should update all parameters for poor network', () => {
      const stats = { latency: 300, jitter: 100, packetLoss: 5 };
      const result = optimizer.optimizeForNetworkCondition(stats);

      expect(result.quality).toBe('poor');
      expect(result.bitrate).toBeLessThan(2500);
      expect(result.fps).toBeLessThanOrEqual(15);
    });
  });

  describe('estimateRequiredBandwidth', () => {
    it('should estimate bandwidth for 1080p at 30fps', () => {
      const bandwidth = optimizer.estimateRequiredBandwidth(1920, 1080, 30, 'good');
      expect(bandwidth).toBeGreaterThan(0);
    });

    it('should estimate lower bandwidth for poor quality', () => {
      const bandwidthGood = optimizer.estimateRequiredBandwidth(1920, 1080, 30, 'good');
      const bandwidthPoor = optimizer.estimateRequiredBandwidth(1920, 1080, 30, 'poor');

      expect(bandwidthPoor).toBeLessThan(bandwidthGood);
    });
  });

  describe('calculateJitterBuffer', () => {
    it('should calculate jitter buffer', () => {
      const stats = { latency: 50, jitter: 10 };
      const buffer = optimizer.calculateJitterBuffer(stats);

      expect(buffer).toBeGreaterThanOrEqual(100);
      expect(buffer).toBeLessThanOrEqual(500);
    });
  });
});
