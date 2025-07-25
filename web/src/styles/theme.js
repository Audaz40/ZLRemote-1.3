export const theme = {
    light: {
      colors: {
        primary: '#667eea',
        primaryDark: '#5a67d8',
        secondary: '#764ba2',
        success: '#51cf66',
        warning: '#ffa502',
        error: '#ff6b6b',
        info: '#1e90ff',
        
        background: '#ffffff',
        surface: '#f8f9fa',
        surfaceHover: '#e9ecef',
        
        text: '#333333',
        textSecondary: '#666666',
        textMuted: '#999999',
        
        border: '#e2e8f0',
        borderLight: '#f1f3f4',
        
        gray50: '#f9fafb',
        gray100: '#f3f4f6',
        gray200: '#e5e7eb',
        gray300: '#d1d5db',
        gray400: '#9ca3af',
        gray500: '#6b7280',
        gray600: '#4b5563',
        gray700: '#374151',
        gray800: '#1f2937',
        gray900: '#111827',
      },
      shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      },
      gradients: {
        primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        success: 'linear-gradient(135deg, #51cf66 0%, #40c057 100%)',
        warning: 'linear-gradient(135deg, #ffa502 0%, #ff7675 100%)',
      }
    },
    dark: {
      colors: {
        primary: '#667eea',
        primaryDark: '#5a67d8',
        secondary: '#764ba2',
        success: '#51cf66',
        warning: '#ffa502',
        error: '#ff6b6b',
        info: '#1e90ff',
        
        background: '#1a1a1a',
        surface: '#2d2d2d',
        surfaceHover: '#404040',
        
        text: '#ffffff',
        textSecondary: '#cccccc',
        textMuted: '#888888',
        
        border: '#404040',
        borderLight: '#333333',
        
        gray50: '#111827',
        gray100: '#1f2937',
        gray200: '#374151',
        gray300: '#4b5563',
        gray400: '#6b7280',
        gray500: '#9ca3af',
        gray600: '#d1d5db',
        gray700: '#e5e7eb',
        gray800: '#f3f4f6',
        gray900: '#f9fafb',
      },
      shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
      },
      gradients: {
        primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        success: 'linear-gradient(135deg, #51cf66 0%, #40c057 100%)',
        warning: 'linear-gradient(135deg, #ffa502 0%, #ff7675 100%)',
      }
    }
  };
  
  export const breakpoints = {
    xs: '320px',
    sm: '768px',
    md: '1024px',
    lg: '1280px',
    xl: '1920px',
  };
  
  export const spacing = {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  };
  
  export const typography = {
    fontSizes: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      xxl: '24px',
      xxxl: '32px',
    },
    fontWeights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeights: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  };