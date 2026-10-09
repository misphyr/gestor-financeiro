import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/500.css';
import '@fontsource/figtree/600.css';
import '@fontsource/figtree/700.css';
import '@fontsource/bricolage-grotesque/700.css';
import './styles/app.css';
import App from './App';
import { Capacitor } from '@capacitor/core';
import { initStorage } from './utils/storage';
import { applyTheme } from './utils/theme';

const root = ReactDOM.createRoot(document.getElementById('root'));

const renderApp = () => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

initStorage()
  .catch(() => {
    // Se o SQLite falhar ao abrir, a cópia local já está carregada (e a tela avisa).
  })
  .finally(() => {
    applyTheme(); // antes de desenhar, para não piscar o tema errado
    renderApp();
  });

// Service worker só na versão web (PWA). No app Android os arquivos já vêm no APK,
// então remove registros antigos que possam servir cache velho.
if ('serviceWorker' in navigator) {
  if (Capacitor.isNativePlatform()) {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    });
  }
}
