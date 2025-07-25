const { app, BrowserWindow, ipcMain, screen, desktopCapturer } = require('electron');
const path = require('path');
const sharp = require('sharp');

class ZLRemoteDesktop {
    constructor() {
        this.mainWindow = null;
        this.isHost = false;
        this.captureInterval = null;
        this.lastFrameTime = 0;
        this.targetFPS = 60; // Reducido temporalmente
        this.frameInterval = 1000 / this.targetFPS;
    }

    createWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true
            },
            icon: path.join(__dirname, '../assets/icon.png'),
            title: 'ZLRemote',
            autoHideMenuBar: true,
            frame: true,
            resizable: true
        });

        this.mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
        
        // DevTools para desarrollo
        if (process.env.NODE_ENV === 'development') {
            this.mainWindow.webContents.openDevTools();
        }
    }

    setupIPC() {
        ipcMain.handle('start-host', async () => {
            this.isHost = true;
            return await this.startScreenCapture();
        });

        ipcMain.handle('stop-host', () => {
            this.stopScreenCapture();
            this.isHost = false;
        });

        ipcMain.handle('get-screen-sources', async () => {
            const sources = await desktopCapturer.getSources({
                types: ['window', 'screen'],
                thumbnailSize: { width: 150, height: 150 }
            });
            return sources;
        });

        // Eventos de mouse/teclado simulados (sin robotjs)
        ipcMain.on('mouse-event', (event, data) => {
            if (!this.isHost) return;
            console.log('Mouse event received:', data);
            // TODO: Implementar simulación de mouse sin robotjs
        });

        ipcMain.on('keyboard-event', (event, data) => {
            if (!this.isHost) return;
            console.log('Keyboard event received:', data);
            // TODO: Implementar simulación de teclado sin robotjs
        });
    }

    async startScreenCapture() {
        const displays = screen.getAllDisplays();
        const primaryDisplay = displays.find(display => display.primary) || displays[0];
        
        this.captureInterval = setInterval(async () => {
            const now = Date.now();
            if (now - this.lastFrameTime < this.frameInterval) return;
            
            try {
                const sources = await desktopCapturer.getSources({
                    types: ['screen'],
                    thumbnailSize: { 
                        width: primaryDisplay.bounds.width, 
                        height: primaryDisplay.bounds.height 
                    }
                });

                const source = sources.find(s => 
                    s.display_id === primaryDisplay.id.toString()
                );

                if (source) {
                    const frameData = await this.processFrame(source.thumbnail);
                    
                    this.mainWindow.webContents.send('screen-frame', {
                        data: frameData,
                        timestamp: now,
                        width: primaryDisplay.bounds.width,
                        height: primaryDisplay.bounds.height
                    });

                    this.lastFrameTime = now;
                }
            } catch (error) {
                console.error('Screen capture error:', error);
            }
        }, 16); // ~60 FPS
    }

    async processFrame(thumbnail) {
        try {
            const pngBuffer = thumbnail.toPNG();
            
            // Optimizar con Sharp
            const optimizedBuffer = await sharp(pngBuffer)
                .jpeg({ quality: 85, progressive: true })
                .toBuffer();

            return optimizedBuffer.toString('base64');
        } catch (error) {
            console.error('Frame processing error:', error);
            return null;
        }
    }

    stopScreenCapture() {
        if (this.captureInterval) {
            clearInterval(this.captureInterval);
            this.captureInterval = null;
        }
    }
}

const zlApp = new ZLRemoteDesktop();

app.whenReady().then(() => {
    zlApp.createWindow();
    zlApp.setupIPC();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        zlApp.createWindow();
    }
});