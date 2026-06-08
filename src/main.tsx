import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App'; // <-- CORRECCIÓN: Eliminada la extensión .tsx
import './index.css';

// Inyección dinámica de Google Fonts (Inter y Dancing Script)
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Inter:wght@300;400;600;700&display=swap';
document.head.appendChild(link);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);