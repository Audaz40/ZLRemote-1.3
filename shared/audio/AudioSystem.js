class AudioSystem {
    constructor(websocket, options = {}) {
        this.ws = websocket;
        this.isHost = options.isHost || false;
        this.localStream = null;
        this.remoteAudio = null;
        this.audioContext = null;
        this.analyser = null;
        this.isRecording = false;
        this.isMuted = false;
        this.volume = 1.0;
        this.noiseSuppressionEnabled = true;
        this.echoCancellationEnabled = true;
        this.setupAudioContext();
        this.createAudioControls();
    }

    async setupAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        } catch (error) {
            console.error('Error setting up audio context:', error);
        }
    }

    createAudioControls() {
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'audio-controls';
        controlsContainer.innerHTML = `
            <div class="audio-panel">
                <div class="audio-header">
                    <h4>🎵 Control de Audio</h4>
                    <button class="minimize-btn" onclick="this.parentElement.parentElement.classList.toggle('minimized')">−</button>
                </div>
                
                <div class="audio-content">
                    <div class="audio-section">
                        <label>Micrófono</label>
                        <div class="mic-controls">
                            <button id="micToggle" class="audio-btn mic-btn">🎤</button>
                            <div class="volume-control">
                                <input type="range" id="micVolume" min="0" max="100" value="100" class="volume-slider">
                                <span id="micVolumeValue">100%</span>
                            </div>
                            <div class="audio-visualizer" id="micVisualizer">
                                <div class="visualizer-bars"></div>
                            </div>
                        </div>
                    </div>

                    <div class="audio-section">
                        <label>Altavoces</label>
                        <div class="speaker-controls">
                            <button id="speakerToggle" class="audio-btn speaker-btn">🔊</button>
                            <div class="volume-control">
                                <input type="range" id="speakerVolume" min="0" max="100" value="100" class="volume-slider">
                                <span id="speakerVolumeValue">100%</span>
                            </div>
                            <div class="audio-visualizer" id="speakerVisualizer">
                                <div class="visualizer-bars"></div>
                            </div>
                        </div>
                    </div>

                    <div class="audio-section">
                        <label>Configuración</label>
                        <div class="audio-settings">
                            <div class="setting-item">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="noiseSuppression" checked>
                                    <span class="checkmark"></span>
                                    Supresión de ruido
                                </label>
                            </div>
                            <div class="setting-item">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="echoCancellation" checked>
                                    <span class="checkmark"></span>
                                    Cancelación de eco
                                </label>
                            </div>
                            <div class="setting-item">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="autoGainControl" checked>
                                    <span class="checkmark"></span>
                                    Control automático de ganancia
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="audio-section">
                        <label>Dispositivos</label>
                        <div class="device-selection">
                            <select id="microphoneSelect" class="device-select">
                                <option>Cargando micrófonos...</option>
                            </select>
                            <select id="speakerSelect" class="device-select">
                                <option>Cargando altavoces...</option>
                            </select>
                        </div>
                    </div>

                    <div class="audio-status">
                        <div class="status-item">
                            <span class="status-label">Estado:</span>
                            <span id="audioStatus" class="status-value">Desconectado</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Latencia:</span>
                            <span id="audioLatency" class="status-value">0ms</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Bitrate:</span>
                            <span id="audioBitrate" class="status-value">0 kbps</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupAudioControlsStyles();
        this.setupAudioEventHandlers();
        document.body.appendChild(controlsContainer);
        
        // Cargar dispositivos disponibles
        this.loadAudioDevices();
        
        // Inicializar visualizadores
        this.initializeVisualizers();
    }

    setupAudioControlsStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .audio-controls {
                position: fixed;
                bottom: 20px;
                left: 20px;
                width: 320px;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(20px);
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                z-index: 10002;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                transition: all 0.3s ease;
            }

            .audio-controls.minimized .audio-content {
                display: none;
            }

            .audio-panel {
                overflow: hidden;
                border-radius: 16px;
            }

            .audio-header {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                padding: 15px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .audio-header h4 {
                margin: 0;
                font-weight: 600;
                font-size: 16px;
            }

            .minimize-btn {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 5px;
                border-radius: 50%;
                transition: background 0.2s;
            }

            .minimize-btn:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .audio-content {
                padding: 20px;
            }

            .audio-section {
                margin-bottom: 20px;
            }

            .audio-section label {
                display: block;
                font-weight: 600;
                color: #333;
                margin-bottom: 10px;
                font-size: 14px;
            }

            .mic-controls, .speaker-controls {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .audio-btn {
                width: 40px;
                height: 40px;
                border: none;
                border-radius: 50%;
                font-size: 18px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .mic-btn {
                background: #51cf66;
                color: white;
            }

            .mic-btn.muted {
                background: #ff6b6b;
            }

            .speaker-btn {
                background: #667eea;
                color: white;
            }

            .speaker-btn.muted {
                background: #868e96;
            }

            .audio-btn:hover {
                transform: scale(1.1);
            }

            .volume-control {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
            }

            .volume-slider {
                flex: 1;
                height: 6px;
                border-radius: 3px;
                background: #e9ecef;
                outline: none;
                cursor: pointer;
            }

            .volume-slider::-webkit-slider-thumb {
                appearance: none;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #667eea;
                cursor: pointer;
            }

            .audio-visualizer {
                width: 60px;
                height: 30px;
                background: #f8f9fa;
                border-radius: 6px;
                overflow: hidden;
                position: relative;
            }

            .visualizer-bars {
                display: flex;
                align-items: end;
                height: 100%;
                gap: 1px;
                padding: 2px;
            }

            .visualizer-bar {
                background: linear-gradient(to top, #667eea, #51cf66);
                width: 3px;
                transition: height 0.1s ease;
                border-radius: 1px;
            }

            .audio-settings {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .setting-item {
                display: flex;
                align-items: center;
            }

            .checkbox-label {
                display: flex;
                align-items: center;
                cursor: pointer;
                font-size: 14px;
                color: #555;
            }

            .checkbox-label input[type="checkbox"] {
                display: none;
            }

            .checkmark {
                width: 18px;
                height: 18px;
                border: 2px solid #ddd;
                border-radius: 4px;
                margin-right: 8px;
                position: relative;
                transition: all 0.2s ease;
            }

            .checkbox-label input[type="checkbox"]:checked + .checkmark {
                background: #667eea;
                border-color: #667eea;
            }

            .checkbox-label input[type="checkbox"]:checked + .checkmark:after {
                content: '✓';
                position: absolute;
                top: -2px;
                left: 2px;
                color: white;
                font-size: 12px;
                font-weight: bold;
            }

            .device-selection {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .device-select {
                padding: 8px 12px;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                background: white;
                font-size: 14px;
                cursor: pointer;
                transition: border-color 0.2s ease;
            }

            .device-select:focus {
                outline: none;
                border-color: #667eea;
            }

            .audio-status {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 12px;
                margin-top: 15px;
            }

            .status-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 4px;
                font-size: 13px;
            }

            .status-label {
                color: #666;
            }

            .status-value {
                font-weight: 500;
                color: #333;
            }
        `;
        document.head.appendChild(style);
    }

    setupAudioEventHandlers() {
        // Toggle micrófono
        document.getElementById('micToggle').addEventListener('click', () => {
            this.toggleMicrophone();
        });

        // Toggle altavoces
        document.getElementById('speakerToggle').addEventListener('click', () => {
            this.toggleSpeakers();
        });

        // Control de volumen micrófono
        document.getElementById('micVolume').addEventListener('input', (e) => {
            this.setMicrophoneVolume(e.target.value / 100);
            document.getElementById('micVolumeValue').textContent = `${e.target.value}%`;
        });

        // Control de volumen altavoces
        document.getElementById('speakerVolume').addEventListener('input', (e) => {
            this.setSpeakerVolume(e.target.value / 100);
            document.getElementById('speakerVolumeValue').textContent = `${e.target.value}%`;
        });

        // Configuraciones de audio
        document.getElementById('noiseSuppression').addEventListener('change', (e) => {
            this.noiseSuppressionEnabled = e.target.checked;
            this.updateAudioConstraints();
        });

        document.getElementById('echoCancellation').addEventListener('change', (e) => {
            this.echoCancellationEnabled = e.target.checked;
            this.updateAudioConstraints();
        });

        document.getElementById('autoGainControl').addEventListener('change', (e) => {
            this.autoGainControlEnabled = e.target.checked;
            this.updateAudioConstraints();
        });

        // Selección de dispositivos
        document.getElementById('microphoneSelect').addEventListener('change', (e) => {
            this.changeMicrophone(e.target.value);
        });

        document.getElementById('speakerSelect').addEventListener('change', (e) => {
            this.changeSpeaker(e.target.value);
        });

        // WebSocket events
        this.ws.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);
            if (message.type.startsWith('audio_')) {
                this.handleAudioMessage(message);
            }
        });
    }

    async loadAudioDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            const micSelect = document.getElementById('microphoneSelect');
            const speakerSelect = document.getElementById('speakerSelect');
            
            // Limpiar opciones
            micSelect.innerHTML = '';
            speakerSelect.innerHTML = '';
            
            devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Dispositivo ${device.deviceId.substr(0, 8)}`;
                
                if (device.kind === 'audioinput') {
                    micSelect.appendChild(option);
                } else if (device.kind === 'audiooutput') {
                    speakerSelect.appendChild(option);
                }
            });

        } catch (error) {
            console.error('Error loading audio devices:', error);
        }
    }

    async startAudioCapture() {
        try {
            const constraints = {
                audio: {
                    echoCancellation: this.echoCancellationEnabled,
                    noiseSuppression: this.noiseSuppressionEnabled,
                    autoGainControl: this.autoGainControlEnabled,
                    sampleRate: 48000,
                    channelCount: 2
                }
            };

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Conectar al analizador
            const source = this.audioContext.createMediaStreamSource(this.localStream);
            source.connect(this.analyser);
            
            // Configurar ganancia
            this.gainNode = this.audioContext.createGain();
            source.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);
            
            this.isRecording = true;
            this.updateAudioStatus('Conectado');
            
            // Iniciar transmisión de audio
            this.startAudioTransmission();
            
        } catch (error) {
            console.error('Error starting audio capture:', error);
            this.updateAudioStatus('Error');
        }
    }

    startAudioTransmission() {
        // Configurar MediaRecorder para transmisión
        this.mediaRecorder = new MediaRecorder(this.localStream, {
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 128000
        });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.sendAudioChunk(event.data);
            }
        };

        // Enviar chunks cada 100ms para baja latencia
        this.mediaRecorder.start(100);
    }

    async sendAudioChunk(audioBlob) {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const base64Audio = this.arrayBufferToBase64(arrayBuffer);
        
        this.ws.send(JSON.stringify({
            type: 'audio_chunk',
            data: {
                audio: base64Audio,
                timestamp: Date.now(),
                sampleRate: 48000,
                channels: 2
            }
        }));
    }

    handleAudioMessage(message) {
        switch (message.type) {
            case 'audio_chunk':
                this.playRemoteAudio(message.data);
                break;
            case 'audio_settings':
                this.applyRemoteAudioSettings(message.data);
                break;
        }
    }

    async playRemoteAudio(audioData) {
        try {
            const arrayBuffer = this.base64ToArrayBuffer(audioData.audio);
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            
            // Aplicar control de volumen
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = this.volume;
            
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Calcular latencia
            const latency = Date.now() - audioData.timestamp;
            this.updateAudioLatency(latency);
            
            source.start();
            
        } catch (error) {
            console.error('Error playing remote audio:', error);
        }
    }

    toggleMicrophone() {
        if (this.isRecording) {
            this.stopMicrophone();
        } else {
            this.startAudioCapture();
        }
    }

    stopMicrophone() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        
        this.isRecording = false;
        this.updateMicrophoneButton();
        this.updateAudioStatus('Desconectado');
    }

    toggleSpeakers() {
        this.isMuted = !this.isMuted;
        this.volume = this.isMuted ? 0 : document.getElementById('speakerVolume').value / 100;
        this.updateSpeakerButton();
    }

    setMicrophoneVolume(volume) {
        if (this.gainNode) {
            this.gainNode.gain.value = volume;
        }
    }

    setSpeakerVolume(volume) {
        this.volume = this.isMuted ? 0 : volume;
    }

    updateMicrophoneButton() {
        const btn = document.getElementById('micToggle');
        btn.className = `audio-btn mic-btn ${!this.isRecording ? 'muted' : ''}`;
        btn.textContent = this.isRecording ? '🎤' : '🔇';
    }

    updateSpeakerButton() {
        const btn = document.getElementById('speakerToggle');
        btn.className = `audio-btn speaker-btn ${this.isMuted ? 'muted' : ''}`;
        btn.textContent = this.isMuted ? '🔇' : '🔊';
    }

    async updateAudioConstraints() {
        if (this.localStream) {
            this.stopMicrophone();
            await new Promise(resolve => setTimeout(resolve, 100));
            this.startAudioCapture();
        }
    }

    async changeMicrophone(deviceId) {
        if (this.isRecording) {
            this.stopMicrophone();
            await new Promise(resolve => setTimeout(resolve, 100));
            this.startAudioCapture();
        }
    }

    async changeSpeaker(deviceId) {
        try {
            if (this.remoteAudio && this.remoteAudio.setSinkId) {
                await this.remoteAudio.setSinkId(deviceId);
            }
        } catch (error) {
            console.error('Error changing speaker:', error);
        }
    }

    initializeVisualizers() {
        // Crear barras de visualización
        const micVisualizer = document.querySelector('#micVisualizer .visualizer-bars');
        const speakerVisualizer = document.querySelector('#speakerVisualizer .visualizer-bars');
        
        for (let i = 0; i < 20; i++) {
            const bar = document.createElement('div');
            bar.className = 'visualizer-bar';
            bar.style.height = '2px';
            micVisualizer.appendChild(bar);
            
            const bar2 = document.createElement('div');
            bar2.className = 'visualizer-bar';
            bar2.style.height = '2px';
            speakerVisualizer.appendChild(bar2);
        }
        
        // Iniciar animación de visualizadores
        this.startVisualization();
    }

    startVisualization() {
        const updateVisualization = () => {
            if (this.analyser && this.isRecording) {
                this.analyser.getByteFrequencyData(this.dataArray);
                this.updateVisualizerBars('#micVisualizer', this.dataArray);
            }
            
            requestAnimationFrame(updateVisualization);
        };
        
        updateVisualization();
    }

    updateVisualizerBars(selector, dataArray) {
        const bars = document.querySelectorAll(`${selector} .visualizer-bar`);
        const step = Math.floor(dataArray.length / bars.length);
        
        bars.forEach((bar, index) => {
            const value = dataArray[index * step];
            const height = (value / 255) * 26; // 26px máximo
            bar.style.height = `${height + 2}px`; // +2px mínimo
        });
    }

    updateAudioStatus(status) {
        document.getElementById('audioStatus').textContent = status;
    }

    updateAudioLatency(latency) {
        document.getElementById('audioLatency').textContent = `${latency}ms`;
    }

    updateAudioBitrate(bitrate) {
        document.getElementById('audioBitrate').textContent = `${Math.round(bitrate / 1000)} kbps`;
    }

    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        bytes.forEach(byte => binary += String.fromCharCode(byte));
        return btoa(binary);
    }

    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    destroy() {
        this.stopMicrophone();
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        const controls = document.querySelector('.audio-controls');
        if (controls) controls.remove();
    }
}

module.exports = AudioSystem;