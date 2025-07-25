import React from 'react';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { 
  Home, 
  Monitor, 
  Settings, 
  BarChart3, 
  Wifi, 
  WifiOff,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const SidebarContainer = styled.aside`
  width: ${props => props.collapsed ? '64px' : '280px'};
  background: ${props => props.theme.colors.surface};
  border-right: 1px solid ${props => props.theme.colors.border};
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const ToggleButton = styled.button`
  position: absolute;
  top: 20px;
  right: -12px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  
  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
  }
`;

const NavList = styled.nav`
  padding: 80px 16px 16px;
  flex: 1;
`;

const NavItem = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 4px;
  border-radius: 8px;
  color: ${props => props.theme.colors.textSecondary};
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;
  overflow: hidden;

  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
    color: ${props => props.theme.colors.text};
  }

  &.active {
    background: ${props => props.theme.colors.primary}10;
    color: ${props => props.theme.colors.primary};
  }

  span {
    opacity: ${props => props.collapsed ? 0 : 1};
    transition: opacity 0.3s ease;
  }
`;

const ConnectionStatus = styled.div`
  padding: 16px;
  border-top: 1px solid ${props => props.theme.colors.border};
  display: flex;
  align-items: center;
  gap: 12px;
  color: ${props => props.status === 'connected' 
    ? props.theme.colors.success 
    : props.theme.colors.error};
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.connected 
    ? props.theme.colors.success 
    : props.theme.colors.error};
  animation: ${props => props.connected ? 'pulse 2s infinite' : 'none'};

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const SessionIndicator = styled.div`
  padding: 16px;
  background: ${props => props.theme.colors.primary}10;
  color: ${props => props.theme.colors.primary};
  font-size: 14px;
  font-weight: 500;
`;

const Sidebar = ({ collapsed, onToggle, connectionStatus, currentSession }) => {
  const navItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/sessions', icon: Monitor, label: 'Sessions' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <SidebarContainer collapsed={collapsed}>
      <ToggleButton onClick={onToggle}>
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </ToggleButton>

      <NavList>
        {navItems.map(item => (
          <NavItem key={item.to} to={item.to} collapsed={collapsed}>
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavItem>
        ))}
      </NavList>

      {currentSession && !collapsed && (
        <SessionIndicator>
          Active: {currentSession.id}
        </SessionIndicator>
      )}

      <ConnectionStatus status={connectionStatus}>
        {connectionStatus === 'connected' ? <Wifi size={20} /> : <WifiOff size={20} />}
        {!collapsed && (
          <span>
            {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </span>
        )}
        <StatusDot connected={connectionStatus === 'connected'} />
      </ConnectionStatus>
    </SidebarContainer>
  );
};

export default Sidebar;