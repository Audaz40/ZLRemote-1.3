import React from 'react';
import './Download.css';

const Download = () => {
  // Enlaces a tus instaladores en GitHub Releases
  const GITHUB_REPO_URL = "https://github.com/Audaz40/ZLRemote-1.3";
  const LATEST_RELEASE_URL = `${GITHUB_REPO_URL}/releases/latest`;

  return (
    <section id="download" className="download">
      <div className="container download-container">
        <h2 className="section-title">Ready to Connect?</h2>
        <p className="section-subtitle">
          Download the native desktop client for the best performance and hosting capabilities.
          Web client for viewing only.
        </p>
        <div className="download-card">
          <div className="download-info">
            <h3>ZLRemote Desktop Client</h3>
            <p>Version 1.0.0 (Latest)</p>
            <div className="os-icons">
              <span>🪟</span>
              <span></span>
              <span>🐧</span>
            </div>
          </div>
          <a href={LATEST_RELEASE_URL} target="_blank" rel="noopener noreferrer" className="download-main-button">
            Download from GitHub
          </a>
        </div>
      </div>
    </section>
  );
};

export default Download;