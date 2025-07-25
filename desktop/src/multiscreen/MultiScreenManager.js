const { screen, desktopCapturer } = require('electron');
const sharp = require('sharp');

class MultiScreenManager {
    constructor() {
        this.screens = [];
        this.activeScreens = new Map();
        this.captureIntervals = new Map();
        this.subscribers = new Set();
        this.init();
    }

    async init() {
        await this.detectScreens();
        this.setupScreenChangeDetection();
    }

    async detectScreens() {
        const displays = screen.getAllDisplays();
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: 300, height: 200 }
        });

        this.screens = displays.map(display => {
            const source = sources.find(s => 
                s.display_id === display.id.toString()
            );

            return {
                id: display.id,
                name: display.label || `Screen ${display.id}`,
                bounds: display.bounds,
                workArea: display.workArea,
                scaleFactor: display.scaleFactor,
                primary: display.primary,
                source: source,
                thumbnail: source ? source.thumbnail.toDataURL() : null,
                isActive: false
            };
        });

        this.notifyScreensChanged();
    }

    setupScreenChangeDetection() {
        screen.on('display-added', () => {
            this.detectScreens();
        });

        screen.on('display-removed', () => {
            this.detectScreens();
        });

        screen.on('display-metrics-changed', () => {
            this.detectScreens();
        });
    }

    async startCapture(screenId, options = {}) {
        if (this.activeScreens.has(screenId)) {
            return false; // Ya está activa
        }

        const screenInfo = this.screens.find(s => s.id === screenId);
        if (!screenInfo) {
            throw new Error(`Screen ${screenId} not found`);
        }

        const captureConfig = {
            fps: options.fps || 60,
            quality: options.quality || 'high',
            resolution: options.resolution || 'native',
            audioCapture: options.audioCapture || false
        };

        const captureState = {
            screenId,
            config: captureConfig,
            lastFrameTime: 0,
            frameInterval: 1000 / captureConfig.fps,
            frameCount: 0,
            subscribers: new Set()
        };

        this.activeScreens.set(screenId, captureState);

        // Iniciar captura
        const interval = setInterval(() => {
            this.captureFrame(screenId);
        }, 1);

        this.captureIntervals.set(screenId, interval);
        
        // Marcar pantalla como activa
        const screen = this.screens.find(s => s.id === screenId);
        if (screen) {
            screen.isActive = true;
        }

        this.notifyScreensChanged();
        return true;
    }

    async stopCapture(screenId) {
        const interval = this.captureIntervals.get(screenId);
        if (interval) {
            clearInterval(interval);
            this.captureIntervals.delete(screenId);
        }

        this.activeScreens.delete(screenId);

        // Marcar pantalla como inactiva
        const screen = this.screens.find(s => s.id === screenId);
        if (screen) {
            screen.isActive = false;
        }

        this.notifyScreensChanged();
    }

    async captureFrame(screenId) {
        const captureState = this.activeScreens.get(screenId);
        if (!captureState) return;

        const now = Date.now();
        if (now - captureState.lastFrameTime < captureState.frameInterval) {
            return;
        }

        try {
            const screenInfo = this.screens.find(s => s.id === screenId);
            const sources = await desktopCapturer.getSources({
                types: ['screen'],
                thumbnailSize: { 
                    width: screenInfo.bounds.width, 
                    height: screenInfo.bounds.height 
                }
            });

            const source = sources.find(s => 
                s.display_id === screenId.toString()
            );

            if (source) {
                const frameData = await this.processFrame(
                    source.thumbnail,
                    captureState.config,
                    screenInfo
                );

                captureState.frameCount++;
                captureState.lastFrameTime = now;

                // Enviar frame a suscriptores
                this.broadcastFrame(screenId, frameData);
            }
        } catch (error) {
            console.error(`Capture error for screen ${screenId}:`, error);
        }
    }

    async processFrame(thumbnail, config, screenInfo) {
        let imageBuffer = thumbnail.toPNG();

        // Procesar con Sharp para optimización
        let sharpImage = sharp(imageBuffer);

        // Ajustar resolución si es necesario
        if (config.resolution !== 'native') {
            const [width, height] = config.resolution.split('x').map(Number);
            sharpImage = sharpImage.resize(width, height, {
                fit: 'fill',
                kernel: sharp.kernel.lanczos3
            });
        }

        // Ajustar calidad
        let outputBuffer;
        switch (config.quality) {
            case 'low':
                outputBuffer = await sharpImage.jpeg({ quality: 60 }).toBuffer();
                break;
            case 'medium':
                outputBuffer = await sharpImage.jpeg({ quality: 80 }).toBuffer();
                break;
            case 'high':
                outputBuffer = await sharpImage.jpeg({ quality: 95 }).toBuffer();
                break;
            case 'lossless':
                outputBuffer = await sharpImage.png({ compressionLevel: 6 }).toBuffer();
                break;
            default:
                outputBuffer = await sharpImage.jpeg({ quality: 85 }).toBuffer();
        }

        return {
            screenId: screenInfo.id,
            data: outputBuffer.toString('base64'),
            timestamp: Date.now(),
            bounds: screenInfo.bounds,
            scaleFactor: screenInfo.scaleFactor,
            format: config.quality === 'lossless' ? 'png' : 'jpeg'
        };
    }

    broadcastFrame(screenId, frameData) {
        this.subscribers.forEach(callback => {
            try {
                callback('frame', { screenId, ...frameData });
            } catch (error) {
                console.error('Subscriber callback error:', error);
            }
        });
    }

    subscribeToScreens(callback) {
        this.subscribers.add(callback);
        
        // Enviar estado actual
        callback('screens', this.getScreensInfo());
        
        return () => {
            this.subscribers.delete(callback);
        };
    }

    getScreensInfo() {
        return {
            screens: this.screens.map(screen => ({
                id: screen.id,
                name: screen.name,
                bounds: screen.bounds,
                primary: screen.primary,
                isActive: screen.isActive,
                thumbnail: screen.thumbnail
            })),
            activeCount: this.activeScreens.size
        };
    }

    notifyScreensChanged() {
        const screensInfo = this.getScreensInfo();
        this.subscribers.forEach(callback => {
            try {
                callback('screens', screensInfo);
            } catch (error) {
                console.error('Screens changed notification error:', error);
            }
        });
    }

    // Método para cambiar configuración en tiempo real
    updateCaptureConfig(screenId, newConfig) {
        const captureState = this.activeScreens.get(screenId);
        if (!captureState) return false;

        // Actualizar configuración
        Object.assign(captureState.config, newConfig);
        
        // Actualizar intervalo de frame si cambió el FPS
        if (newConfig.fps) {
            captureState.frameInterval = 1000 / newConfig.fps;
        }

        return true;
    }

    // Método para obtener estadísticas de captura
    getCaptureStats(screenId) {
        const captureState = this.activeScreens.get(screenId);
        if (!captureState) return null;

        const now = Date.now();
        const runTime = now - (captureState.startTime || now);
        const avgFPS = captureState.frameCount / (runTime / 1000);

        return {
            screenId,
            frameCount: captureState.frameCount,
            avgFPS: Math.round(avgFPS),
            targetFPS: captureState.config.fps,
            quality: captureState.config.quality,
            runTime
        };
    }

    // Método para captura instantánea
    async captureScreenshot(screenId, options = {}) {
        const screenInfo = this.screens.find(s => s.id === screenId);
        if (!screenInfo) return null;

        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { 
                width: screenInfo.bounds.width, 
                height: screenInfo.bounds.height 
            }
        });

        const source = sources.find(s => 
            s.display_id === screenId.toString()
        );

        if (source) {
            const defaultConfig = {
                quality: 'high',
                resolution: 'native',
                format: 'png'
            };

            return await this.processFrame(
                source.thumbnail,
                { ...defaultConfig, ...options },
                screenInfo
            );
        }

        return null;
    }

    destroy() {
        // Limpiar todos los intervalos
        this.captureIntervals.forEach(interval => {
            clearInterval(interval);
        });
        
        this.captureIntervals.clear();
        this.activeScreens.clear();
        this.subscribers.clear();
    }
}

module.exports = MultiScreenManager;