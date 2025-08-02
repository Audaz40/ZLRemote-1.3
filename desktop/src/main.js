const { app, BrowserWindow, ipcMain, screen, desktopCapturer } = require('electron');
const path = require('path');

class ZLRemoteDesktop {
    constructor() {
        this.mainWindow = null;
        this.isHost = false;
    }

    createWindow() {
        // Configuración de la ventana principal
        this.mainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true
            },
            icon: path.join(__dirname, '../assets/icon.png'),
            title: 'ZLRemote Desktop',
            frame: false, // Sin marco para diseño personalizado
            backgroundColor: '#ffffff',
            show: false, // No mostrar hasta que esté listo
            titleBarStyle: 'hidden',
            trafficLightPosition: { x: 20, y: 20 } // Para macOS
        });

        // Cargar el archivo HTML
        this.mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
        
        // Mostrar cuando esté listo
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            
            // Auto-maximizar si es la primera vez
            const isFirstRun = !this.mainWindow.getBounds().width;
            if (isFirstRun) {
                this.mainWindow.maximize();
            }
        });
        
        // DevTools para desarrollo
        if (process.env.NODE_ENV === 'development') {
            this.mainWindow.webContents.openDevTools();
        }
    }

    setupIPC() {
        // Get available screen sources
        ipcMain.handle('get-screen-sources', async () => {
            try {
                const sources = await desktopCapturer.getSources({
                    types: ['screen', 'window'],
                    thumbnailSize: { width: 300, height: 200 }
                });
                
                return sources.map(source => ({
                    id: source.id,
                    name: source.name,
                    thumbnail: source.thumbnail.toDataURL()
                }));
            } catch (error) {
                console.error('Error getting screen sources:', error);
                return [];
            }
        });

        // Handle remote input events
        ipcMain.on('input-event', (event, data) => {
            if (!this.isHost) return;
            
            try {
                if (data.type === 'mouse') {
                    this.handleMouseEvent(data);
                } else if (data.type === 'keyboard') {
                    this.handleKeyboardEvent(data);
                }
            } catch (error) {
                console.error('Input event error:', error);
            }
        });

        // Set host status
        ipcMain.on('set-host-status', (event, isHost) => {
            this.isHost = isHost;
        });

        ipcMain.on('window-minimize', () => {
            this.mainWindow.minimize();
        });
        
        ipcMain.on('window-maximize', () => {
            if (this.mainWindow.isMaximized()) {
                this.mainWindow.unmaximize();
            } else {
                this.mainWindow.maximize();
            }
        });
        
        ipcMain.on('window-close', () => {
            this.mainWindow.close();
        });
        
        // Fullscreen toggle
        ipcMain.on('toggle-fullscreen', () => {
            if (this.mainWindow.isFullScreen()) {
                this.mainWindow.setFullScreen(false);
            } else {
                this.mainWindow.setFullScreen(true);
            }
        });
    }

    handleMouseEvent(data) {
        try {
            // Try to use robotjs if available
            const robot = require('robotjs');
            const screenSize = robot.getScreenSize();
            
            switch (data.action) {
                case 'move':
                    const x = (data.x / 100) * screenSize.width;
                    const y = (data.y / 100) * screenSize.height;
                    robot.moveMouse(x, y);
                    break;
                case 'click':
                    robot.mouseClick(data.button || 'left', data.double || false);
                    break;
                case 'scroll':
                    robot.scrollMouse(data.deltaX || 0, data.deltaY || 0);
                    break;
                case 'down':
                    robot.mouseToggle('down', data.button || 'left');
                    break;
                case 'up':
                    robot.mouseToggle('up', data.button || 'left');
                    break;
            }
        } catch (error) {
            console.log('robotjs not available - mouse simulation disabled');
            console.log('To enable: cd desktop && npm install robotjs && npm rebuild robotjs');
        }
    }

    handleKeyboardEvent(data) {
        try {
            const robot = require('robotjs');
            
            switch (data.action) {
                case 'keydown':
                    if (data.key && data.key.length === 1) {
                        robot.keyTap(data.key.toLowerCase(), data.modifiers || []);
                    } else {
                        // Handle special keys
                        const keyMap = {
                            'Enter': 'enter',
                            'Backspace': 'backspace',
                            'Tab': 'tab',
                            'Escape': 'escape',
                            'ArrowUp': 'up',
                            'ArrowDown': 'down',
                            'ArrowLeft': 'left',
                            'ArrowRight': 'right',
                            'Delete': 'delete',
                            'Home': 'home',
                            'End': 'end',
                            'PageUp': 'pageup',
                            'PageDown': 'pagedown',
                            ' ': 'space'
                        };
                        
                        const robotKey = keyMap[data.key] || data.key.toLowerCase();
                        robot.keyTap(robotKey, data.modifiers || []);
                    }
                    break;
                case 'type':
                    robot.typeString(data.text);
                    break;
            }
        } catch (error) {
            console.log('robotjs not available - keyboard simulation disabled');
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