import React from 'react';
import './Hero.css';

const Hero = () => {
  return (
    <section id="hero" className="hero">
      <div className="container hero-container">
        <div className="hero-content">
          <div className="hero-badge">Zero Latency Protocol v2.0</div>
          <h1 className="hero-title">
            The Remote Desktop Experience.
            <span className="gradient-text">Redefined.</span>
          </h1>
          <p className="hero-subtitle">
            Fluid, real-time control across all your devices. ZLRemote feels less like a tool, and more like an extension of your own desktop.
          </p>
          <div className="hero-buttons">
            <a href="#download" className="hero-cta">Download for Free</a>
            <a href="#features" className="hero-secondary-cta">Learn More</a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;