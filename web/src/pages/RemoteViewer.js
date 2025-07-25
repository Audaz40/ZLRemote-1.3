import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Monitor, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Settings, 
  Maximize, 
  Minimize,
  MessageCircle,
  FileText,
  Hand,
  AlertCircle
} from 'lucide-react';

const ViewerContainer = styled.div`
  display: flex;
  height: 100%;
  background: #000;
  position: relative;
`;

const VideoContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #1a1a1a;
`;

const RemoteVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
`;

const ControlOverlay = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 12px;
  z-index: 10;
`;

const ControlButton = styled.button`
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);

  &:hover {
    background: rgba(0, 0, 0, 0.9);
    transform: scale(1.05);
  }

  &.active {
    background: ${props => props.theme.colors.primary};
  }

  &.muted {
    background: ${props => props.theme.colors.error};
  }
`;

const StatusBar = styled.div`
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  backdrop-filter: blur(10px);
`;

const StatusInfo = styled.div`
  display: flex;
  gap: 24px;
  font-size: 14px;
`;

const StatusItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const QualityIndicator = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => {
    if (props.quality === 'excellent') return '#51cf66';
    if (props.quality === 'good') return '#ffa502';
    return '#ff6b6b';
  }};
`;

const ConnectionLost = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: white;
  z-index: 20;
`;

const ReconnectButton = styled.button`
  margin-top: 16px;
  padding: 12px 24px;
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;

  &:hover {
    transform: scale(1.05);
  }
`;

const LoadingScreen = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  z-index: 30;
`;

const LoadingSpinner = styled.div`
  width: 50px;
  height: 50px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const RemoteViewer = ({ sendMessage, lastMessage, currentSession }) => {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const wsRef = useRef(null);
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [controlEnabled, setControlEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    fps: 0,
    latency: 0,
    bitrate: 0,
    quality: 'excellent'
  });

  useEffect(() => {
    if (sessionId) {
      connectToSession();
    }

    return () => {
      disconnect();
    };
  }, [sessionId]);

  const connectToSession = async () => {
    try {
      // Connect to WebSocket server
      wsRef.current = new WebSocket('ws://localhost:3001');

      wsRef.current.onopen = () => {
        console.log('Connected to server');
        // Join session
        wsRef.current.send(JSON.stringify({
          type: 'connect_to_host',
          sessionId: sessionId,
          password: '' // Add password support if needed
        }));
      };

      wsRef.current.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        await handleServerMessage(message);
      };

      wsRef.current.onclose = () => {
        console.log('Disconnected from server');
        setConnectionStatus('disconnected');
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('Failed to connect:', error);
      setConnectionStatus('error');
    }
  };

  const setupWebRTC = async () => {
    console.log('Setting up WebRTC connection');
    
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    };

    pcRef.current = new RTCPeerConnection(configuration);

    // Handle incoming stream
    pcRef.current.ontrack = (event) => {
      console.log('Received remote stream');
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
        setIsLoading(false);
        setConnectionStatus('connected');
      }
    };

    // Handle ICE candidates
    pcRef.current.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ice_candidate',
          candidate: event.candidate
        }));
      }
    };

    // Monitor connection state
    pcRef.current.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pcRef.current.iceConnectionState);
      if (pcRef.current.iceConnectionState === 'connected') {
        setConnectionStatus('connected');
      } else if (pcRef.current.iceConnectionState === 'failed') {
        setConnectionStatus('failed');
      }
    };

    // Notify server we're ready
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'viewer_ready'
      }));
    }
  };

  const handleServerMessage = async (message) => {
    console.log('Server message:', message.type);

    switch (message.type) {
      case 'connected_to_host':
        console.log('Connected to host session');
        await setupWebRTC();
        break;

      case 'webrtc_offer':
        console.log('Received WebRTC offer');
        await handleWebRTCOffer(message.offer);
        break;

      case 'ice_candidate':
        console.log('Received ICE candidate');
        await handleICECandidate(message.candidate);
        break;

      case 'host_disconnected':
        console.log('Host disconnected');
        setConnectionStatus('disconnected');
        break;

      case 'error':
        console.error('Server error:', message.message);
        setConnectionStatus('error');
        alert(message.message);
        navigate('/');
        break;
    }
  };

  const handleWebRTCOffer = async (offer) => {
    try {
      if (!pcRef.current) {
        await setupWebRTC();
      }

      await pcRef.current.setRemoteDescription(offer);
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'webrtc_answer',
          answer: answer
        }));
      }
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleICECandidate = async (candidate) => {
    try {
      if (pcRef.current) {
        await pcRef.current.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  };

  const handleVideoClick = (e) => {
    if (!controlEnabled || !wsRef.current) return;

    const rect = videoRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    wsRef.current.send(JSON.stringify({
      type: 'input_event',
      data: {
        type: 'mouse',
        action: 'click',
        x: x,
        y: y,
        button: e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle'
      }
    }));
  };

  const handleVideoMouseMove = (e) => {
    if (!controlEnabled || !wsRef.current) return;

    const rect = videoRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    wsRef.current.send(JSON.stringify({
      type: 'input_event',
      data: {
        type: 'mouse',
        action: 'move',
        x: x,
        y: y
      }
    }));
  };

  const handleKeyDown = (e) => {
    if (!controlEnabled || !wsRef.current) return;

    wsRef.current.send(JSON.stringify({
      type: 'input_event',
      data: {
        type: 'keyboard',
        action: 'keydown',
        key: e.key,
        code: e.code,
        modifiers: {
          ctrl: e.ctrlKey,
          shift: e.shiftKey,
          alt: e.altKey,
          meta: e.metaKey
        }
      }
    }));

    e.preventDefault();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const disconnect = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const reconnect = () => {
    disconnect();
    setConnectionStatus('connecting');
    setIsLoading(true);
    connectToSession();
  };

  if (connectionStatus === 'disconnected') {
    return (
      <ViewerContainer>
        <ConnectionLost>
          <Monitor size={64} style={{ opacity: 0.5, marginBottom: '16px' }} />
          <h2>Connection Lost</h2>
          <p>The host has disconnected or the session has ended.</p>
          <ReconnectButton onClick={reconnect}>
            Try Reconnecting
          </ReconnectButton>
        </ConnectionLost>
      </ViewerContainer>
    );
  }

  if (connectionStatus === 'error') {
    return (
      <ViewerContainer>
        <ConnectionLost>
          <AlertCircle size={64} style={{ opacity: 0.5, marginBottom: '16px' }} />
          <h2>Connection Error</h2>
          <p>Failed to connect to the session.</p>
          <ReconnectButton onClick={() => navigate('/')}>
            Back to Home
          </ReconnectButton>
        </ConnectionLost>
      </ViewerContainer>
    );
  }

  return (
    <ViewerContainer>
      <VideoContainer>
        {isLoading && (
          <LoadingScreen>
            <LoadingSpinner />
            <h3>Connecting to session...</h3>
            <p>Session ID: {sessionId}</p>
          </LoadingScreen>
        )}

        <RemoteVideo
          ref={videoRef}
          autoPlay
          playsInline
          onClick={handleVideoClick}
          onMouseMove={handleVideoMouseMove}
          onKeyDown={handleKeyDown}
          onContextMenu={e => e.preventDefault()}
          style={{
            cursor: controlEnabled ? 'crosshair' : 'default'
          }}
          tabIndex={0}
        />

        <ControlOverlay>
          <ControlButton
            className={micEnabled ? 'active' : 'muted'}
            onClick={() => setMicEnabled(!micEnabled)}
            title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          </ControlButton>

          <ControlButton
            className={audioEnabled ? 'active' : 'muted'}
            onClick={() => setAudioEnabled(!audioEnabled)}
            title={audioEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </ControlButton>

          <ControlButton
            className={controlEnabled ? 'active' : ''}
            onClick={() => setControlEnabled(!controlEnabled)}
            title={controlEnabled ? 'Disable Control' : 'Enable Control'}
          >
            <Hand size={20} />
          </ControlButton>

          <ControlButton
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </ControlButton>
        </ControlOverlay>

        <StatusBar>
          <StatusInfo>
            <StatusItem>
              <QualityIndicator quality={stats.quality} />
              Connection: {connectionStatus}
            </StatusItem>
            <StatusItem>
              <span>{stats.fps} FPS</span>
            </StatusItem>
            <StatusItem>
              <span>{stats.latency}ms</span>
            </StatusItem>
            <StatusItem>
              <span>Session: {sessionId}</span>
            </StatusItem>
          </StatusInfo>
        </StatusBar>
      </VideoContainer>
    </ViewerContainer>
  );
};

export default RemoteViewer;