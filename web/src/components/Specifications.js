import React from 'react';
import './Specifications.css';

const specsData = [
  { category: 'Performance', name: 'Latency', value: '< 16ms (Local Network)' },
  { category: 'Performance', name: 'Framerate', value: 'Up to 144 FPS' },
  { category: 'Performance', name: 'Resolution', value: 'Up to 4K / HDR' },
  { category: 'Security', name: 'Encryption', value: 'DTLS 1.2 (End-to-End)' },
  { category: 'Security', name: 'Authentication', value: 'Secure Session ID & Password' },
  { category: 'Compatibility', name: 'Platforms', value: 'Windows, macOS, Linux, Web' },
  { category: 'Compatibility', name: 'Mobile', value: 'Android & iOS (Coming Soon)' },
  { category: 'Features', name: 'Audio', value: 'Bidirectional Stereo' },
  { category: 'Features', name: 'File Transfer', value: 'Drag & Drop, P2P' }
];

const Specifications = () => {
  return (
    <section id="specs" className="specs">
      <div className="container">
        <h2 className="section-title">Built for Performance.</h2>
        <p className="section-subtitle">A technical overview of the ZLRemote protocol and capabilities.</p>
        <div className="specs-table">
          {specsData.map((spec, index) => (
            <div className="spec-row" key={index}>
              <div className="spec-category">{spec.category}</div>
              <div className="spec-name">{spec.name}</div>
              <div className="spec-value">{spec.value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Specifications;