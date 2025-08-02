import React from 'react';
import './Download.css';

const Download = () => {
  // En un futuro, podrías detectar el SO del usuario y destacar el botón correcto
  // const userOS = 'Windows'; 

  return (
    <section id="download" className="download">
      <div className="container download-container">
        <h2 className="section-title">Get ZLRemote Now</h2>
        <p className="section-subtitle">Download the native application for the best performance and all features.</p>
        
        <div className="download-buttons">
          <a href="URL_AL_INSTALADOR_DE_WINDOWS" className="download-button windows">
            <span className="icon">🪟</span>
            Download for Windows
          </a>
          <a href="URL_AL_INSTALADOR_DE_MACOS" className="download-button macos">
            <span className="icon"></span>
            Download for macOS
          </a>
          <a href="URL_AL_INSTALADOR_DE_LINUX" className="download-button linux">
            <span className="icon">🐧</span>
            Download for Linux
          </a>
        </div>
        
        <div className="mobile-stores">
          <a href="#" className="store-badge">App Store</a>
          <a href="#" className="store-badge">Google Play</a>
        </div>
      </div>
    </section>
  );
};

export default Download;