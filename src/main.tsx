import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/nexora.css';
import App from './App';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('NEXORA: #root element is missing in index.html');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);
