import React from 'react';

// --- Iconos SVG para los Sistemas Operativos ---

export const WindowsIcon = ({ size = 24, color = 'white' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M11.513 3.013L3 4.145V11.5h8.513V3.013zM12.513 3v8.5h8.5V2l-8.5 1zM3 12.5v7.355l8.513 1.132V12.5H3zM12.513 12.5V22l8.5-1.002V12.5h-8.5z"/>
  </svg>
);

export const AppleIcon = ({ size = 24, color = 'white' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M19.167 17.027c-.502 1.43-1.631 2.955-3.046 2.955-1.31 0-1.832-.886-3.417-.886s-2.074.886-3.38.886c-1.396 0-2.65-1.551-3.21-3.01-1.465-3.766-.61-8.516 2.05-11.082 1.34-.99 2.92-1.016 3.864-1.016.425 0 1.25.026 2.13.026s1.604 0 2.115-.026c.968 0 2.512.039 3.828 1.054-1.52.885-2.624 2.45-2.624 4.293 0 2.228 1.562 3.593 3.282 4.418-.328.48-.682.974-1.08.1476zM15.42 5.013c.967-.99 1.63-2.316 1.41-3.714-.981.09-2.221.739-3.15 1.764-.86.94-1.724 2.3-1.503 3.65.98.053 2.222-.713 3.243-1.7z"/>
  </svg>
);

export const LinuxIcon = ({ size = 24, color = 'white' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2c-5.525 0-10 4.475-10 10 0 4.138 2.513 7.688 6 9.25V12.438h-1.5V10.25H8V8.313c0-1.488.888-2.313 2.25-2.313.65 0 1.25.05 1.438.075v2.038h-1.2c-.725 0-.863.35-.863.85V10.25h2.25l-.288 2.188h-1.962v8.813c3.488-1.563 6-5.113 6-9.25 0-5.525-4.475-10-10-10z"/>
  </svg>
);


// --- Iconos SVG para las Tiendas de Apps ---

export const AppStoreIcon = ({ height = 40 }) => (
    <svg height={height} viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="40" rx="8" fill="black"/>
        <path d="M22.8,19.3c0-2.4-1.8-4.2-4.5-4.2c-2.7,0-4.5,1.8-4.5,4.2c0,2.5,1.8,4.2,4.5,4.2C21,23.5,22.8,21.8,22.8,19.3z M18.3,21.9c-1.5,0-2.5-1.1-2.5-2.6s1-2.6,2.5-2.6c1.5,0,2.5,1.1,2.5,2.6S19.8,21.9,18.3,21.9z" fill="white"/>
        <path d="M30.4,19.3c0-2.4-1.8-4.2-4.5-4.2c-2.7,0-4.5,1.8-4.5,4.2c0,2.5,1.8,4.2,4.5,4.2C28.6,23.5,30.4,21.8,30.4,19.3z M25.9,21.9c-1.5,0-2.5-1.1-2.5-2.6s1-2.6,2.5-2.6c1.5,0,2.5,1.1,2.5,2.6S27.4,21.9,25.9,21.9z" fill="white"/>
        <path d="M40,23.3h-2.1l-2.4-3.7v3.7h-2.1V15.3h2.1l2.4,3.7v-3.7h2.1V23.3z" fill="white"/>
        <path d="M45.5,23.3h-2.1V15.3h2.1V23.3z" fill="white"/>
        <path d="M54.2,15.3l-2.8,8h-2.2l2.8-8h2.2z" fill="white"/>
        <path d="M64.6,23.3h-2.1l-2.4-3.7v3.7h-2.1V15.3h2.1l2.4,3.7v-3.7h2.1V23.3z" fill="white"/>
        <path d="M69.1,23.3h-2.1V15.3h2.1V23.3z" fill="white"/>
        <path d="M78.6,23.3h-2.1L74,19.6v3.7h-2.1V15.3h2.1l2.4,3.7v-3.7h2.1V23.3z" fill="white"/>
        <path d="M83.1,23.3h-2.1V15.3h2.1V23.3z" fill="white"/>
        <path d="M92.4,15.3l-2.8,8h-2.2l2.8-8h2.2z" fill="white"/>
    </svg>
);

export const GooglePlayIcon = ({ height = 40 }) => (
    <svg height={height} viewBox="0 0 135.2 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="135.2" height="40" rx="8" fill="black"/>
        <path d="M21.1,10.2l-6.5,6.5l6.5,6.5l11.1-6.5L21.1,10.2z" fill="#00E2FF"/>
        <path d="M10,12.3l6.5,6.5l-6.5,6.5L10,12.3z" fill="#FFC900"/>
        <path d="M10,12.3l11.1,14.4l-11.1-6.5L10,12.3z" fill="#FF3A44"/>
        <path d="M21.1,26.7L10,18.8l11.1-6.5L21.1,26.7z" fill="#00A06B"/>
        <text x="38" y="25" fill="white" fontSize="12" fontFamily="Arial, sans-serif">GET IT ON</text>
        <text x="38" y="15" fill="white" fontSize="16" fontFamily="Arial, sans-serif" fontWeight="bold">Google Play</text>
    </svg>
);