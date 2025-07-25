import React from 'react';
import styled from 'styled-components';
import { Moon, Sun, Settings, Power, Users } from 'lucide-react';

const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 64px;
  background: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  backdrop-filter: blur(20px);
`;

const Logo = styled.div`
  font-size: 24px;
  font-weight: 300;
  color: ${props => props.theme.colors.primary};
  
  span {
    font-weight: 700;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  background: ${props => props.connected ? props.theme.colors.success : props.theme.colors.error}20;
  color: ${props => props.connected ? props.theme.colors.success : props.theme.colors.error};
  font-size: 14px;
  font-weight: 500;
`;

const SessionInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  background: ${props => props.theme.colors.primary}10;
  color: ${props => props.theme.colors.primary};
  font-size: 14px;
  font-weight: 500;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
    color: ${props => props.theme.colors.text};
  }
`;

const LeaveButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: ${props => props.theme.colors.error};
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${props => props.theme.shadows.md};
  }
`;

const Header = ({ 
  onThemeToggle, 
  currentTheme, 
  isConnected, 
  currentSession, 
  onLeaveSession 
}) => {
  return (
    <HeaderContainer>
      <Logo>
        ZL<span>Remote</span>
      </Logo>

      <HeaderActions>
        <StatusIndicator connected={isConnected}>
          <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </StatusIndicator>

        {currentSession && (
          <>
            <SessionInfo>
              <Users size={16} />
              Session: {currentSession.id}
            </SessionInfo>
            <LeaveButton onClick={onLeaveSession}>
              <Power size={16} />
              Leave
            </LeaveButton>
          </>
        )}

        <IconButton onClick={onThemeToggle}>
          {currentTheme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </IconButton>

        <IconButton>
          <Settings size={20} />
        </IconButton>
      </HeaderActions>
    </HeaderContainer>
  );
};

export default Header;