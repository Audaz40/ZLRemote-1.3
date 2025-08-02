const { ipcRenderer } = require('electron');

class ZLRemoteDesktop {
    constructor() {
        this.ws = null;
        this.pc = null;
        this.localStream = null;
        this.isHost = false;
        this.isReconnecting = false;
        this.sessionId = null;
        this.viewers = new Map();
        this.iceCandidateQueues = new Map();
        this.isPaused = false;
        this.audioEnabled = true;
        this.frameCount = 0;
        this.lastFPSUpdate = Date.now();
        this.fpsInterval = null;
        
        // Cola para mensajes enviados antes de que el WebSocket esté listo
        this.messageQueue = []; 

        this.screens = {
            welcome: document.getElementById('welcomeScreen'),
            host: document.getElementById('hostScreen'),
            connect: document.getElementById('connectScreen')
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.connectToServer();
        this.setupWindowControls();
        this.setupChat();
        this.showScreen('welcome');
    }

    setupEventListeners() {
        // Welcome screen
        document.getElementById('hostCard').addEventListener('click', () => {
            this.startHosting();
        });

        document.getElementById('connectCard').addEventListener('click', () => {
            this.showScreen('connect');
        });

        // Connect screen
        document.getElementById('backBtn').addEventListener('click', () => {
            this.showScreen('welcome');
        });

        document.getElementById('joinBtn').addEventListener('click', () => {
            this.joinSession();
        });

        document.getElementById('sessionInput').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        // Host screen controls
        document.getElementById('copyBtn').addEventListener('click', () => {
            this.copySessionId();
        });

        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.togglePause();
        });

        document.getElementById('audioBtn').addEventListener('click', () => {
            this.toggleAudio();
        });

        document.getElementById('stopBtn').addEventListener('click', () => {
            this.stopHosting();
        });

        // Enter key on session input
        document.getElementById('sessionInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.joinSession();
            }
        });

        document.getElementById('passwordInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.joinSession();
            }
        });
    }

    setupWindowControls() {
        // Window control buttons
        document.getElementById('minimizeBtn').addEventListener('click', () => {
            ipcRenderer.send('window-minimize');
        });

        document.getElementById('maximizeBtn').addEventListener('click', () => {
            ipcRenderer.send('window-maximize');
        });

        document.getElementById('closeBtn').addEventListener('click', () => {
            if (this.isHost) {
                if (confirm('Are you sure you want to stop hosting and close?')) {
                    this.stopHosting();
                    ipcRenderer.send('window-close');
                }
            } else {
                ipcRenderer.send('window-close');
            }
        });

        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showToast('Settings coming soon', 'info');
        });
    }

    showScreen(screenName) {
        // Hide all screens
        Object.values(this.screens).forEach(screen => {
            if (screen && screen.style) {
                screen.style.display = 'none';
            }
        });

        // Show selected screen
        if (this.screens[screenName] && this.screens[screenName].style) {
            this.screens[screenName].style.display = 'flex';
            this.screens[screenName].classList.add('fade-in');
        } else {
            console.error(`Screen '${screenName}' not found or not properly initialized`);
        }

        // Update FAB visibility
        const fab = document.getElementById('fabBtn');
        if (fab && fab.style) {
            fab.style.display = screenName === 'host' ? 'flex' : 'none';
        }
    }

    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.log('WebSocket not ready, queuing message:', message.type);
            this.messageQueue.push(message);
        }
    }

    connectToServer() {
        const wsUrl = 'wss://zlremote-server.duckdns.org';
        console.log('Connecting to:', wsUrl);
        
        // Don't try to reconnect if we're already trying to connect
        if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
            console.log('WebSocket connection already in progress or established');
            return;
        }

        try {
            this.ws = new WebSocket(wsUrl);
            
            // Set a timeout for the connection
            const connectionTimeout = setTimeout(() => {
                if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
                    console.error('Connection timeout');
                    this.ws.close();
                    this.showToast('Connection timeout. Please check your internet connection and try again.', 'error');
                    this.updateConnectionStatus(false);
                }
            }, 10000); // 10 seconds timeout
            
            this.ws.onopen = () => {
                console.log('Connected to server');
                clearTimeout(connectionTimeout);
                this.updateConnectionStatus(true);
                
                // Process any queued messages
                while (this.messageQueue.length > 0) {
                    const message = this.messageQueue.shift();
                    this.sendMessage(message);
                }
                
                this.onOpen();
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleServerMessage(message);
                } catch (error) {
                    console.error('Error processing message:', error);
                }
            };
            
            this.ws.onclose = () => {
                clearTimeout(connectionTimeout);
                console.log('Disconnected from server');
                this.updateConnectionStatus(false);
                this.showToast('Disconnected from server', 'error');
                
                // Only attempt to reconnect if we're not already reconnecting
                if (!this.isReconnecting) {
                    this.isReconnecting = true;
                    console.log('Attempting to reconnect in 5 seconds...');
                    setTimeout(() => {
                        this.isReconnecting = false;
                        this.connectToServer();
                    }, 5000);
                }
            };
            
            this.ws.onerror = (error) => {
                clearTimeout(connectionTimeout);
                console.error('WebSocket error:', error);
                this.showToast('Connection error. Please try again later.', 'error');
                this.updateConnectionStatus(false);
            };
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            this.showToast('Failed to connect to server. Please check your internet connection.', 'error');
            this.updateConnectionStatus(false);
            
            // Schedule a reconnection attempt
            if (!this.isReconnecting) {
                this.isReconnecting = true;
                console.log('Scheduling reconnection attempt in 5 seconds...');
                setTimeout(() => {
                    this.isReconnecting = false;
                    this.connectToServer();
                }, 5000);
            }
        }
    }

    /**
     * Called when the WebSocket connection is successfully opened
     */
    onOpen() {
        console.log('WebSocket connection established');
        // Any additional initialization after connection is established
    }

    /**
     * Update the connection status UI
     * @param {boolean} connected - Whether the connection is active
     */
    updateConnectionStatus(connected) {
        const statusEl = document.getElementById('connectionStatus');
        const statusText = document.getElementById('statusText');
        
        if (connected) {
            statusEl.classList.add('connected');
            statusText.textContent = 'Connected';
        } else {
            statusEl.classList.remove('connected');
            statusText.textContent = 'Disconnected';
        }
    }

    async startHosting() {
        try {
            this.isHost = true;
            ipcRenderer.send('set-host-status', true);
            
            this.showScreen('host');
            
            const sources = await ipcRenderer.invoke('get-screen-sources');
            const source = sources.find(s => s.name.includes('Screen')) || sources[0];
            
            if (!source) throw new Error('No screen source available');
            
            console.log('Using source:', source.name);
            
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: source.id,
                        minWidth: 1280,
                        maxWidth: 1920,
                        minHeight: 720,
                        maxHeight: 1080,
                        maxFrameRate: 60,
                        minFrameRate: 30
                    }
                }
            });

            const video = document.createElement('video');
            video.srcObject = this.localStream;
            video.autoplay = true;
            video.muted = true;
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'contain';
            
            const container = document.getElementById('screenContainer');
            container.innerHTML = '';
            container.appendChild(video);

            this.sendMessage({
                type: 'register_host',
                deviceInfo: {
                    platform: 'desktop',
                    resolution: `${source.bounds?.width || 1920}x${source.bounds?.height || 1080}`,
                    os: process.platform
                }
            });

            this.startFPSCounter();
            ipcRenderer.send('window-maximize');
            this.showToast('Screen sharing started', 'success');

        } catch (error) {
            console.error('Failed to start hosting:', error);
            if (error.name === 'NotAllowedError') {
                this.showToast('Screen sharing permission was denied', 'error');
            } else {
                this.showToast('Failed to start screen sharing: ' + error.message, 'error');
            }
            this.showScreen('welcome');
            this.isHost = false;
            ipcRenderer.send('set-host-status', false);
        }
    }

    async handleServerMessage(message) {
        console.log('Server message:', message.type);
        
        switch (message.type) {
            case 'client_id':
                this.clientId = message.clientId;
                break;
                
            case 'host_registered':
                this.sessionId = message.sessionId;
                this.displaySessionId();
                break;
                
            case 'viewer_joined':
                await this.handleViewerJoined(message.viewerId);
                break;
                
            case 'viewer_ready':
                const readyPc = this.viewers.get(message.viewerId);
                if (readyPc) {
                    await this.createOffer(readyPc, message.viewerId);
                }
                break;
                
            case 'webrtc_answer':
                await this.handleWebRTCAnswer(message);
                break;
                
            case 'ice_candidate':
                await this.handleICECandidate(message);
                break;
                
            case 'viewer_left':
                this.handleViewerLeft(message.viewerId);
                break;
                
            case 'input_event':
                this.handleRemoteInput(message.data);
                break;
                
            case 'chat':
                this.handleChatMessage(message);
                break;
                
            case 'connected_to_host':
                this.showToast('Connected to session', 'success');
                this.showScreen('welcome'); // Or navigate to a viewer screen if implemented
                break;
                
            case 'error':
                this.showToast(message.message, 'error');
                break;
        }
    }

    async handleViewerJoined(viewerId) {
        console.log('Viewer joined:', viewerId);
        const pc = await this.setupWebRTC(viewerId);
        this.updateViewerCount();
        this.showToast('A viewer has connected', 'success');
        await this.createOffer(pc, viewerId);
    }

    async setupWebRTC(viewerId) {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ],
            iceCandidatePoolSize: 10
        };

        const pc = new RTCPeerConnection(configuration);
        this.viewers.set(viewerId, pc);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendMessage({
                    type: 'ice_candidate',
                    candidate: event.candidate,
                    sessionId: this.sessionId
                });
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log(`ICE state for ${viewerId}:`, pc.iceConnectionState);
            if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                this.viewers.delete(viewerId);
                this.updateViewerCount();
            }
        };

        if (this.localStream && !this.isPaused) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });
        }

        return pc;
    }

    async createOffer(pc, viewerId) {
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            this.sendMessage({
                type: 'webrtc_offer',
                offer: offer,
                sessionId: this.sessionId,
                viewerId: viewerId
            });
            
        } catch (error) {
            console.error('Failed to create offer:', error);
        }
    }

    async handleWebRTCAnswer(message) {
        const pc = this.viewers.get(message.viewerId);
        if (pc) {
            await pc.setRemoteDescription(message.answer);
            
            if (this.iceCandidateQueues.has(message.viewerId)) {
                const queue = this.iceCandidateQueues.get(message.viewerId);
                while (queue.length > 0) {
                    await pc.addIceCandidate(queue.shift());
                }
                this.iceCandidateQueues.delete(message.viewerId);
            }
        }
    }

    async handleICECandidate(message) {
        const pc = this.viewers.get(message.viewerId);
        if (pc && pc.remoteDescription) {
            try {
                await pc.addIceCandidate(message.candidate);
            } catch (e) {
                console.error('Error adding ICE candidate', e);
            }
        } else if (pc) {
            if (!this.iceCandidateQueues.has(message.viewerId)) {
                this.iceCandidateQueues.set(message.viewerId, []);
            }
            this.iceCandidateQueues.get(message.viewerId).push(message.candidate);
        }
    }

    handleViewerLeft(viewerId) {
        const pc = this.viewers.get(viewerId);
        if (pc) {
            pc.close();
            this.viewers.delete(viewerId);
            this.updateViewerCount();
            this.showToast('A viewer has disconnected', 'info');
        }
    }

    handleRemoteInput(inputData) {
        if (!this.isPaused) {
            ipcRenderer.send('input-event', inputData);
        }
    }

    displaySessionId() {
        document.getElementById('sessionId').textContent = this.sessionId;
    }

    async copySessionId() {
        try {
            await navigator.clipboard.writeText(this.sessionId);
            
            const btn = document.getElementById('copyBtn');
            const originalHTML = btn.innerHTML;
            
            // Cambiar el ícono a un checkmark
            btn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
            `;
            
            // Mostrar notificación
            this.showToast('Session ID copied to clipboard', 'success');
            
            // Restaurar el ícono después de 2 segundos
            setTimeout(() => {
                btn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                `;
            }, 2000);
            
        } catch (err) {
            console.error('Failed to copy session ID:', err);
            this.showToast('Failed to copy session ID', 'error');
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const btn = document.getElementById('pauseBtn');
        const icon = btn.querySelector('svg');
        const btnText = btn.querySelector('span');
        
        // Actualizar el texto del botón
        btnText.textContent = this.isPaused ? 'Resume' : 'Pause';
        
        // Cambiar el ícono según el estado de pausa
        if (this.isPaused) {
            icon.innerHTML = `
                <polygon points="5 4 15 12 5 20 5 4"></polygon>
            `;
            this.showToast('Screen sharing paused', 'warning');
        } else {
            icon.innerHTML = `
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
            `;
            this.showToast('Screen sharing resumed', 'success');
        }
        
        // Pausar/reanudar las pistas de video para todos los espectadores
        this.viewers.forEach(pc => {
            pc.getSenders().forEach(sender => {
                if (sender.track && sender.track.kind === 'video') {
                    sender.track.enabled = !this.isPaused;
                }
            });
        });
        
        // Si hay una transmisión local, también pausar/reanudar las pistas locales
        if (this.localStream) {
            this.localStream.getVideoTracks().forEach(track => {
                track.enabled = !this.isPaused;
            });
        }
    }

    toggleAudio() {
        this.audioEnabled = !this.audioEnabled;
        const btn = document.getElementById('audioBtn');
        const icon = btn.querySelector('svg');
        
        // Cambiar la opacidad del botón
        btn.style.opacity = this.audioEnabled ? '1' : '0.5';
        
        // Cambiar el ícono según el estado del audio
        if (this.audioEnabled) {
            icon.innerHTML = `
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            `;
            this.showToast('Audio enabled', 'success');
        } else {
            icon.innerHTML = `
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
            `;
            this.showToast('Audio disabled', 'info');
        }
        
        // Si hay una transmisión local, pausar/reanudar las pistas de audio
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = this.audioEnabled;
            });
        }
    }

    stopHosting() {
        if (!confirm('Are you sure you want to stop sharing?')) return;
            
        this.viewers.forEach(pc => pc.close());
        this.viewers.clear();
        
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        this.sendMessage({ type: 'stop_hosting', sessionId: this.sessionId });
        
        this.isHost = false;
        this.sessionId = null;
        ipcRenderer.send('set-host-status', false);
        
        if (this.fpsInterval) {
            clearInterval(this.fpsInterval);
            this.fpsInterval = null;
        }
        
        this.showScreen('welcome');
        this.showToast('Screen sharing stopped', 'info');
    }

    joinSession() {
        const sessionId = document.getElementById('sessionInput').value.trim().toUpperCase();
        const password = document.getElementById('passwordInput').value;
        
        if (!sessionId || sessionId.length < 6) {
            this.showToast('Invalid session ID', 'error');
            return;
        }
        
        this.sendMessage({
            type: 'connect_to_host',
            sessionId: sessionId,
            password: password || null
        });
        
        document.getElementById('sessionInput').value = '';
        document.getElementById('passwordInput').value = '';
    }

    updateViewerCount() {
        document.getElementById('viewerCount').textContent = this.viewers.size;
    }

    startFPSCounter() {
        // Clear any existing interval
        if (this.fpsInterval) clearInterval(this.fpsInterval);

        this.fpsInterval = setInterval(() => {
            // This is a placeholder as we're not counting frames on the host side directly anymore.
            // A more accurate FPS would be calculated from the video track.
            const fpsEl = document.getElementById('fpsCounter');
            if (this.localStream) {
                const videoTrack = this.localStream.getVideoTracks()[0];
                if (videoTrack && videoTrack.getSettings) {
                    const { frameRate } = videoTrack.getSettings();
                    fpsEl.textContent = frameRate ? Math.round(frameRate) : 'N/A';
                }
            } else {
                fpsEl.textContent = '0';
            }
        }, 1000);
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type} slide-up`;
        
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
            <span class="toast-message">${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            toast.addEventListener('animationend', () => {
                container.removeChild(toast);
            });
        }, 3000);
    }

    // Chat functionality
    setupChat() {
        this.chatPanel = document.getElementById('chatPanel');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.chatToggle = document.getElementById('chatToggle');
        this.closeChat = document.getElementById('closeChat');
        this.sendChatBtn = document.getElementById('sendChatBtn');
        this.chatIsOpen = false;

        // Toggle chat panel
        this.chatToggle.addEventListener('click', () => this.toggleChat());
        this.closeChat.addEventListener('click', () => this.toggleChat(false));

        // Send message on button click or Enter key
        this.sendChatBtn.addEventListener('click', () => this.sendChatMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
            }
        });

        // Show chat toggle when in host or connect mode
        this.chatToggle.style.display = 'flex';
    }

    toggleChat(show = null) {
        this.chatIsOpen = show !== null ? show : !this.chatIsOpen;
        
        if (this.chatIsOpen) {
            this.chatPanel.classList.remove('hidden');
            this.chatInput.focus();
        } else {
            this.chatPanel.classList.add('hidden');
        }
    }

    sendChatMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;

        // Add message to UI immediately
        this.addChatMessage('You', message, 'sent');
        
        // Clear input
        this.chatInput.value = '';
        
        // Send message via WebSocket if connected
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'chat',
                from: this.isHost ? 'host' : 'viewer',
                message: message,
                timestamp: new Date().toISOString()
            }));
        }
    }

    addChatMessage(sender, message, type = 'received') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-content">${message}</div>
            <div class="message-info">
                <span class="message-sender">${sender}</span>
                <span class="message-time">${timeString}</span>
            </div>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        
        // Show notification if chat is closed
        if (!this.chatIsOpen && type === 'received') {
            this.showToast('New message in chat', 'info');
        }
    }

    handleChatMessage(data) {
        if (!this.chatPanel) return;
        
        const sender = data.from === 'host' ? 'Host' : 'Viewer';
        this.addChatMessage(sender, data.message, data.from === 'host' ? 'received' : 'sent');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ZLRemoteDesktop();
});