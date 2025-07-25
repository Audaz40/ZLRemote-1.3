import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import toast, { Toaster } from 'react-hot-toast';
import styled, { ThemeProvider, createGlobalStyle } from 'styled-components';

// Components
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import RemoteViewer from './pages/RemoteViewer';
import SessionManager from './pages/SessionManager';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';

// Hooks
import { useWebSocket } from './hooks/useWebSocket';
import { useSession } from './hooks/useSession';

// Utils
import { theme } from './styles/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};
    overflow: hidden;
  }

  #root {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${props => props.theme.colors.gray100};
  }

  ::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.gray300};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.colors.gray400};
  }

  /* Selection styling */
  ::selection {
    background: ${props => props.theme.colors.primary}33;
    color: ${props => props.theme.colors.primary};
  }

  /* Status dot animations */
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 8px;
  }

  .status-dot.connected {
    background: #51cf66;
    animation: pulse 2s infinite;
  }

  .status-dot.disconnected {
    background: #ff6b6b;
  }

  .status-dot.connecting {
    background: #ffa502;
    animation: pulse 1s infinite;
  }
`;

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
  overflow: hidden;
`;

const MainContent = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ContentArea = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: ${props => props.theme.colors.background};
`;

function AppContent() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('light');
  
  const { 
    isConnected, 
    connectionStatus, 
    sendMessage,
    lastMessage 
  } = useWebSocket(process.env.REACT_APP_WS_URL || 'ws://localhost:3001');
  
  const {
    currentSession,
    sessionHistory,
    createSession,
    joinSession,
    leaveSession,
    setSessionHistory  // ← AÑADIDO
  } = useSession();

  useEffect(() => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('zlremote-theme');
    if (savedTheme) {
      setCurrentTheme(savedTheme);
    }

    // Check for saved sidebar state
    const savedSidebarState = localStorage.getItem('zlremote-sidebar-collapsed');
    if (savedSidebarState) {
      setSidebarCollapsed(savedSidebarState === 'true');
    }
  }, []);

  useEffect(() => {
    // Handle WebSocket messages
    if (lastMessage) {
      console.log('WebSocket message received:', lastMessage);
      handleWebSocketMessage(lastMessage);
    }
  }, [lastMessage]);

  const handleWebSocketMessage = (message) => {
    switch (message.type) {
      case 'host_registered':
        console.log('Host registered with session ID:', message.sessionId);
        break;
      case 'viewer_connected':
        toast.success('A viewer has connected to your session');
        break;
      case 'viewer_disconnected':
        toast('A viewer has disconnected', {
          icon: 'ℹ️',
        });
        break;
      case 'error':
        toast.error(message.message);
        break;
      default:
        console.log('Unhandled message type:', message.type);
    }
  };

  const toggleTheme = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(newTheme);
    localStorage.setItem('zlremote-theme', newTheme);
  };

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('zlremote-sidebar-collapsed', newState.toString());
  };

  const handleSessionCreate = async (sessionConfig) => {
    try {
      const session = await createSession(sessionConfig);
      
      // Send to WebSocket server
      sendMessage({
        type: 'register_host',
        sessionId: session.id,
        config: sessionConfig
      });

      toast.success(`Session created: ${session.id}`);
      return session;
    } catch (error) {
      console.error('Failed to create session:', error);
      toast.error('Failed to create session');
      throw error;
    }
  };

  const handleSessionJoin = async (sessionId, password = '') => {
    try {
      // Validate session ID
      if (!sessionId || sessionId.length < 6) {
        throw new Error('Invalid session ID');
      }

      // Use joinSession from the hook
      await joinSession(sessionId.toUpperCase(), password);
      
      // Navigate to remote viewer
      navigate(`/remote/${sessionId.toUpperCase()}`);
      
      toast.success('Connecting to session...');
    } catch (error) {
      console.error('Failed to join session:', error);
      toast.error(error.message || 'Failed to join session');
      throw error;
    }
  };

  const handleLeaveSession = () => {
    if (currentSession) {
      // Notify server
      sendMessage({
        type: 'leave_session',
        sessionId: currentSession.id
      });

      leaveSession();
      toast('Left session', {
        icon: '👋',
      });
      navigate('/');
    }
  };

  return (
    <AppContainer>
      <Sidebar 
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        connectionStatus={connectionStatus}
        currentSession={currentSession}
      />
      
      <MainContent>
        <Header 
          onThemeToggle={toggleTheme}
          currentTheme={currentTheme}
          isConnected={isConnected}
          currentSession={currentSession}
          onLeaveSession={handleLeaveSession}
        />
        
        <ContentArea>
          <Routes>
            <Route 
              path="/" 
              element={
                <Dashboard 
                  onCreateSession={handleSessionCreate}
                  onJoinSession={handleSessionJoin}
                  sessionHistory={sessionHistory}
                  isConnected={isConnected}
                />
              } 
            />
            <Route 
              path="/remote/:sessionId" 
              element={
                <RemoteViewer 
                  sendMessage={sendMessage}
                  lastMessage={lastMessage}
                  currentSession={currentSession}
                />
              } 
            />
            <Route 
              path="/sessions" 
              element={
                <SessionManager 
                  onCreateSession={handleSessionCreate}
                  onJoinSession={handleSessionJoin}
                  sessionHistory={sessionHistory}
                />
              } 
            />
            <Route 
              path="/analytics" 
              element={<Analytics />} 
            />
            <Route 
              path="/settings" 
              element={
                <Settings 
                  currentTheme={currentTheme}
                  onThemeChange={setCurrentTheme}
                />
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ContentArea>
      </MainContent>
    </AppContainer>
  );
}

// Main App component with providers
function App() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Perform any app initialization here
    const initializeApp = async () => {
      try {
        // Check for required browser features
        if (!window.WebSocket) {
          throw new Error('WebSocket is not supported in this browser');
        }

        if (!window.RTCPeerConnection) {
          throw new Error('WebRTC is not supported in this browser');
        }

        // App is ready
        setAppReady(true);
      } catch (error) {
        console.error('App initialization failed:', error);
        toast.error(error.message);
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      console.log('App unmounting...');
    };
  }, []);

  // Get initial theme
  const getInitialTheme = () => {
    const savedTheme = localStorage.getItem('zlremote-theme');
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      return savedTheme;
    }
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  };

  const [currentTheme] = useState(getInitialTheme());

  if (!appReady) {
    return (
      <ThemeProvider theme={theme[currentTheme]}>
        <GlobalStyle />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: theme[currentTheme].colors.background
        }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ color: theme[currentTheme].colors.primary }}>ZLRemote</h1>
            <p style={{ color: theme[currentTheme].colors.textSecondary }}>Loading...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme[currentTheme]}>
        <GlobalStyle />
        <Router>
          <AppContent />
        </Router>
        
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: theme[currentTheme].colors.surface,
              color: theme[currentTheme].colors.text,
              border: `1px solid ${theme[currentTheme].colors.border}`,
              borderRadius: '8px',
              boxShadow: theme[currentTheme].shadows.md,
            },
            success: {
              iconTheme: {
                primary: theme[currentTheme].colors.success,
                secondary: '#fff',
              },
              style: {
                background: theme[currentTheme].colors.surface,
              },
            },
            error: {
              iconTheme: {
                primary: theme[currentTheme].colors.error,
                secondary: '#fff',
              },
              style: {
                background: theme[currentTheme].colors.surface,
              },
            },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;