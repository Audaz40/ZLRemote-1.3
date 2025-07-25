const { ipcRenderer } = require('electron');

class ZLRemoteDesktop {
    constructor() {
        this.ws = null;
        this.pc = null;
        this.localStream = null;
        this.isHost = false;
        this.sessionId = null;
        this.viewers = new Map();
        this.isPaused = false;
        this.audioEnabled = true;
        this.frameCount = 0;
        this.lastFPSUpdate = Date.now();
        
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
            screen.style.display = 'none';
        });

        // Show selected screen
        if (this.screens[screenName]) {
            this.screens[screenName].style.display = 'flex';
            this.screens[screenName].classList.add('fade-in');
        }

        // Update FAB visibility
        const fab = document.getElementById('fabBtn');
        fab.style.display = screenName === 'host' ? 'flex' : 'none';
    }

    connectToServer() {
        const wsUrl = process.env.WS_URL || 'ws://localhost:3001';
        console.log('Connecting to:', wsUrl);
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('Connected to server');
            this.updateConnectionStatus(true);
            this.showToast('Connected to server', 'success');
        };

        this.ws.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            await this.handleServerMessage(message);
        };

        this.ws.onclose = () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus(false);
            this.showToast('Disconnected from server', 'error');
            setTimeout(() => this.connectToServer(), 3000);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

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
            
            // Show host screen immediately
            this.showScreen('host');
            
            // Get available sources
            const sources = await ipcRenderer.invoke('get-screen-sources');
            
            // Use primary screen
            const source = sources.find(s => s.name.includes('Screen')) || sources[0];
            
            if (!source) {
                throw new Error('No screen source available');
            }
            
            console.log('Using source:', source.name);
            
            // Get screen stream with optimized settings
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

            // Display stream
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

            // Register as host
            this.ws.send(JSON.stringify({
                type: 'register_host',
                deviceInfo: {
                    platform: 'desktop',
                    resolution: `${source.bounds?.width || 1920}x${source.bounds?.height || 1080}`,
                    os: process.platform
                }
            }));

            // Start FPS counter
            this.startFPSCounter();
            
            // Auto-maximize window for better experience
            ipcRenderer.send('window-maximize');
            
            this.showToast('Screen sharing started', 'success');

        } catch (error) {
            console.error('Failed to start hosting:', error);
            this.showToast('Failed to start screen sharing: ' + error.message, 'error');
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
                
            case 'connected_to_host':
                this.showToast('Connected to session', 'success');
                this.showScreen('welcome');
                break;
                
            case 'error':
                this.showToast(message.message, 'error');
                break;
        }
    }

    async handleViewerJoined(viewerId) {
        console.log('Viewer joined:', viewerId);
        
        // Setup WebRTC for this viewer
        const pc = await this.setupWebRTC(viewerId);
        
        // Update viewer count
        this.updateViewerCount();
        
        this.showToast('A viewer has connected', 'success');
        
        // Create offer
        await this.createOffer(pc, viewerId);
    }

    async setupWebRTC(viewerId) {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ],
            iceCandidatePoolSize: 10
        };

        const pc = new RTCPeerConnection(configuration);
        this.viewers.set(viewerId, pc);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.ws.send(JSON.stringify({
                    type: 'ice_candidate',
                    candidate: event.candidate,
                    sessionId: this.sessionId
                }));
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log(`ICE state for ${viewerId}:`, pc.iceConnectionState);
            if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                this.viewers.delete(viewerId);
                this.updateViewerCount();
            }
        };

        // Add local stream tracks
        if (this.localStream && !this.isPaused) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });
        }

        return pc;
    }

    async createOffer(pc, viewerId) {
        try {
            const offer = await pc.createOffer({
                offerToReceiveAudio: false,
                offerToReceiveVideo: false
            });
            
            await pc.setLocalDescription(offer);
            
            this.ws.send(JSON.stringify({
                type: 'webrtc_offer',
                offer: offer,
                sessionId: this.sessionId,
                viewerId: viewerId
            }));
            
        } catch (error) {
            console.error('Failed to create offer:', error);
        }
    }

    async handleWebRTCAnswer(message) {
        const pc = this.viewers.get(message.viewerId);
        if (pc) {
            await pc.setRemoteDescription(message.answer);
        }
    }

    async handleICECandidate(message) {
        const pc = this.viewers.get(message.viewerId);
        if (pc) {
            await pc.addIceCandidate(message.candidate);
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

    copySessionId() {
        navigator.clipboard.writeText(this.sessionId).then(() => {
            this.showToast('Session ID copied to clipboard', 'success');
            
            // Visual feedback
            const btn = document.getElementById('copyBtn');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '✓';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
            }, 1000);
        });
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const btn = document.getElementById('pauseBtn');
        const btnText = btn.querySelector('span');
        
        if (this.isPaused) {
            btnText.textContent = 'Resume';
            this.showToast('Screen sharing paused', 'info');
            
            // Stop sharing video
            this.viewers.forEach((pc) => {
                const senders = pc.getSenders();
                senders.forEach(sender => {
                    if (sender.track && sender.track.kind === 'video') {
                        sender.track.enabled = false;
                    }
                });
            });
        } else {
            btnText.textContent = 'Pause';
            this.showToast('Screen sharing resumed', 'info');
            
            // Resume sharing video
            this.viewers.forEach((pc) => {
                const senders = pc.getSenders();
                senders.forEach(sender => {
                    if (sender.track && sender.track.kind === 'video') {
                        sender.track.enabled = true;
                    }
                });
            });
        }
    }

    toggleAudio() {
        this.audioEnabled = !this.audioEnabled;
        const btn = document.getElementById('audioBtn');
        
        if (this.audioEnabled) {
            btn.style.opacity = '1';
            this.showToast('Audio enabled', 'info');
        } else {
            btn.style.opacity = '0.5';
            this.showToast('Audio disabled', 'info');
        }
    }

    stopHosting() {
        if (confirm('Are you sure you want to stop sharing your screen?')) {
            // Stop all peer connections
            this.viewers.forEach((pc, viewerId) => {
                pc.close();
            });
            this.viewers.clear();
            
            // Stop local stream
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }
            
            // Notify server
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'stop_hosting',
                    sessionId: this.sessionId
                }));
            }
            
            // Reset state
            this.isHost = false;
            this.sessionId = null;
            ipcRenderer.send('set-host-status', false);
            
            // Return to welcome screen
            this.showScreen('welcome');
            
            this.showToast('Screen sharing stopped', 'info');
        }
    }

    joinSession() {
        const sessionId = document.getElementById('sessionInput').value.trim().toUpperCase();
        const password = document.getElementById('passwordInput').value;
        
        if (!sessionId) {
            this.showToast('Please enter a session ID', 'error');
            return;
        }
        
        if (sessionId.length < 6) {
            this.showToast('Invalid session ID', 'error');
            return;
        }
        
        this.ws.send(JSON.stringify({
            type: 'connect_to_host',
            sessionId: sessionId,
            password: password || null
        }));
        
        // Clear inputs
        document.getElementById('sessionInput').value = '';
        document.getElementById('passwordInput').value = '';
    }

    updateViewerCount() {
        document.getElementById('viewerCount').textContent = this.viewers.size;
    }

    startFPSCounter() {
        setInterval(() => {
            const now = Date.now();
            const elapsed = now - this.lastFPSUpdate;
            const fps = Math.round((this.frameCount * 1000) / elapsed);
            
            document.getElementById('fpsCounter').textContent = fps;
            
            this.frameCount = 0;
            this.lastFPSUpdate = now;
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
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                container.removeChild(toast);
            }, 300);
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ZLRemoteDesktop();
});