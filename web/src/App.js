import React from 'react';
import './index.css';
import Header from './components/Header';
import Hero from './components/Hero';
import Specifications from './components/Specifications'; // Cambiado
import Download from './components/Download';
import Footer from './components/Footer';

function App() {
  return (
    <div className="App">
      <Header />
      <main>
        <Hero />
        <Specifications /> {/* Cambiado */}
        <Download />
      </main>
      <Footer />
    </div>
  );
}

export default App;