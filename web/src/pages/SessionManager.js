import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Plus, 
  Monitor, 
  Users, 
  Clock, 
  Settings, 
  Trash2, 
  Play, 
  Pause,
  Download,
  Share2
} from 'lucide-react';
import toast from 'react-hot-toast';

const ManagerContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: ${props => props.theme.gradients.primary};
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.lg};
  }
`;

const FilterTabs = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  padding: 4px;
`;

const FilterTab = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: ${props => props.active ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.active ? 'white' : props.theme.colors.textSecondary};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active ? props.theme.colors.primary : props.theme.colors.surfaceHover};
  }
`;

const SessionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
`;

const SessionCard = styled.div`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${props => props.theme.shadows.xl};
    border-color: ${props => props.theme.colors.primary};
  }
`;

const SessionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const SessionId = styled.div`
  font-family: monospace;
  font-size: 20px;
  font-weight: 700;
  color: ${props => props.theme.colors.primary};
  letter-spacing: 1px;
`;

const SessionStatus = styled.div`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: ${props => {
    switch (props.status) {
      case 'active': return props.theme.colors.success + '20';
      case 'idle': return props.theme.colors.warning + '20';
      default: return props.theme.colors.gray200;
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'active': return props.theme.colors.success;
      case 'idle': return props.theme.colors.warning;
      default: return props.theme.colors.textSecondary;
    }
  }};
`;

const SessionInfo = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
`;

const SessionActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: ${props => props.variant === 'primary' ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.variant === 'primary' ? 'white' : props.theme.colors.textSecondary};
  border: ${props => props.variant !== 'primary' ? `1px solid ${props.theme.colors.border}` : 'none'};
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.variant === 'primary' ? props.theme.colors.primaryDark : props.theme.colors.surfaceHover};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${props => props.theme.colors.textSecondary};

  h3 {
    font-size: 20px;
    margin-bottom: 8px;
    color: ${props => props.theme.colors.text};
  }

  p {
    margin-bottom: 24px;
    line-height: 1.6;
  }
`;

const CreateSessionModal = styled.div`
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
`;

const ModalContent = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: 16px;
  padding: 32px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalTitle = styled.h2`
  margin-bottom: 24px;
  color: ${props => props.theme.colors.text};
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: ${props => props.theme.colors.text};
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  font-size: 16px;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  font-size: 16px;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const Checkbox = styled.input`
  margin-right: 8px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 32px;
`;

const Button = styled.button`
  flex: 1;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
`;

const PrimaryButton = styled(Button)`
  background: ${props => props.theme.gradients.primary};
  color: white;

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${props => props.theme.shadows.md};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: ${props => props.theme.colors.textSecondary};
  border: 2px solid ${props => props.theme.colors.border};

  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
  }
`;

const SessionManager = ({ onCreateSession, onJoinSession, sessionHistory }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sessionConfig, setSessionConfig] = useState({
    name: '',
    password: '',
    quality: 'high',
    fps: 60,
    audio: true,
    recording: false,
    maxViewers: 10
  });
  const [isLoading, setIsLoading] = useState(false);

  const filteredSessions = sessionHistory?.filter(session => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return session.status === 'active';
    if (activeTab === 'ended') return session.status === 'ended';
    return true;
  }) || [];

  const handleCreateSession = async () => {
    setIsLoading(true);
    try {
      await onCreateSession(sessionConfig);
      setShowCreateModal(false);
      setSessionConfig({
        name: '',
        password: '',
        quality: 'high',
        fps: 60,
        audio: true,
        recording: false,
        maxViewers: 10
      });
      toast.success('Session created successfully!');
    } catch (error) {
      toast.error('Failed to create session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinSession = async (sessionId) => {
    try {
      await onJoinSession(sessionId);
      toast.success('Joined session successfully!');
    } catch (error) {
      toast.error('Failed to join session');
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getDuration = (session) => {
    if (session.endedAt) {
      const duration = session.endedAt - session.createdAt;
      const minutes = Math.floor(duration / 60000);
      return `${minutes}m`;
    }
    return 'Active';
  };

  return (
    <ManagerContainer>
      <Header>
        <Title>Session Manager</Title>
        <CreateButton onClick={() => setShowCreateModal(true)}>
          <Plus size={20} />
          Create Session
        </CreateButton>
      </Header>

      <FilterTabs>
        <FilterTab active={activeTab === 'all'} onClick={() => setActiveTab('all')}>
          All Sessions
        </FilterTab>
        <FilterTab active={activeTab === 'active'} onClick={() => setActiveTab('active')}>
          Active
        </FilterTab>
        <FilterTab active={activeTab === 'ended'} onClick={() => setActiveTab('ended')}>
          Ended
        </FilterTab>
      </FilterTabs>

      {filteredSessions.length === 0 ? (
        <EmptyState>
          <Monitor size={64} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <h3>No sessions found</h3>
          <p>Create your first session to start sharing your screen with others.</p>
          <CreateButton onClick={() => setShowCreateModal(true)}>
            <Plus size={20} />
            Create Session
          </CreateButton>
        </EmptyState>
      ) : (
        <SessionsGrid>
          {filteredSessions.map((session) => (
            <SessionCard key={session.id}>
              <SessionHeader>
                <SessionId>{session.id}</SessionId>
                <SessionStatus status={session.status}>
                  {session.status?.toUpperCase()}
                </SessionStatus>
              </SessionHeader>

              <SessionInfo>
                <InfoItem>
                  <Clock size={16} />
                  {formatDate(session.createdAt)}
                </InfoItem>
                <InfoItem>
                  <Users size={16} />
                  {session.viewerCount || 0} viewers
                </InfoItem>
                <InfoItem>
                  <Monitor size={16} />
                  {getDuration(session)}
                </InfoItem>
                <InfoItem>
                  <Settings size={16} />
                  {session.type || 'host'}
                </InfoItem>
              </SessionInfo>

              <SessionActions>
                {session.status === 'active' && (
                  <ActionButton 
                    variant="primary"
                    onClick={() => handleJoinSession(session.id)}
                  >
                    <Play size={16} />
                    Join
                  </ActionButton>
                )}
                <ActionButton>
                  <Share2 size={16} />
                  Share
                </ActionButton>
                <ActionButton>
                  <Download size={16} />
                  Export
                </ActionButton>
                <ActionButton>
                  <Trash2 size={16} />
                  Delete
                </ActionButton>
              </SessionActions>
            </SessionCard>
          ))}
        </SessionsGrid>
      )}

      {showCreateModal && (
        <CreateSessionModal onClick={() => setShowCreateModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalTitle>Create New Session</ModalTitle>

            <FormGroup>
              <Label>Session Name (Optional)</Label>
              <Input
                type="text"
                placeholder="My Remote Session"
                value={sessionConfig.name}
                onChange={(e) => setSessionConfig({...sessionConfig, name: e.target.value})}
              />
            </FormGroup>

            <FormGroup>
              <Label>Password (Optional)</Label>
              <Input
                type="password"
                placeholder="Leave empty for no password"
                value={sessionConfig.password}
                onChange={(e) => setSessionConfig({...sessionConfig, password: e.target.value})}
              />
            </FormGroup>

            <FormGroup>
              <Label>Video Quality</Label>
              <Select
                value={sessionConfig.quality}
                onChange={(e) => setSessionConfig({...sessionConfig, quality: e.target.value})}
              >
                <option value="low">Low (720p)</option>
                <option value="medium">Medium (1080p)</option>
                <option value="high">High (1440p)</option>
                <option value="ultra">Ultra (4K)</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>Frame Rate</Label>
              <Select
                value={sessionConfig.fps}
                onChange={(e) => setSessionConfig({...sessionConfig, fps: parseInt(e.target.value)})}
              >
                <option value={30}>30 FPS</option>
                <option value={60}>60 FPS</option>
                <option value={120}>120 FPS</option>
                <option value={144}>144 FPS</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>Max Viewers</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={sessionConfig.maxViewers}
                onChange={(e) => setSessionConfig({...sessionConfig, maxViewers: parseInt(e.target.value)})}
              />
            </FormGroup>

            <FormGroup>
              <Label>
                <Checkbox
                  type="checkbox"
                  checked={sessionConfig.audio}
                  onChange={(e) => setSessionConfig({...sessionConfig, audio: e.target.checked})}
                />
                Enable Audio Sharing
              </Label>
            </FormGroup>

            <FormGroup>
              <Label>
                <Checkbox
                  type="checkbox"
                  checked={sessionConfig.recording}
                  onChange={(e) => setSessionConfig({...sessionConfig, recording: e.target.checked})}
                />
                Record Session
              </Label>
            </FormGroup>

            <ButtonGroup>
              <SecondaryButton onClick={() => setShowCreateModal(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton 
                onClick={handleCreateSession}
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Session'}
              </PrimaryButton>
            </ButtonGroup>
          </ModalContent>
        </CreateSessionModal>
      )}
    </ManagerContainer>
  );
};

export default SessionManager;