export const WebRTCConfig = {
    // Configuración optimizada para baja latencia
    rtcConfiguration: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        {
          urls: 'turn:your-turn-server.com:3478',
          username: 'zlremote',
          credential: 'your-credential'
        }
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      sdpSemantics: 'unified-plan'
    },
  
    // Configuración de video para alta calidad y baja latencia
    videoConstraints: {
      width: { ideal: 1920, max: 3840 },
      height: { ideal: 1080, max: 2160 },
      frameRate: { ideal: 144, max: 240 },
      facingMode: 'environment'
    },
  
    // Configuración de audio
    audioConstraints: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 2
    },
  
    // Configuración de codecs optimizada
    codecPreferences: {
      video: [
        'video/H264',
        'video/VP9',
        'video/VP8',
        'video/AV1'
      ],
      audio: [
        'audio/opus',
        'audio/G722',
        'audio/PCMU',
        'audio/PCMA'
      ]
    },
  
    // Configuración de transporte
    transportOptions: {
      enableDataChannel: true,
      dataChannelOptions: {
        ordered: false,
        maxRetransmits: 0,
        maxPacketLifeTime: 100
      }
    }
  };
  
  export class OptimizedWebRTC {
    constructor(configuration = WebRTCConfig.rtcConfiguration) {
      this.pc = new RTCPeerConnection(configuration);
      this.dataChannel = null;
      this.stats = {
        fps: 0,
        latency: 0,
        bitrate: 0,
        packetsLost: 0
      };
      
      this.setupOptimizations();
      this.startStatsCollection();
    }
  
    setupOptimizations() {
      // Configurar codecs preferidos
      this.pc.addEventListener('track', (event) => {
        const [remoteStream] = event.streams;
        this.optimizeStreamSettings(remoteStream);
      });
  
      // Crear data channel optimizado para comandos
      this.dataChannel = this.pc.createDataChannel('commands', 
        WebRTCConfig.transportOptions.dataChannelOptions
      );
      
      this.dataChannel.binaryType = 'arraybuffer';
    }
  
    async createOptimizedOffer() {
      // Configurar transceptores con configuración específica
      const videoTransceiver = this.pc.addTransceiver('video', {
        direction: 'sendrecv',
        streams: []
      });
  
      // Configurar parámetros de codificación
      const sender = videoTransceiver.sender;
      if (sender) {
        const params = sender.getParameters();
        
        // Configuración para H.264 con perfil baseline
        params.encodings = [{
          rid: 'high',
          maxBitrate: 50000000, // 50 Mbps para máxima calidad
          maxFramerate: 144,
          scaleResolutionDownBy: 1,
          adaptivePtime: false
        }];
  
        await sender.setParameters(params);
      }
  
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart: false
      });
  
      // Modificar SDP para optimizaciones
      offer.sdp = this.optimizeSDP(offer.sdp);
      
      await this.pc.setLocalDescription(offer);
      return offer;
    }
  
    optimizeSDP(sdp) {
      let optimizedSDP = sdp;
  
      // Priorizar H.264 Hardware
      optimizedSDP = optimizedSDP.replace(
        /(m=video .*\r\n)/,
        '$1a=fmtp:96 profile-level-id=42e01f;level-asymmetry-allowed=1;packetization-mode=1\r\n'
      );
  
      // Configurar parámetros de baja latencia
      optimizedSDP = optimizedSDP.replace(
        /(a=fmtp:\d+ .*)/g,
        '$1;x-google-start-bitrate=10000;x-google-max-bitrate=50000;x-google-min-bitrate=1000'
      );
  
      // Habilitar características de baja latencia
      optimizedSDP += 'a=rtcp-fb:* transport-cc\r\n';
      optimizedSDP += 'a=rtcp-fb:* ccm fir\r\n';
      optimizedSDP += 'a=rtcp-fb:* nack\r\n';
      optimizedSDP += 'a=rtcp-fb:* nack pli\r\n';
  
      return optimizedSDP;
    }
  
    optimizeStreamSettings(stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities();
        
        videoTrack.applyConstraints({
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 144 },
          aspectRatio: { ideal: 16/9 }
        });
      }
    }
  
    startStatsCollection() {
      setInterval(async () => {
        if (this.pc.connectionState === 'connected') {
          const stats = await this.pc.getStats();
          this.processStats(stats);
        }
      }, 1000);
    }
  
    processStats(stats) {
      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
          // Calcular FPS
          if (this.lastReport) {
            const timeDiff = report.timestamp - this.lastReport.timestamp;
            const framesDiff = report.framesDecoded - this.lastReport.framesDecoded;
            this.stats.fps = Math.round((framesDiff * 1000) / timeDiff);
          }
          this.lastReport = report;
          
          // Calcular pérdida de paquetes
          this.stats.packetsLost = report.packetsLost || 0;
        }
        
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          this.stats.latency = report.currentRoundTripTime * 1000 || 0;
        }
      });
    }
  
    sendCommand(command, data) {
      if (this.dataChannel && this.dataChannel.readyState === 'open') {
        const message = { command, data, timestamp: Date.now() };
        const buffer = new TextEncoder().encode(JSON.stringify(message));
        this.dataChannel.send(buffer);
      }
    }
  
    getStats() {
      return this.stats;
    }
  }