import React from 'react';
import './Features.css';

const featuresData = [
  { icon: '⚡️', title: 'Zero Latency', description: 'Experience real-time interaction with our custom protocol, achieving sub-16ms latency on local networks.' },
  { icon: '🎥', title: '144+ FPS Streaming', description: 'Fluid, high-frame-rate streaming makes remote work and gaming feel native.' },
  { icon: '🔒', title: 'End-to-End Encryption', description: 'All sessions are secured with modern encryption standards, ensuring your data remains private.' },
  { icon: '💻', title: 'Cross-Platform', description: 'Run ZLRemote on Windows, macOS, Linux, Android, iOS, and even your Smart TV.' },
  { icon: '🔊', title: 'High-Fidelity Audio', description: 'Crystal-clear, bidirectional audio streaming for seamless communication and collaboration.' },
  { icon: '📁', title: 'Instant File Transfer', description: 'Drag and drop files between devices instantly, with a fast and reliable transfer system.' }
];

const Features = () => {
  return (
    <section id="features" className="features">
      <div className="container">
        <h2 className="section-title">Why ZLRemote is Different</h2>
        <p className="section-subtitle">We built ZLRemote from the ground up to be the fastest, most reliable remote desktop solution.</p>
        <div className="features-grid">
          {featuresData.map((feature, index) => (
            <div className="feature-card" key={index}>
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;