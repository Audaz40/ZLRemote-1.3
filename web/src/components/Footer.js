import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <p>&copy; {new Date().getFullYear()} ZLRemote. An Open Source Project.</p>
        <div className="footer-links">
          <a href="https://github.com/tu-usuario/ZLRemote-App/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">License</a>
          <a href="https://github.com/tu-usuario/ZLRemote-App/issues" target="_blank" rel="noopener noreferrer">Report an Issue</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;