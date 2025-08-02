import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css'; // Importa tus estilos globales
import App from './App'; // Importa tu componente principal

// Encuentra el elemento 'root' en tu index.html
const container = document.getElementById('root');

// Crea la raíz de la aplicación React
const root = createRoot(container);

// Renderiza tu componente App dentro de la raíz
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);