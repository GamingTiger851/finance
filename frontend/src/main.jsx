import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register the PWA worker in production and localhost (a secure browser origin).
if ('serviceWorker' in navigator && (import.meta.env.PROD || ['localhost', '127.0.0.1'].includes(window.location.hostname))) {
  window.addEventListener('load', () => {
    const workerUrl = import.meta.env.DEV ? '/sw.js?dev=true' : '/sw.js';
    navigator.serviceWorker.register(workerUrl).catch((err) => {
      console.warn('ServiceWorker registration skipped:', err);
    });
  });
}
