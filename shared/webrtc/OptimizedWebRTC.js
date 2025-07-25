const AntiLagSystem = require('../antilag/AntiLagSystem');

class OptimizedWebRTC {
    constructor(isHost = false, antiLagOptions = {}) {
        this.isHost = isHost;
        this.pc = null;
        this.dataChannel = null;
        this.antiLag = new AntiLagSystem(antiLagOptions);
        this.networkMonitor = null;
        this.codecPreferences = this.getOptimalCodecs();
        this.setupWebRTC();
        this.setupNetworkMonitoring();
    }

    getOptimalCodecs() {
        return {
            video: [
                // Hardware-accelerated codecs first
                'video/H264;profile-level-id=42e01f',  // Baseline profile for compatibility
                'video/H264;profile-level-id=4d001f',  // Main profile
                'video/H264;profile-level-id=64001f',  // High profile
                'video/VP9;profile-id=0',              // VP9 Profile 0
                'video/VP9;profile-id=2',              // VP9 Profile 2 (10-bit)
                'video/VP8',                           // Fallback
                'video/AV1'                            // Future-proof
            ],
            audio: [
                'audio/opus;stereo=1;sprop-stereo=1',  // Stereo Opus
                'audio/opus',                          // Mono Opus
                'audio/G722',                          // High quality fallback
                'audio/PCMU',                          // Universal fallback
                'audio/PCMA'
            ]
        };
    }

    async setupWebRTC() {
        // Advanced configuration for production
        const configuration = {
            iceServers: await this.getICEServers(),
            iceTransportPolicy: 'all',
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require',
            iceCandidatePoolSize: 10,
            sdpSemantics: 'unified-plan'
        };

        this.pc = new RTCPeerConnection(configuration);
        this.setupPeerConnectionHandlers();
        this.setupDataChannel();
        this.optimizeTransceivers();
    }

    async getICEServers() {
        try {
            // Fetch ICE servers from your server
            const response = await fetch('/api/ice-servers');
            const data = await response.json();
            return data.iceServers;
        } catch (error) {
            console.warn('Failed to fetch ICE servers, using defaults');
            return [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ];
        }
    }

    setupPeerConnectionHandlers() {
        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.emit('ice_candidate', event.candidate);
            }
        };

        this.pc.ontrack = (event) => {
            this.handleIncomingStream(event.streams[0]);
        };

        this.pc.ondatachannel = (event) => {
            this.setupDataChannelHandlers(event.channel);
        };

        this.pc.oniceconnectionstatechange = () => {
            this.handleConnectionStateChange();
        };

        this.pc.onnegotiationneeded = () => {
            this.handleNegotiationNeeded();
        };
    }

    setupDataChannel() {
        if (this.isHost) {
            this.dataChannel = this.pc.createDataChannel('control', {
                ordered: false,
                maxRetransmits: 0,
                maxPacketLifeTime: 100
            });
            this.setupDataChannelHandlers(this.dataChannel);
        }
    }

    setupDataChannelHandlers(channel) {
        channel.onopen = () => {
            console.log('Data channel opened');
            this.emit('data_channel_open');
        };

        channel.onmessage = (event) => {
            this.handleDataChannelMessage(event.data);
        };

        channel.onerror = (error) => {
            console.error('Data channel error:', error);
        };

        channel.onclose = () => {
            console.log('Data channel closed');
        };
    }

    async optimizeTransceivers() {
        // Configure video transceiver with optimal settings
        const videoTransceiver = this.pc.addTransceiver('video', {
            direction: this.isHost ? 'sendonly' : 'recvonly'
        });

        if (this.isHost && videoTransceiver.sender) {
            await this.optimizeVideoSender(videoTransceiver.sender);
        }

        // Configure audio transceiver
        const audioTransceiver = this.pc.addTransceiver('audio', {
            direction: 'sendrecv'
        });

        if (audioTransceiver.sender) {
            await this.optimizeAudioSender(audioTransceiver.sender);
        }
    }

    async optimizeVideoSender(sender) {
        const params = sender.getParameters();
        
        if (!params.encodings) {
            params.encodings = [{}];
        }

        // Configure encoding parameters for optimal quality and performance
        params.encodings[0] = {
            ...params.encodings[0],
            maxBitrate: 50000000,      // 50 Mbps max
            maxFramerate: 144,         // Support high FPS
            scaleResolutionDownBy: 1,  // Full resolution initially
            adaptivePtime: false,      // Disable adaptive packetization for low latency
            priority: 'high'
        };

        // Enable RTX for packet recovery
        params.rtcp = {
            cname: 'zlremote-sender',
            reducedSize: true
        };

        await sender.setParameters(params);
    }

    async optimizeAudioSender(sender) {
        const params = sender.getParameters();
        
        if (!params.encodings) {
            params.encodings = [{}];
        }

        params.encodings[0] = {
            ...params.encodings[0],
            maxBitrate: 128000,        // 128 kbps for high quality audio
            priority: 'high',
            networkPriority: 'high'
        };

        await sender.setParameters(params);
    }

    async createOptimizedOffer() {
        // Set codec preferences before creating offer
        this.setCodecPreferences();
        
        const offer = await this.pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
            iceRestart: false
        });

        // Optimize SDP for low latency
        offer.sdp = this.optimizeSDP(offer.sdp);
        
        await this.pc.setLocalDescription(offer);
        return offer;
    }

    async createOptimizedAnswer(offer) {
        await this.pc.setRemoteDescription(offer);
        
        this.setCodecPreferences();
        
        const answer = await this.pc.createAnswer();
        answer.sdp = this.optimizeSDP(answer.sdp);
        
        await this.pc.setLocalDescription(answer);
        return answer;
    }

    setCodecPreferences() {
        const transceivers = this.pc.getTransceivers();
        
        transceivers.forEach(transceiver => {
            if (transceiver.sender && transceiver.sender.track) {
                const capabilities = RTCRtpSender.getCapabilities(transceiver.sender.track.kind);
                
                if (transceiver.sender.track.kind === 'video') {
                    const preferredCodecs = this.selectOptimalCodecs(capabilities.codecs, 'video');
                    transceiver.setCodecPreferences(preferredCodecs);
                } else if (transceiver.sender.track.kind === 'audio') {
                    const preferredCodecs = this.selectOptimalCodecs(capabilities.codecs, 'audio');
                    transceiver.setCodecPreferences(preferredCodecs);
                }
            }
        });
    }

    selectOptimalCodecs(availableCodecs, kind) {
        const preferences = this.codecPreferences[kind];
        const selected = [];

        // Select codecs in order of preference
        preferences.forEach(preferred => {
            const codec = availableCodecs.find(c => 
                c.mimeType.toLowerCase() === preferred.toLowerCase()
            );
            if (codec) {
                selected.push(codec);
            }
        });

        // Add remaining codecs as fallbacks
        availableCodecs.forEach(codec => {
            if (!selected.find(s => s.mimeType === codec.mimeType)) {
                selected.push(codec);
            }
        });

        return selected;
    }

    optimizeSDP(sdp) {
        let optimizedSDP = sdp;

        // Force hardware acceleration
        optimizedSDP = optimizedSDP.replace(
            /(a=fmtp:.*H264.*)/g,
            '$1;x-google-start-bitrate=10000;x-google-max-bitrate=50000;x-google-min-bitrate=1000'
        );

        // Enable low-latency features
        optimizedSDP += 'a=rtcp-fb:* transport-cc\r\n';
        optimizedSDP += 'a=rtcp-fb:* ccm fir\r\n';
        optimizedSDP += 'a=rtcp-fb:* nack\r\n';
        optimizedSDP += 'a=rtcp-fb:* nack pli\r\n';
        optimizedSDP += 'a=rtcp-fb:* goog-remb\r\n';

        // Optimize for low latency
        optimizedSDP = optimizedSDP.replace(
            /a=mid:(\d+)/g,
            'a=mid:$1\r\na=x-google-flag:conference'
        );

        return optimizedSDP;
    }

    async addOptimizedStream(stream) {
        const tracks = stream.getTracks();
        
        for (const track of tracks) {
            const sender = this.pc.addTrack(track, stream);
            
            if (track.kind === 'video') {
                await this.optimizeVideoTrack(track, sender);
            } else if (track.kind === 'audio') {
                await this.optimizeAudioTrack(track, sender);
            }
        }
    }

    async optimizeVideoTrack(track, sender) {
        // Apply constraints for optimal performance
        const constraints = {
            width: { ideal: 1920, max: 3840 },
            height: { ideal: 1080, max: 2160 },
            frameRate: { ideal: 60, max: 144 },
            aspectRatio: { ideal: 16/9 }
        };

        await track.applyConstraints(constraints);
        
        // Setup quality adaptation based on network conditions
        this.antiLag.on('quality_change', (adaptation) => {
            this.adaptVideoQuality(track, sender, adaptation);
        });
    }

    async adaptVideoQuality(track, sender, adaptation) {
        try {
            // Adjust track constraints
            const resolutionMap = {
                'ultra': { width: 3840, height: 2160 },
                'high': { width: 2560, height: 1440 },
                'medium': { width: 1920, height: 1080 },
                'low': { width: 1280, height: 720 }
            };

            const resolution = resolutionMap[adaptation.quality] || resolutionMap.medium;
            
            await track.applyConstraints({
                width: { ideal: resolution.width },
                height: { ideal: resolution.height },
                frameRate: { ideal: adaptation.fps }
            });

            // Adjust encoding parameters
            const params = sender.getParameters();
            if (params.encodings && params.encodings[0]) {
                params.encodings[0].maxBitrate = adaptation.settings.bitrate;
                params.encodings[0].maxFramerate = adaptation.fps;
                params.encodings[0].scaleResolutionDownBy = adaptation.settings.compression;
                
                await sender.setParameters(params);
            }

            console.log(`Quality adapted to ${adaptation.quality} (${adaptation.fps}fps) - ${adaptation.reason}`);
            
        } catch (error) {
            console.warn('Failed to adapt video quality:', error);
        }
    }

    setupNetworkMonitoring() {
        this.networkMonitor = setInterval(async () => {
            if (this.pc && this.pc.connectionState === 'connected') {
                const stats = await this.pc.getStats();
                this.analyzeConnectionStats(stats);
            }
        }, 1000);
    }

    analyzeConnectionStats(stats) {
        let inboundVideo = null;
        let outboundVideo = null;
        let candidate = null;

        stats.forEach(report => {
            if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
                inboundVideo = report;
            } else if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
                outboundVideo = report;
            } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                candidate = report;
            }
        });

        if (candidate) {
            const latency = candidate.currentRoundTripTime * 1000;
            const jitter = inboundVideo ? inboundVideo.jitter * 1000 : 0;
            const packetLoss = inboundVideo ? 
                (inboundVideo.packetsLost / (inboundVideo.packetsReceived + inboundVideo.packetsLost)) * 100 : 0;

            // Feed stats to anti-lag system
            this.antiLag.updateStats(latency);
            this.antiLag.stats.jitter = jitter;
            this.antiLag.stats.packetLoss = packetLoss;

            this.emit('network_stats', {
                latency,
                jitter,
                packetLoss,
                bitrate: outboundVideo ? outboundVideo.bytesSent * 8 / 1000 : 0
            });
        }
    }

    handleDataChannelMessage(data) {
        try {
            const message = JSON.parse(data);
            
            // Process with anti-lag system
            const processedMessage = this.antiLag.processFrame(message, message.timestamp);
            
            if (processedMessage) {
                this.emit('data_message', processedMessage);
            }
        } catch (error) {
            console.error('Failed to process data channel message:', error);
        }
    }

    sendDataMessage(message) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            const messageWithTimestamp = {
                ...message,
                timestamp: Date.now()
            };
            
            this.dataChannel.send(JSON.stringify(messageWithTimestamp));
        }
    }

    handleConnectionStateChange() {
        const state = this.pc.iceConnectionState;
        console.log('Connection state changed:', state);

        if (state === 'disconnected' || state === 'failed') {
            this.handleConnectionFailure();
        } else if (state === 'connected') {
            this.handleConnectionSuccess();
        }

        this.emit('connection_state_change', state);
    }

    handleConnectionFailure() {
        console.log('Connection failed, attempting recovery...');
        
        // Attempt ICE restart
        this.restartICE();
        
        this.emit('connection_failed');
    }

    handleConnectionSuccess() {
        console.log('Connection established successfully');
        this.emit('connection_established');
    }

    async restartICE() {
        try {
            const offer = await this.pc.createOffer({ iceRestart: true });
            await this.pc.setLocalDescription(offer);
            this.emit('ice_restart', offer);
        } catch (error) {
            console.error('ICE restart failed:', error);
        }
    }

    getPerformanceReport() {
        return {
            antiLag: this.antiLag.getPerformanceReport(),
            connection: {
                state: this.pc?.connectionState,
                iceState: this.pc?.iceConnectionState,
                signalingState: this.pc?.signalingState
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
        if (this.networkMonitor) {
            clearInterval(this.networkMonitor);
        }
        
        if (this.antiLag) {
            this.antiLag.destroy();
        }
        
        if (this.pc) {
            this.pc.close();
        }
    }
}

module.exports = OptimizedWebRTC;