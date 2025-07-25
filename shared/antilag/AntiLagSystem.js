class AntiLagSystem {
    constructor(options = {}) {
        this.options = {
            maxLatency: options.maxLatency || 100, // ms
            targetFPS: options.targetFPS || 60,
            adaptiveQuality: options.adaptiveQuality !== false,
            predictiveBuffering: options.predictiveBuffering !== false,
            frameSkipping: options.frameSkipping !== false,
            ...options
        };
        
        this.stats = {
            latency: 0,
            jitter: 0,
            packetLoss: 0,
            fps: 0,
            quality: 'high',
            bandwidth: 0
        };
        
        this.adaptationHistory = [];
        this.frameBuffer = [];
        this.lastFrameTime = 0;
        this.skippedFrames = 0;
        this.totalFrames = 0;
        
        this.setupAdaptiveSystem();
    }

    setupAdaptiveSystem() {
        // Monitor network conditions every 100ms
        this.monitoringInterval = setInterval(() => {
            this.analyzeNetworkConditions();
            this.adaptQuality();
            this.optimizeBuffering();
        }, 100);
    }

    analyzeNetworkConditions() {
        // Calculate network stability
        const stability = this.calculateNetworkStability();
        
        // Predict network conditions
        const prediction = this.predictNetworkConditions();
        
        // Update adaptation strategy
        this.updateAdaptationStrategy(stability, prediction);
    }

    calculateNetworkStability() {
        if (this.adaptationHistory.length < 5) return 1.0;
        
        const recent = this.adaptationHistory.slice(-10);
        const latencyVariance = this.calculateVariance(recent.map(h => h.latency));
        const jitterVariance = this.calculateVariance(recent.map(h => h.jitter));
        
        // Lower variance = higher stability
        const stability = 1.0 / (1.0 + (latencyVariance + jitterVariance) / 100);
        return Math.max(0.1, Math.min(1.0, stability));
    }

    calculateVariance(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
        return variance;
    }

    predictNetworkConditions() {
        if (this.adaptationHistory.length < 3) {
            return { trend: 'stable', confidence: 0.5 };
        }
        
        const recent = this.adaptationHistory.slice(-5);
        const latencyTrend = this.calculateTrend(recent.map(h => h.latency));
        const jitterTrend = this.calculateTrend(recent.map(h => h.jitter));
        
        let trend = 'stable';
        if (latencyTrend > 5 || jitterTrend > 3) {
            trend = 'degrading';
        } else if (latencyTrend < -5 && jitterTrend < -3) {
            trend = 'improving';
        }
        
        return {
            trend,
            confidence: Math.min(recent.length / 5, 1.0),
            predictedLatency: this.stats.latency + latencyTrend
        };
    }

    calculateTrend(values) {
        if (values.length < 2) return 0;
        
        const n = values.length;
        const sumX = n * (n - 1) / 2;
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
        const sumX2 = n * (n - 1) * (2 * n - 1) / 6;
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        return slope;
    }

    updateAdaptationStrategy(stability, prediction) {
        const strategy = {
            aggressiveness: 1.0 - stability,
            anticipation: prediction.confidence,
            adaptation: {
                quality: this.calculateOptimalQuality(stability, prediction),
                fps: this.calculateOptimalFPS(stability, prediction),
                buffering: this.calculateOptimalBuffering(stability, prediction)
            }
        };
        
        this.currentStrategy = strategy;
    }

    calculateOptimalQuality(stability, prediction) {
        let targetQuality = 'high';
        
        if (this.stats.latency > 150 || stability < 0.5) {
            targetQuality = 'medium';
        }
        
        if (this.stats.latency > 250 || stability < 0.3 || prediction.trend === 'degrading') {
            targetQuality = 'low';
        }
        
        if (this.stats.latency < 50 && stability > 0.8 && prediction.trend === 'improving') {
            targetQuality = 'ultra';
        }
        
        return targetQuality;
    }

    calculateOptimalFPS(stability, prediction) {
        let targetFPS = this.options.targetFPS;
        
        if (this.stats.latency > 100 || stability < 0.6) {
            targetFPS = Math.min(targetFPS, 30);
        }
        
        if (this.stats.latency > 200 || stability < 0.4) {
            targetFPS = Math.min(targetFPS, 15);
        }
        
        if (prediction.trend === 'degrading') {
            targetFPS *= 0.8;
        }
        
        return Math.max(10, Math.round(targetFPS));
    }

    calculateOptimalBuffering(stability, prediction) {
        let bufferSize = 3; // frames
        
        if (stability < 0.5 || prediction.trend === 'degrading') {
            bufferSize = 5;
        }
        
        if (stability > 0.8 && this.stats.latency < 50) {
            bufferSize = 1; // Minimal buffering for low latency
        }
        
        return bufferSize;
    }

    adaptQuality() {
        if (!this.options.adaptiveQuality) return;
        
        const strategy = this.currentStrategy;
        if (!strategy) return;
        
        // Apply quality adaptation
        this.applyQualitySettings(strategy.adaptation);
    }

    applyQualitySettings(adaptation) {
        const qualitySettings = {
            ultra: { bitrate: 50000000, resolution: '4K', compression: 0.1 },
            high: { bitrate: 25000000, resolution: '1440p', compression: 0.3 },
            medium: { bitrate: 10000000, resolution: '1080p', compression: 0.5 },
            low: { bitrate: 3000000, resolution: '720p', compression: 0.7 }
        };
        
        const settings = qualitySettings[adaptation.quality] || qualitySettings.medium;
        
        // Emit quality change event
        this.emit('quality_change', {
            quality: adaptation.quality,
            fps: adaptation.fps,
            settings,
            reason: this.getAdaptationReason()
        });
    }

    getAdaptationReason() {
        if (this.stats.latency > 200) return 'high_latency';
        if (this.stats.jitter > 50) return 'high_jitter';
        if (this.stats.packetLoss > 2) return 'packet_loss';
        if (this.currentStrategy?.aggressiveness > 0.7) return 'unstable_network';
        return 'optimization';
    }

    processFrame(frameData, timestamp) {
        const now = Date.now();
        const frameLatency = now - timestamp;
        
        // Update stats
        this.updateStats(frameLatency);
        
        // Decide whether to process or skip frame
        if (this.shouldSkipFrame(frameLatency)) {
            this.skippedFrames++;
            return null;
        }
        
        // Apply frame processing optimizations
        const processedFrame = this.optimizeFrame(frameData, frameLatency);
        
        // Add to buffer if using predictive buffering
        if (this.options.predictiveBuffering) {
            this.addToBuffer(processedFrame, timestamp);
            return this.getOptimalFrameFromBuffer();
        }
        
        this.totalFrames++;
        return processedFrame;
    }

    shouldSkipFrame(latency) {
        if (!this.options.frameSkipping) return false;
        
        const timeSinceLastFrame = Date.now() - this.lastFrameTime;
        const targetFrameInterval = 1000 / this.currentStrategy?.adaptation?.fps || this.options.targetFPS;
        
        // Skip if we're behind schedule and network is struggling
        return latency > this.options.maxLatency && timeSinceLastFrame < targetFrameInterval * 0.8;
    }

    optimizeFrame(frameData, latency) {
        // Apply compression based on network conditions
        const compressionLevel = this.calculateCompressionLevel(latency);
        
        // Apply resolution scaling if needed
        const scaleFactor = this.calculateScaleFactor(latency);
        
        return {
            ...frameData,
            compression: compressionLevel,
            scale: scaleFactor,
            optimized: true,
            optimizationLevel: this.getOptimizationLevel(latency)
        };
    }

    calculateCompressionLevel(latency) {
        if (latency < 50) return 0.1; // Minimal compression
        if (latency < 100) return 0.3;
        if (latency < 200) return 0.5;
        return 0.7; // High compression for high latency
    }

    calculateScaleFactor(latency) {
        if (latency < 50) return 1.0; // Full resolution
        if (latency < 100) return 0.9;
        if (latency < 200) return 0.7;
        return 0.5; // Half resolution for high latency
    }

    getOptimizationLevel(latency) {
        if (latency < 50) return 'minimal';
        if (latency < 100) return 'moderate';
        if (latency < 200) return 'aggressive';
        return 'maximum';
    }

    addToBuffer(frame, timestamp) {
        this.frameBuffer.push({ frame, timestamp, arrived: Date.now() });
        
        // Keep buffer size optimal
        const maxBufferSize = this.currentStrategy?.adaptation?.buffering || 3;
        if (this.frameBuffer.length > maxBufferSize) {
            this.frameBuffer.shift();
        }
    }

    getOptimalFrameFromBuffer() {
        if (this.frameBuffer.length === 0) return null;
        
        // Sort by timestamp to get the most recent frame
        this.frameBuffer.sort((a, b) => b.timestamp - a.timestamp);
        
        const frame = this.frameBuffer.shift();
        this.lastFrameTime = Date.now();
        this.totalFrames++;
        
        return frame.frame;
    }

    updateStats(latency) {
        // Exponential moving average for smooth stats
        this.stats.latency = this.stats.latency * 0.8 + latency * 0.2;
        
        // Calculate jitter
        const jitter = Math.abs(latency - this.stats.latency);
        this.stats.jitter = this.stats.jitter * 0.9 + jitter * 0.1;
        
        // Update adaptation history
        this.adaptationHistory.push({
            timestamp: Date.now(),
            latency: this.stats.latency,
            jitter: this.stats.jitter,
            quality: this.stats.quality
        });
        
        // Keep history manageable
        if (this.adaptationHistory.length > 100) {
            this.adaptationHistory = this.adaptationHistory.slice(-50);
        }
    }

    getPerformanceReport() {
        const skipRate = this.totalFrames > 0 ? (this.skippedFrames / (this.totalFrames + this.skippedFrames)) * 100 : 0;
        
        return {
            stats: { ...this.stats },
            performance: {
                frameSkipRate: skipRate,
                totalFrames: this.totalFrames,
                skippedFrames: this.skippedFrames,
                bufferSize: this.frameBuffer.length,
                adaptationLevel: this.currentStrategy?.aggressiveness || 0
            },
            quality: {
                current: this.currentStrategy?.adaptation?.quality || 'medium',
                targetFPS: this.currentStrategy?.adaptation?.fps || this.options.targetFPS,
                optimization: this.getOptimizationLevel(this.stats.latency)
            }
        };
    }

    // EventEmitter-like functionality
    emit(event, data) {
        if (this.listeners && this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    on(event, callback) {
        if (!this.listeners) this.listeners = {};
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    destroy() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        this.frameBuffer = [];
        this.adaptationHistory = [];
    }
}

module.exports = AntiLagSystem;