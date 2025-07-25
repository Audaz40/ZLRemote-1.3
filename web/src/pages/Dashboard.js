import React, { useState } from 'react';
import styled from 'styled-components';
import { Plus, Monitor, Users, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const DashboardContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const WelcomeSection = styled.section`
  text-align: center;
  margin-bottom: 48px;
`;

const Title = styled.h1`
  font-size: 48px;
  font-weight: 300;
  color: ${props => props.theme.colors.text};
  margin-bottom: 16px;

  span {
    font-weight: 700;
    background: ${props => props.theme.gradients.primary};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: ${props => props.theme.colors.textSecondary};
  max-width: 600px;
  margin: 0 auto;
`;

const AlertBox = styled.div`
  background: ${props => props.variant === 'error' ? '#ff6b6b20' : '#ffa50220'};
  border: 1px solid ${props => props.variant === 'error' ? '#ff6b6b' : '#ffa502'};
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 32px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const AlertText = styled.p`
  color: ${props => props.variant === 'error' ? '#ff6b6b' : '#ffa502'};
  margin: 0;
  flex: 1;
`;

const QuickActions = styled.section`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 48px;
`;

const ActionCard = styled.div`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${props => props.theme.shadows.xl};
    border-color: ${props => props.theme.colors.primary};
  }

  &.disabled {
    opacity: 0.6;
    cursor: not-allowed;
    
    &:hover {
      transform: none;
      box-shadow: none;
      border-color: ${props => props.theme.colors.border};
    }
  }
`;

const ActionIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${props => props.theme.gradients.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  color: white;
`;

const ActionTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin-bottom: 8px;
`;

const ActionDescription = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.6;
`;

const Badge = styled.span`
  position: absolute;
  top: 16px;
  right: 16px;
  background: ${props => props.theme.colors.primary};
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
`;

const StatsSection = styled.section`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 48px;
`;

const StatCard = styled.div`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 12px;
  padding: 24px;
`;

const StatValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: ${props => props.theme.colors.primary};
  margin-bottom: 8px;
`;

const StatLabel = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-weight: 500;
`;

const RecentSessions = styled.section`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 16px;
  padding: 24px;
`;

const SectionTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin-bottom: 24px;
`;

const SessionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SessionItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: ${props => props.theme.colors.background};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
  }
`;

const SessionInfo = styled.div`
  flex: 1;
`;

const SessionId = styled.div`
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  font-family: monospace;
  font-size: 16px;
`;

const SessionTime = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const SessionType = styled.span`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: ${props => props.type === 'host' ? '#667eea20' : '#51cf6620'};
  color: ${props => props.type === 'host' ? '#667eea' : '#51cf66'};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: ${props => props.theme.colors.textSecondary};
`;

const ConnectModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: 16px;
  padding: 32px;
  width: 90%;
  max-width: 400px;
  box-shadow: ${props => props.theme.shadows.xl};
`;

const ModalTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 24px;
  text-align: center;
  color: ${props => props.theme.colors.text};
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  font-size: 16px;
  margin-bottom: 16px;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-family: monospace;
  text-align: center;
  letter-spacing: 2px;
  text-transform: uppercase;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }

  &::placeholder {
    text-transform: none;
    letter-spacing: normal;
    font-family: inherit;
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: ${props => props.theme.gradients.primary};
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 12px;

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${props => props.theme.shadows.md};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: ${props => props.theme.colors.textSecondary};
  border: 2px solid ${props => props.theme.colors.border};

  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
    transform: none;
  }
`;

const InstructionsModal = styled(ModalContent)`
  max-width: 500px;
`;

const InstructionsList = styled.ol`
  text-align: left;
  margin: 20px 0;
  padding-left: 20px;
  color: ${props => props.theme.colors.text};
  line-height: 1.8;

  li {
    margin-bottom: 12px;
  }

  code {
    background: ${props => props.theme.colors.background};
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    color: ${props => props.theme.colors.primary};
  }
`;

const Dashboard = ({ onCreateSession, onJoinSession, sessionHistory, isConnected }) => {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showHostInstructions, setShowHostInstructions] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleHostSession = () => {
    // Show instructions for hosting
    setShowHostInstructions(true);
  };

  const handleJoinSession = async () => {
    if (!sessionId.trim()) {
      toast.error('Please enter a session ID');
      return;
    }

    if (!isConnected) {
      toast.error('Not connected to server. Please check your connection.');
      return;
    }

    setIsLoading(true);
    try {
      await onJoinSession(sessionId.trim().toUpperCase(), password);
      setShowConnectModal(false);
      setSessionId('');
      setPassword('');
    } catch (error) {
      // Error is handled in onJoinSession
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecentSessionClick = (session) => {
    if (session.type === 'viewer' && session.id !== 'PENDING') {
      setSessionId(session.id);
      setShowConnectModal(true);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const stats = [
    { value: '< 5ms', label: 'Average Latency' },
    { value: '144+', label: 'Max FPS' },
    { value: sessionHistory?.length || 0, label: 'Total Sessions' },
    { value: isConnected ? 'Online' : 'Offline', label: 'Status' },
  ];

  return (
    <DashboardContainer>
      <WelcomeSection>
        <Title>
          Welcome to <span>ZLRemote</span>
        </Title>
        <Subtitle>
          Professional zero-latency remote desktop with advanced features
        </Subtitle>
      </WelcomeSection>

      {!isConnected && (
        <AlertBox variant="error">
          <AlertCircle size={20} />
          <AlertText variant="error">
            Not connected to server. Make sure the ZLRemote server is running on port 3001.
          </AlertText>
        </AlertBox>
      )}

      <QuickActions>
        <ActionCard onClick={handleHostSession}>
          <Badge>Desktop Only</Badge>
          <ActionIcon>
            <Monitor size={32} />
          </ActionIcon>
          <ActionTitle>Host Session</ActionTitle>
          <ActionDescription>
            Share your screen using the ZLRemote Desktop application
          </ActionDescription>
        </ActionCard>

        <ActionCard 
          onClick={() => setShowConnectModal(true)}
          className={!isConnected ? 'disabled' : ''}
        >
          <ActionIcon>
            <Plus size={32} />
          </ActionIcon>
          <ActionTitle>Join Session</ActionTitle>
          <ActionDescription>
            Connect to a remote desktop session using a session ID
          </ActionDescription>
        </ActionCard>
      </QuickActions>

      <StatsSection>
        {stats.map((stat, index) => (
          <StatCard key={index}>
            <StatValue>{stat.value}</StatValue>
            <StatLabel>{stat.label}</StatLabel>
          </StatCard>
        ))}
      </StatsSection>

      {sessionHistory && sessionHistory.length > 0 && (
        <RecentSessions>
          <SectionTitle>Recent Sessions</SectionTitle>
          <SessionList>
            {sessionHistory.slice(0, 5).map((session, index) => (
              <SessionItem 
                key={`${session.id}-${index}`}
                onClick={() => handleRecentSessionClick(session)}
              >
                <SessionInfo>
                  <SessionId>{session.id}</SessionId>
                  <SessionTime>
                    <Clock size={14} />
                    {formatTime(session.createdAt || session.joinedAt)}
                  </SessionTime>
                </SessionInfo>
                <SessionType type={session.type}>
                  {session.type === 'host' ? 'Hosted' : 'Joined'}
                </SessionType>
              </SessionItem>
            ))}
          </SessionList>
        </RecentSessions>
      )}

      {sessionHistory && sessionHistory.length === 0 && (
        <RecentSessions>
          <SectionTitle>Recent Sessions</SectionTitle>
          <EmptyState>
            <Users size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <p>No recent sessions yet</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
            Your session history will appear here
            </p>
          </EmptyState>
        </RecentSessions>
      )}

      {/* Connect Modal */}
      {showConnectModal && (
        <ConnectModal onClick={() => setShowConnectModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalTitle>Join Session</ModalTitle>
            <Input
              type="text"
              placeholder="Enter Session ID (e.g., ABC123)"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value.toUpperCase())}
              maxLength={8}
              autoFocus
            />
            <Input
              type="password"
              placeholder="Password (optional)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button 
              onClick={handleJoinSession}
              disabled={isLoading || !sessionId.trim() || !isConnected}
            >
              {isLoading ? 'Connecting...' : 'Join Session'}
            </Button>
            <SecondaryButton onClick={() => {
              setShowConnectModal(false);
              setSessionId('');
              setPassword('');
            }}>
              Cancel
            </SecondaryButton>
          </ModalContent>
        </ConnectModal>
      )}

      {/* Host Instructions Modal */}
      {showHostInstructions && (
        <ConnectModal onClick={() => setShowHostInstructions(false)}>
          <InstructionsModal onClick={e => e.stopPropagation()}>
            <ModalTitle>How to Host a Session</ModalTitle>
            
            <AlertBox variant="warning" style={{ marginBottom: '20px' }}>
              <AlertCircle size={20} />
              <AlertText variant="warning">
                Screen sharing requires the Desktop application
              </AlertText>
            </AlertBox>

            <InstructionsList>
              <li>
                Download and open the <strong>ZLRemote Desktop</strong> application
              </li>
              <li>
                Click the <strong>"Start Hosting"</strong> button in the desktop app
              </li>
              <li>
                A <code>Session ID</code> will be generated (e.g., <code>ABC123</code>)
              </li>
              <li>
                Share this Session ID with people who want to view your screen
              </li>
              <li>
                Viewers can join using this web interface with the Session ID
              </li>
            </InstructionsList>

            <div style={{ 
              background: props => props.theme.colors.background,
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <p style={{ 
                fontSize: '14px', 
                color: props => props.theme.colors.textSecondary,
                marginBottom: '8px'
              }}>
                Don't have the desktop app?
              </p>
              <a 
                href="https://github.com/your-repo/zlremote/releases"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: props => props.theme.colors.primary,
                  textDecoration: 'none',
                  fontWeight: '600'
                }}
              >
                Download ZLRemote Desktop →
              </a>
            </div>

            <SecondaryButton onClick={() => setShowHostInstructions(false)}>
              Got it!
            </SecondaryButton>
          </InstructionsModal>
        </ConnectModal>
      )}
    </DashboardContainer>
  );
};

export default Dashboard;