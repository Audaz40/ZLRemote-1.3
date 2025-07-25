import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Monitor, 
  Mic, 
  Volume2, 
  Wifi, 
  Shield, 
  Download, 
  Upload,
  Bell,
  Palette,
  Globe,
  Save,
  RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

const SettingsContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin-bottom: 8px;
`;

const Subtitle = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 16px;
`;

const SettingsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const SettingCard = styled.div`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 16px;
  padding: 24px;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
`;

const CardIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${props => props.theme.colors.primary}10;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.theme.colors.primary};
`;

const CardTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

const CardDescription = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 14px;
  margin-top: 4px;
`;

const SettingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid ${props => props.theme.colors.borderLight};

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }
`;

const SettingLabel = styled.div`
  flex: 1;
`;

const SettingName = styled.div`
  font-weight: 500;
  color: ${props => props.theme.colors.text};
  margin-bottom: 4px;
`;

const SettingDescription = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
`;

const SettingControl = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Toggle = styled.button`
  width: 48px;
  height: 24px;
  border-radius: 12px;
  border: none;
  background: ${props => props.active ? props.theme.colors.primary : props.theme.colors.gray300};
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${props => props.active ? '26px' : '2px'};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    transition: all 0.2s ease;
  }
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 2px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  min-width: 120px;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const Input = styled.input`
  padding: 8px 12px;
  border: 2px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  min-width: 120px;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const ThemePreview = styled.div`
  display: flex;
  gap: 8px;
`;

const ThemeOption = styled.button`
  width: 40px;
  height: 24px;
  border-radius: 6px;
  border: 2px solid ${props => props.active ? props.theme.colors.primary : 'transparent'};
  cursor: pointer;
  background: ${props => props.bg};
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.1);
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 32px;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
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
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: ${props => props.theme.colors.textSecondary};
  border: 2px solid ${props => props.theme.colors.border};

  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
  }
`;

const Settings = ({ currentTheme, onThemeChange }) => {
  const [settings, setSettings] = useState({
    // Video Settings
    defaultQuality: 'high',
    defaultFPS: 60,
    hardwareAcceleration: true,
    adaptiveQuality: true,
    
    // Audio Settings
    audioEnabled: true,
    microphoneEnabled: true,
    echoCancellation: true,
    noiseSuppression: true,
    
    // Network Settings
    serverUrl: 'ws://localhost:3001',
    autoReconnect: true,
    connectionTimeout: 30,
    maxRetries: 5,
    
    // Security Settings
    requirePassword: false,
    encryptionEnabled: true,
    allowScreenshots: true,
    sessionTimeout: 60,
    
    // Notifications
    soundNotifications: true,
    desktopNotifications: true,
    connectionAlerts: true,
    
    // Appearance
    theme: currentTheme || 'light',
    language: 'en',
    showFPS: true,
    showLatency: true,
    
    // Performance
    lowLatencyMode: true,
    prioritizeQuality: false,
    limitBandwidth: false,
    maxBandwidth: 50
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('zlremote-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, []);

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);

    // Special handling for theme
    if (key === 'theme' && onThemeChange) {
      onThemeChange(value);
    }
  };

  const saveSettings = () => {
    try {
      localStorage.setItem('zlremote-settings', JSON.stringify(settings));
      setHasChanges(false);
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const resetSettings = () => {
    const defaultSettings = {
      defaultQuality: 'high',
      defaultFPS: 60,
      hardwareAcceleration: true,
      adaptiveQuality: true,
      audioEnabled: true,
      microphoneEnabled: true,
      echoCancellation: true,
      noiseSuppression: true,
      serverUrl: 'ws://localhost:3001',
      autoReconnect: true,
      connectionTimeout: 30,
      maxRetries: 5,
      requirePassword: false,
      encryptionEnabled: true,
      allowScreenshots: true,
      sessionTimeout: 60,
      soundNotifications: true,
      desktopNotifications: true,
      connectionAlerts: true,
      theme: 'light',
      language: 'en',
      showFPS: true,
      showLatency: true,
      lowLatencyMode: true,
      prioritizeQuality: false,
      limitBandwidth: false,
      maxBandwidth: 50
    };
    
    setSettings(defaultSettings);
    setHasChanges(true);
    toast.success('Settings reset to defaults');
  };

  return (
    <SettingsContainer>
      <Header>
        <Title>Settings</Title>
        <Subtitle>Customize your ZLRemote experience</Subtitle>
      </Header>

      <SettingsGrid>
        {/* Video Settings */}
        <SettingCard>
          <CardHeader>
            <CardIcon>
              <Monitor size={20} />
            </CardIcon>
            <div>
              <CardTitle>Video Settings</CardTitle>
              <CardDescription>Configure video quality and performance</CardDescription>
            </div>
          </CardHeader>

          <SettingRow>
            <SettingLabel>
              <SettingName>Default Quality</SettingName>
              <SettingDescription>Default video quality for new sessions</SettingDescription>
            </SettingLabel>
            <SettingControl>
              <Select
                value={settings.defaultQuality}
                onChange={(e) => updateSetting('defaultQuality', e.target.value)}
              >
                <option value="low">Low (720p)</option>
                <option value="medium">Medium (1080p)</option>
                <option value="high">High (1440p)</option>
                <option value="ultra">Ultra (4K)</option>
              </Select>
            </SettingControl>
          </SettingRow>

          <SettingRow>
            <SettingLabel>
              <SettingName>Default Frame Rate</SettingName>
              <SettingDescription>Target FPS for screen sharing</SettingDescription>
            </SettingLabel>
            <SettingControl>
              <Select
                value={settings.defaultFPS}
                onChange={(e) => updateSetting('defaultFPS', parseInt(e.target.value))}
              >
                <option value={30}>30 FPS</option>
                <option value={60}>60 FPS</option>
                <option value={120}>120 FPS</option>
                <option value={144}>144 FPS</option>
              </Select>
            </SettingControl>
          </SettingRow>

          <SettingRow>
            <SettingLabel>
              <SettingName>Hardware Acceleration</SettingName>
              <SettingDescription>Use GPU for video encoding/decoding</SettingDescription>
            </SettingLabel>
            <SettingControl>
              <Toggle
                active={settings.hardwareAcceleration}
                onClick={() => updateSetting('hardwareAcceleration', !settings.hardwareAcceleration)}
              />
            </SettingControl>
          </SettingRow>

          <SettingRow>
            <SettingLabel>
              <SettingName>Adaptive Quality</SettingName>
              <SettingDescription>Automatically adjust quality based on connection</SettingDescription>
            </SettingLabel>
            <SettingControl>
              <Toggle
                active={settings.adaptiveQuality}
                onClick={() => updateSetting('adaptiveQuality', !settings.adaptiveQuality)}
              />
            </SettingControl>
          </SettingRow>
        </SettingCard>

        {/* Audio Settings */}
        <SettingCard>
          <CardHeader>
            <CardIcon>
              <Volume2 size={20} />
            </CardIcon>
            <div>
              <CardTitle>Audio Settings</CardTitle>
              <CardDescription>Configure audio sharing and processing</CardDescription>
            </div>
          </CardHeader>

          <SettingRow>
            <SettingLabel>
              <SettingName>Audio Sharing</SettingName>
              <SettingDescription>Enable audio transmission</SettingDescription>
            </SettingLabel>
            <SettingControl>
              <Toggle
                active={settings.audioEnabled}
                onClick={() => updateSetting('audioEnabled', !settings.audioEnabled)}
              />
            </SettingControl>
          </SettingRow>

          <SettingRow>
            <SettingLabel>
              <SettingName>Microphone</SettingName>
              <SettingDescription>Enable microphone input</SettingDescription>
            </SettingLabel>
            <SettingControl>
              <Toggle
                active={settings.microphoneEnabled}
                onClick={() => updateSetting('microphoneEnabled', !settings.microphoneEnabled)}
              />
            </SettingControl>
          </SettingRow>

          <SettingRow>
            <SettingLabel>
              <SettingName>Echo Cancellation</SettingName>
              <SettingDescription>Reduce audio echo and feedback</SettingDescription>
            </SettingLabel>
            <SettingControl>
              <Toggle
                active={settings.echoCancellation}
                onClick={() => updateSetting('echoCancellation', !settings.echoCancellation)}
              />
            </SettingControl>
          </SettingRow>

          <SettingRow>
            <SettingLabel>
              <SettingName>Noise Suppression</SettingName>
              <SettingDescription>Filter background noise</SettingDescription>
            </SettingLabel>
            <SettingControl>
              <Toggle
                active={settings.noiseSuppression}
                onClick={() => updateSetting('noiseSuppression', !settings.noiseSuppression)}
              />
            </SettingControl>
          </SettingRow>
        </SettingCard>

        {/* Appearance Settings */}
        <SettingCard>
          <CardHeader>
            <CardIcon>
              <Palette size={20} />
            </CardIcon>
            <div>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the interface appearance</CardDescription>
            </div>
          </CardHeader>

          <SettingRow>
            <SettingLabel>
              <SettingName>Theme</SettingName>
              <SettingDescription>Choose your preferred color scheme</SettingDescription>
            </SettingLabel>
            <SettingControl>
              <ThemePreview>
                <ThemeOption
                  bg="linear-gradient(135deg, #fff, #f8f9fa)"
                  active={settings.theme === 'light'}
                  onClick={() => updateSetting('theme', 'light')}
                />
                <ThemeOption
                  bg="linear-gradient(135deg, #1a1a1a, #2d2d2d)"
                  active={settings.theme === 'dark'}
                  onClick={() => updateSetting('theme', 'dark')}
                />
              </ThemePreview>
            </SettingControl>
          </SettingRow>

          <SettingRow>
            <SettingLabel>
              <SettingName>Show FPS Counter</SettingName>
              <SettingDescription>Display frame rate indicator</SettingDescription>
            </SettingLabel>
            <SettingControl>
              <Toggle
                active={settings.showFPS}
                onClick={() => updateSetting('showFPS', !settings.showFPS)}
              />
            </SettingControl>
          </SettingRow>

          <SettingRow>
            <SettingLabel>
              <SettingName>Show Latency</SettingName>
              <SettingDescription>Display connection latency</SettingDescription>
            </SettingLabel>
            <SettingControl>
              <Toggle
                active={settings.showLatency}
                onClick={() => updateSetting('showLatency', !settings.showLatency)}
              />
            </SettingControl>
          </SettingRow>
        </SettingCard>

        {/* Network Settings */}
        <SettingCard>
          <CardHeader>
            <CardIcon>
              <Wifi size={20} />
            </CardIcon>
            <div>
              <CardTitle>Network Settings</CardTitle>
              <CardDescription>Configure connection and performance</CardDescription>
            </div>
          </CardHeader>

          <SettingRow>
            <SettingLabel>
              <SettingName>Server URL</SettingName>
              <SettingDescription>ZLRemote server address</SettingDescription>
            </SettingLabel>
            <SettingControl>
              <Input
                type="text"
                value={settings.serverUrl}
                onChange={(e) => updateSetting('serverUrl', e.target.value)}
                placeholder="ws://localhost:3001"
              />
            </SettingControl>
          </SettingRow>

          <SettingRow>
            <SettingLabel>
              <SettingName>Auto Reconnect</SettingName>
              <SettingDescription>Automatically reconnect if connection is lost</SettingDescription>
            </SettingLabel>
            <SettingControl>
              <Toggle
                active={settings.autoReconnect}
                onClick={() => updateSetting('autoReconnect', !settings.autoReconnect)}
              />
            </SettingControl>
          </SettingRow>

          <SettingRow>
            <SettingLabel>
              <SettingName>Low Latency Mode</SettingName>
              <SettingDescription>Optimize for minimal delay</SettingDescription>
            </SettingLabel>
            <SettingControl>
              <Toggle
                active={settings.lowLatencyMode}
                onClick={() => updateSetting('lowLatencyMode', !settings.lowLatencyMode)}
              />
            </SettingControl>
          </SettingRow>
        </SettingCard>
      </SettingsGrid>

      <ActionButtons>
        <SecondaryButton onClick={resetSettings}>
          <RotateCcw size={16} />
          Reset to Defaults
        </SecondaryButton>
        <PrimaryButton onClick={saveSettings} disabled={!hasChanges}>
          <Save size={16} />
          Save Settings
        </PrimaryButton>
      </ActionButtons>
    </SettingsContainer>
  );
};

export default Settings;