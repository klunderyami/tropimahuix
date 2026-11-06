import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app.js';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { BrandSplash } from './components/BrandSplash.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <BrandSplash />
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>
);
