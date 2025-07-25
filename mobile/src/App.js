import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  PanResponder,
  Alert,
  StyleSheet
} from 'react-native';
import { RTCPeerConnection, RTCView, mediaDevices } from 'react-native-webrtc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ZLRemoteApp = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [password, setPassword] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState(0);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const frameCountRef = useRef(0);
  const lastFPSUpdateRef = useRef(Date.now());
  const canvasRef = useRef(null);

  useEffect(() => {
    initializeApp();
    return () => {
      cleanup();
    };
  }, []);

  const initializeApp = async () => {
    await connectToServer();
    setupWebRTC();
  };

  const connectToServer = async () => {
    try {
      wsRef.current = new WebSocket('ws://your-server.com:3001');
      
      wsRef.current.onopen = () => {
        console.log('Connected to ZLRemote server');
        setIsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleServerMessage(message);
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        setTimeout(connectToServer, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  const setupWebRTC = () => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ],
      sdpSemantics: 'unified-plan'
    };

    pcRef.current = new RTCPeerConnection(configuration);

    pcRef.current.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'webrtc_ice_candidate',
          candidate: event.candidate
        }));
      }
    };

    pcRef.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };
  };

  const handleServerMessage = async (message) => {
    switch (message.type) {
      case 'host_registered':
        setSessionId(message.sessionId);
        setIsHost(true);
        break;
      
      case 'connected_to_host':
        setShowConnectForm(false);
        await createOffer();
        break;
      
      case 'webrtc_offer':
        await handleOffer(message.offer);
        break;
      
      case 'webrtc_answer':
        await pcRef.current.setRemoteDescription(message.answer);
        break;
      
      case 'webrtc_ice_candidate':
        await pcRef.current.addIceCandidate(message.candidate);
        break;
      
      case 'screen_frame':
        renderFrame(message);
        break;
      
      case 'error':
        Alert.alert('Error', message.message);
        break;
    }
  };

  const startHosting = async () => {
    try {
      const stream = await mediaDevices.getDisplayMedia({
        video: {
          width: 1920,
          height: 1080,
          frameRate: 144
        }
      });

      stream.getTracks().forEach(track => {
        pcRef.current.addTrack(track, stream);
      });

      wsRef.current.send(JSON.stringify({
        type: 'register_host',
        deviceInfo: {
          platform: 'mobile',
          resolution: `${SCREEN_WIDTH}x${SCREEN_HEIGHT}`
        }
      }));

      setIsHost(true);
    } catch (error) {
      console.error('Failed to start hosting:', error);
      Alert.alert('Error', 'Failed to start screen sharing');
    }
  };

  const joinSession = () => {
    if (!sessionId.trim()) {
      Alert.alert('Error', 'Please enter a session ID');
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: 'connect_to_host',
      sessionId: sessionId.toUpperCase(),
      password: password || null
    }));
  };

  const createOffer = async () => {
    try {
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      
      wsRef.current.send(JSON.stringify({
        type: 'webrtc_offer',
        offer: offer
      }));
    } catch (error) {
      console.error('Failed to create offer:', error);
    }
  };

  const handleOffer = async (offer) => {
    try {
      await pcRef.current.setRemoteDescription(offer);
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      
      wsRef.current.send(JSON.stringify({
        type: 'webrtc_answer',
        answer: answer
      }));
    } catch (error) {
      console.error('Failed to handle offer:', error);
    }
  };

  const renderFrame = (frameData) => {
    frameCountRef.current++;
    const now = Date.now();
    
    if (now - lastFPSUpdateRef.current >= 1000) {
      const currentFPS = Math.round(frameCountRef.current * 1000 / (now - lastFPSUpdateRef.current));
      setFps(currentFPS);
      frameCountRef.current = 0;
      lastFPSUpdateRef.current = now;
    }

    const frameLatency = now - frameData.timestamp;
    setLatency(frameLatency);
  };

  const handleTouch = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    
    onPanResponderGrant: (evt) => {
      sendTouchEvent('touchstart', evt);
    },
    
    onPanResponderMove: (evt) => {
      sendTouchEvent('touchmove', evt);
    },
    
    onPanResponderRelease: (evt) => {
      sendTouchEvent('touchend', evt);
    }
  });

  const sendTouchEvent = (type, evt) => {
    if (!isConnected || isHost) return;

    const touch = evt.nativeEvent;
    const eventData = {
      type,
      x: touch.pageX,
      y: touch.pageY,
      timestamp: Date.now()
    };

    wsRef.current.send(JSON.stringify({
      type: 'input_event',
      eventType: 'touch',
      data: eventData
    }));
  };

  const cleanup = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (pcRef.current) {
      pcRef.current.close();
    }
  };

  const copySessionId = async () => {
    // React Native clipboard implementation
    Alert.alert('Session ID', sessionId, [
      { text: 'OK' }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>ZL<Text style={styles.logoAccent}>Remote</Text></Text>
          <View style={[styles.status, { backgroundColor: isConnected ? '#51cf66' : '#ff6b6b' }]}>
            <Text style={styles.statusText}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {!isHost && !remoteStream && (
            <View style={styles.controlPanel}>
              <TouchableOpacity style={styles.primaryButton} onPress={startHosting}>
                <Text style={styles.buttonText}>Start Hosting</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={() => setShowConnectForm(true)}
              >
                <Text style={styles.secondaryButtonText}>Connect to Session</Text>
              </TouchableOpacity>
            </View>
          )}

          {isHost && sessionId && (
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionLabel}>Session ID:</Text>
              <TouchableOpacity onPress={copySessionId}>
                <Text style={styles.sessionId}>{sessionId}</Text>
              </TouchableOpacity>
              <Text style={styles.sessionHint}>Share this ID to allow connections</Text>
            </View>
          )}

          {showConnectForm && (
            <View style={styles.connectForm}>
              <TextInput
                style={styles.input}
                placeholder="Enter Session ID"
                placeholderTextColor="#999"
                value={sessionId}
                onChangeText={setSessionId}
                autoCapitalize="characters"
                maxLength={8}
              />
              <TextInput
                style={styles.input}
                placeholder="Password (optional)"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TouchableOpacity style={styles.primaryButton} onPress={joinSession}>
                <Text style={styles.buttonText}>Join Session</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setShowConnectForm(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Remote Screen Display */}
          {remoteStream && (
            <View style={styles.screenContainer} {...handleTouch.panHandlers}>
              <RTCView
                style={styles.remoteVideo}
                streamURL={remoteStream.toURL()}
                objectFit="contain"
              />
            </View>
          )}
        </View>

        {/* Footer Stats */}
        <View style={styles.footer}>
          <Text style={styles.stat}>{fps} FPS</Text>
          <Text style={styles.stat}>{latency}ms</Text>
          <Text style={styles.stat}>Quality: High</Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  logo: {
    fontSize: 24,
    fontWeight: '300',
    color: 'white',
  },
  logoAccent: {
    fontWeight: '700',
  },
  status: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    padding: 20,
  },
  controlPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
  sessionInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  sessionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sessionId: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#667eea',
    letterSpacing: 4,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  sessionHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  connectForm: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 24,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
  },
  remoteVideo: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  stat: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ZLRemoteApp;