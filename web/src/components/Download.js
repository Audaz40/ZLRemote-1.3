import React from 'react';
import './Download.css';
// Importa los iconos que acabamos de crear
import { WindowsIcon, AppleIcon, LinuxIcon, AppStoreIcon, GooglePlayIcon } from './icons/OSIcons';

const Download = () => {
  // Enlaces a tus instaladores en GitHub Releases.
  // Asegúrate de que los nombres de archivo coincidan con los que genera electron-builder.
  const GITHUB_RELEASE_URL = "https://github.com/Audaz40/ZLRemote-1.3/releases/latest/download";
  const VERSION = "1.0.0"; // Cambia esto con cada nueva versión

  return (
    <section id="download" className="download">
      <div className="container download-container">
        <h2 className="section-title">Get ZLRemote Now</h2>
        <p className="section-subtitle">Download the native application for the best performance and all features. Available for all major desktop platforms.</p>
        
        <div className="download-buttons">
          {/* Botón para Windows */}
          <a href={`${GITHUB_RELEASE_URL}/ZLRemote-Setup-${VERSION}.exe`} className="download-button windows">
            <WindowsIcon size={24} />
            Download for Windows
          </a>
          
          {/* Botón para macOS */}
          <a href={`${GITHUB_RELEASE_URL}/ZLRemote-${VERSION}.dmg`} className="download-button macos">
            <AppleIcon size={24} />
            Download for macOS
          </a>
          
          {/* Botón para Linux */}
          <a href={`${GITHUB_RELEASE_URL}/ZLRemote-${VERSION}.AppImage`} className="download-button linux">
            <LinuxIcon size={24} />
            Download for Linux
          </a>
        </div>
        
        <div className="mobile-stores">
          <p className="coming-soon-text">Mobile apps coming soon</p>
          <div className="store-badges">
            <div className="store-badge-wrapper disabled">
              <AppStoreIcon height={40} />
            </div>
            <div className="store-badge-wrapper disabled">
              <GooglePlayIcon height={40} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Download;