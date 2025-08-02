import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <div className="footer-logo">
          ZL<span>Remote</span>
        </div>
        <div className="footer-links">
          <a href="#features">Features</a>
          <a href="#download">Download</a>
          <a href="#">Documentation</a>
          <a href="#">Contact</a>
        </div>
        <div className="footer-copy">
          &copy; {new Date().getFullYear()} ZLRemote. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;