class WebRTCOptimizer {
  constructor() {
    this.videoCodecs = ['VP9', 'H264', 'VP8'];
    this.audioCodecs = ['opus'];
    this.bitrateLimits = {
      excellent: { min: 5000, max: 25000 },
      good: { min: 2500, max: 10000 },
      fair: { min: 1000, max: 5000 },
      poor: { min: 500, max: 2500 }
    };
  }

  calculateOptimalBitrate(networkStats) {
    const quality = this.determineQuality(networkStats);
    const limits = this.bitrateLimits[quality];

    let bitrate = limits.max;

    if (networkStats.packetLoss > 0) {
      bitrate *= (1 - networkStats.packetLoss / 100);
    }

    bitrate = Math.max(limits.min, Math.min(bitrate, limits.max));

    return Math.floor(bitrate);
  }

  determineQuality(networkStats) {
    const { latency = 0, jitter = 0, packetLoss = 0 } = networkStats;

    if (latency < 50 && jitter < 10 && packetLoss < 0.1) {
      return 'excellent';
    } else if (latency < 100 && jitter < 20 && packetLoss < 1) {
      return 'good';
    } else if (latency < 200 && jitter < 50 && packetLoss < 3) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  getOptimalFrameRate(quality, targetFPS = 60) {
    const frameRateByQuality = {
      excellent: Math.min(targetFPS, 120),
      good: Math.min(targetFPS, 60),
      fair: Math.min(targetFPS, 30),
      poor: 15
    };

    return frameRateByQuality[quality] || 30;
  }

  getOptimalResolution(quality, targetWidth = 1920, targetHeight = 1080) {
    const resolutions = {
      excellent: { width: targetWidth, height: targetHeight },
      good: { width: Math.round(targetWidth * 0.75), height: Math.round(targetHeight * 0.75) },
      fair: { width: Math.round(targetWidth * 0.5), height: Math.round(targetHeight * 0.5) },
      poor: { width: 640, height: 480 }
    };

    return resolutions[quality];
  }

  generateSDPOffer(constraints = {}) {
    const sdpTemplate = {
      v: 0,
      o: `zlremote ${Date.now()} 1 IN IP4 0.0.0.0`,
      s: 'ZLRemote Session',
      t: 0,
      a: [
        'group:BUNDLE 0 1',
        'extmap-allow-mixed',
        'msid-semantic: WMS stream'
      ],
      m: [
        {
          type: 'video',
          port: 9,
          proto: 'UDP/TLS/RTP/SAVPF',
          fmt: [96, 98, 100, 127],
          a: [
            'rtcp-mux',
            'rtcp-rsize',
            `rtpmap:96 VP9/90000`,
            `rtpmap:98 H264/90000`,
            `rtpmap:100 VP8/90000`,
            'fmtp:98 level-asymmetry-allowed=1;packetization-mode=1',
            `rtcp-fb:* transport-cc`,
            `rtcp-fb:* ccm fir`
          ]
        },
        {
          type: 'audio',
          port: 9,
          proto: 'UDP/TLS/RTP/SAVPF',
          fmt: [111, 63, 103, 104, 9, 0, 8, 106, 105, 13, 110, 112, 113, 114],
          a: [
            'rtcp-mux',
            `rtpmap:111 opus/48000/2`,
            'fmtp:111 minptime=10;useinbandfec=1'
          ]
        }
      ]
    };

    return sdpTemplate;
  }

  selectBestCodec(availableCodecs, preference = 'VP9') {
    if (availableCodecs.includes(preference)) {
      return preference;
    }

    for (const codec of this.videoCodecs) {
      if (availableCodecs.includes(codec)) {
        return codec;
      }
    }

    return availableCodecs[0] || 'H264';
  }

  optimizeForNetworkCondition(networkStats, currentSettings = {}) {
    const quality = this.determineQuality(networkStats);
    const bitrate = this.calculateOptimalBitrate(networkStats);
    const fps = this.getOptimalFrameRate(quality, currentSettings.targetFPS);
    const resolution = this.getOptimalResolution(quality, currentSettings.width, currentSettings.height);

    return {
      quality,
      bitrate,
      fps,
      resolution,
      shouldAdapt: true,
      updateInterval: this._getUpdateInterval(quality)
    };
  }

  _getUpdateInterval(quality) {
    const intervals = {
      excellent: 5000,
      good: 3000,
      fair: 2000,
      poor: 1000
    };
    return intervals[quality] || 3000;
  }

  estimateRequiredBandwidth(width, height, fps, quality) {
    const pixelsPerSecond = width * height * fps;
    const bitsPerPixel = this._getBitsPerPixel(quality);

    return Math.floor((pixelsPerSecond * bitsPerPixel) / 1000);
  }

  _getBitsPerPixel(quality) {
    const bppByQuality = {
      excellent: 0.1,
      good: 0.08,
      fair: 0.05,
      poor: 0.03
    };
    return bppByQuality[quality] || 0.05;
  }

  calculateJitterBuffer(networkStats) {
    const { latency = 0, jitter = 0 } = networkStats;
    const bufferSize = Math.max(100, latency + jitter * 3);

    return Math.min(bufferSize, 500);
  }
}

module.exports = WebRTCOptimizer;
