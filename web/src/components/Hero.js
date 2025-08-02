import React from 'react';
import './Hero.css';
// Crea una imagen de un monitor con tu app y ponla en 'src/assets/hero-image.png'
// import heroImage from '../assets/hero-image.png'; 

const Hero = () => {
  return (
    <section id="hero" className="hero">
      <div className="container hero-container">
        <div className="hero-content">
          <h1 className="hero-title">
            The Future of Remote Desktop.
            <span className="gradient-text"> Instant. Fluid. Secure.</span>
          </h1>
          <p className="hero-subtitle">
            Experience zero-latency and high-fidelity screen sharing across all your devices. ZLRemote redefines what's possible in remote collaboration.
          </p>
          <a href="#download" className="hero-cta">Download Now</a>
        </div>
        <div className="hero-image-container">
          {/* <img src={heroImage} alt="ZLRemote Application Showcase" className="hero-image" /> */}
          <div className="mock-image"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;