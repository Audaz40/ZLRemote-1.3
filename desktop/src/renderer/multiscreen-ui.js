class MultiScreenUI {
    constructor(container, multiScreenManager) {
        this.container = container;
        this.manager = multiScreenManager;
        this.selectedScreens = new Set();
        this.render();
        this.setupEventHandlers();
    }

    render() {
        this.container.innerHTML = `
            <div class="multiscreen-panel">
                <div class="panel-header">
                    <h3>Gestión de Pantallas</h3>
                    <div class="panel-controls">
                        <button id="refreshScreens" class="btn-icon" title="Actualizar pantallas">🔄</button>
                        <button id="startAllCapture" class="btn btn-primary">Iniciar Todo</button>
                        <button id="stopAllCapture" class="btn btn-secondary">Detener Todo</button>
                    </div>
                </div>

                <div class="screens-grid" id="screensGrid">
                    <!-- Las pantallas se cargarán aquí -->
                </div>

                <div class="capture-settings" id="captureSettings">
                    <h4>Configuración de Captura</h4>
                    <div class="settings-grid">
                        <div class="setting-group">
                            <label>FPS:</label>
                            <select id="fpsSelect">
                                <option value="30">30 FPS</option>
                                <option value="60" selected>60 FPS</option>
                                <option value="120">120 FPS</option>
                                <option value="144">144 FPS</option>
                            </select>
                        </div>
                        
                        <div class="setting-group">
                            <label>Calidad:</label>
                            <select id="qualitySelect">
                                <option value="low">Baja</option>
                                <option value="medium">Media</option>
                                <option value="high" selected>Alta</option>
                                <option value="lossless">Sin pérdida</option>
                            </select>
                        </div>
                        
                        <div class="setting-group">
                            <label>Resolución:</label>
                            <select id="resolutionSelect">
                                <option value="native" selected>Nativa</option>
                                <option value="1920x1080">1920x1080</option>
                                <option value="1280x720">1280x720</option>
                                <option value="854x480">854x480</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="capture-stats" id="captureStats">
                    <h4>Estadísticas de Captura</h4>
                    <div class="stats-container" id="statsContainer">
                        <!-- Estadísticas se mostrarán aquí -->
                    </div>
                </div>
            </div>
        `;

        this.setupStyles();
    }

    setupStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .multiscreen-panel {
                background: white;
                border-radius: 12px;
                padding: 20px;
                margin: 20px 0;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            }

            .panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid #f0f0f0;
            }

            .panel-header h3 {
                margin: 0;
                color: #333;
                font-weight: 600;
            }

            .panel-controls {
                display: flex;
                gap: 10px;
                align-items: center;
            }

            .screens-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .screen-card {
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                padding: 15px;
                background: #f8f9fa;
                transition: all 0.3s ease;
                cursor: pointer;
                position: relative;
            }

            .screen-card:hover {
                border-color: #667eea;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
            }

            .screen-card.active {
                border-color: #51cf66;
                background: #f8fff9;
            }

            .screen-card.selected {
                border-color: #667eea;
                background: #f0f4ff;
            }

            .screen-preview {
                width: 100%;
                height: 150px;
                background: #000;
                border-radius: 8px;
                margin-bottom: 10px;
                overflow: hidden;
                position: relative;
            }

            .screen-preview img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .screen-preview .no-preview {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #666;
                font-size: 48px;
            }

            .screen-info {
                margin-bottom: 15px;
            }

            .screen-name {
                font-weight: 600;
                font-size: 16px;
                margin-bottom: 5px;
                color: #333;
            }

            .screen-details {
                font-size: 13px;
                color: #666;
                line-height: 1.4;
            }

            .screen-controls {
                display: flex;
                gap: 8px;
            }

            .screen-controls button {
                flex: 1;
                padding: 8px 12px;
                border: none;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .start-capture {
                background: #51cf66;
                color: white;
            }

            .start-capture:hover {
                background: #40c057;
            }

            .stop-capture {
                background: #ff6b6b;
                color: white;
            }

            .stop-capture:hover {
                background: #ff5252;
            }

            .screen-status {
                position: absolute;
                top: 10px;
                right: 10px;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
                color: white;
            }

            .screen-status.active {
                background: #51cf66;
            }

            .screen-status.inactive {
                background: #868e96;
            }

            .screen-status.primary {
                background: #667eea;
            }

            .capture-settings, .capture-stats {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
            }

            .capture-settings h4, .capture-stats h4 {
                margin: 0 0 15px 0;
                color: #333;
                font-weight: 600;
            }

            .settings-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
            }

            .setting-group {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }

            .setting-group label {
                font-size: 14px;
                font-weight: 500;
                color: #555;
            }

            .setting-group select {
                padding: 8px 12px;
                border: 2px solid #e2e8f0;
                border-radius: 6px;
                font-size: 14px;
                background: white;
                cursor: pointer;
                transition: border-color 0.2s ease;
            }

            .setting-group select:focus {
                outline: none;
                border-color: #667eea;
            }

            .stats-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 15px;
            }

            .stat-card {
                background: white;
                border-radius: 8px;
                padding: 15px;
                border: 1px solid #e2e8f0;
            }

            .stat-title {
                font-weight: 600;
                font-size: 14px;
                color: #333;
                margin-bottom: 10px;
            }

            .stat-values {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }

            .stat-item {
                display: flex;
                justify-content: space-between;
                font-size: 13px;
            }

            .stat-label {
                color: #666;
            }

            .stat-value {
                font-weight: 500;
                color: #333;
            }

            .btn-icon {
                background: #f8f9fa;
                border: 2px solid #e2e8f0;
                border-radius: 6px;
                padding: 8px;
                cursor: pointer;
                font-size: 16px;
                transition: all 0.2s ease;
            }

            .btn-icon:hover {
                background: #e9ecef;
                border-color: #667eea;
            }
        `;
        document.head.appendChild(style);
    }

    setupEventHandlers() {
        // Botones principales
        document.getElementById('refreshScreens').addEventListener('click', () => {
            this.manager.detectScreens();
        });

        document.getElementById('startAllCapture').addEventListener('click', () => {
            this.startAllSelectedScreens();
        });

        document.getElementById('stopAllCapture').addEventListener('click', () => {
            this.stopAllActiveScreens();
        });

        // Cambios en configuración
        ['fpsSelect', 'qualitySelect', 'resolutionSelect'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                this.updateCaptureSettings();
            });
        });

        // Suscribirse a cambios del manager
        this.manager.subscribeToScreens((type, data) => {
            if (type === 'screens') {
                this.updateScreensDisplay(data);
            } else if (type === 'frame') {
                this.updateScreenPreview(data);
            }
        });

        // Actualizar estadísticas cada segundo
        setInterval(() => {
            this.updateStats();
        }, 1000);
    }

    updateScreensDisplay(screensData) {
        const grid = document.getElementById('screensGrid');
        
        grid.innerHTML = screensData.screens.map(screen => `
            <div class="screen-card ${screen.isActive ? 'active' : ''}" 
                 data-screen-id="${screen.id}" 
                 onclick="this.classList.toggle('selected')">
                
                <div class="screen-status ${screen.isActive ? 'active' : 'inactive'}">
                    ${screen.isActive ? 'ACTIVA' : 'INACTIVA'}
                </div>
                
                ${screen.primary ? '<div class="screen-status primary">PRINCIPAL</div>' : ''}
                
                <div class="screen-preview">
                    ${screen.thumbnail ? 
                        `<img src="${screen.thumbnail}" alt="Preview">` : 
                        '<div class="no-preview">🖥️</div>'
                    }
                </div>
                
                <div class="screen-info">
                    <div class="screen-name">${screen.name}</div>
                    <div class="screen-details">
                        Resolución: ${screen.bounds.width}x${screen.bounds.height}<br>
                        Posición: (${screen.bounds.x}, ${screen.bounds.y})
                    </div>
                </div>
                
                <div class="screen-controls">
                    <button class="start-capture" onclick="event.stopPropagation(); window.multiScreenUI.startCapture(${screen.id})">
                        ${screen.isActive ? 'Configurar' : 'Iniciar'}
                    </button>
                    <button class="stop-capture" onclick="event.stopPropagation(); window.multiScreenUI.stopCapture(${screen.id})" 
                            ${!screen.isActive ? 'disabled' : ''}>
                        Detener
                    </button>
                </div>
            </div>
        `).join('');

        // Guardar referencia global para callbacks
        window.multiScreenUI = this;
    }

    updateScreenPreview(frameData) {
        const screenCard = document.querySelector(`[data-screen-id="${frameData.screenId}"]`);
        if (screenCard) {
            const preview = screenCard.querySelector('.screen-preview img');
            if (preview) {
                preview.src = `data:image/${frameData.format};base64,${frameData.data}`;
            }
        }
    }

    async startCapture(screenId) {
        const config = this.getCurrentConfig();
        try {
            await this.manager.startCapture(screenId, config);
        } catch (error) {
            alert(`Error al iniciar captura: ${error.message}`);
        }
    }

    async stopCapture(screenId) {
        await this.manager.stopCapture(screenId);
    }

    async startAllSelectedScreens() {
        const selectedCards = document.querySelectorAll('.screen-card.selected');
        const config = this.getCurrentConfig();
        
        for (const card of selectedCards) {
            const screenId = parseInt(card.dataset.screenId);
            try {
                await this.manager.startCapture(screenId, config);
            } catch (error) {
                console.error(`Error starting capture for screen ${screenId}:`, error);
            }
        }
    }

    async stopAllActiveScreens() {
        const activeCards = document.querySelectorAll('.screen-card.active');
        
        for (const card of activeCards) {
            const screenId = parseInt(card.dataset.screenId);
            await this.manager.stopCapture(screenId);
        }
    }

    getCurrentConfig() {
        return {
            fps: parseInt(document.getElementById('fpsSelect').value),
            quality: document.getElementById('qualitySelect').value,
            resolution: document.getElementById('resolutionSelect').value
        };
    }

    updateCaptureSettings() {
        const config = this.getCurrentConfig();
        
        // Aplicar configuración a todas las capturas activas
        this.manager.activeScreens.forEach((captureState, screenId) => {
            this.manager.updateCaptureConfig(screenId, config);
        });
    }

    updateStats() {
        const statsContainer = document.getElementById('statsContainer');
        const stats = [];
        
        this.manager.activeScreens.forEach((captureState, screenId) => {
            const screenStats = this.manager.getCaptureStats(screenId);
            if (screenStats) {
                stats.push(screenStats);
            }
        });

        if (stats.length === 0) {
            statsContainer.innerHTML = '<p style="text-align: center; color: #666;">No hay capturas activas</p>';
            return;
        }

        statsContainer.innerHTML = stats.map(stat => `
            <div class="stat-card">
                <div class="stat-title">Pantalla ${stat.screenId}</div>
                <div class="stat-values">
                    <div class="stat-item">
                        <span class="stat-label">FPS Actual:</span>
                        <span class="stat-value">${stat.avgFPS}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">FPS Objetivo:</span>
                        <span class="stat-value">${stat.targetFPS}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Frames:</span>
                        <span class="stat-value">${stat.frameCount}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Calidad:</span>
                        <span class="stat-value">${stat.quality}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Tiempo:</span>
                        <span class="stat-value">${Math.round(stat.runTime / 1000)}s</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

module.exports = MultiScreenUI;