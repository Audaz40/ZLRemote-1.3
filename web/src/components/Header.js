import React, { useState, useEffect } from 'react';
import './Header.css';

const Header = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`header ${scrolled ? 'scrolled' : ''}`}>
      <div className="container header-container">
        <div className="logo">
          ZL<span>Remote</span>
        </div>
        <nav>
          <ul>
            <li><a href="#features">Features</a></li>
            <li><a href="#specs">Specifications</a></li>
            <li><a href="#download">Download</a></li>
          </ul>
        </nav>
        <a href="https://github.com/Audaz40/ZLRemote-1.3" target="_blank" rel="noopener noreferrer" className="header-github-link">
          GitHub
        </a>
      </div>
    </header>
  );
};

export default Header;