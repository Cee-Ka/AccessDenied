import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Bundled fonts (Latin subsets only; no web-font CDN)
import '@fontsource/archivo/latin-700.css';
import '@fontsource/archivo/latin-800.css';
import '@fontsource/archivo/latin-900.css';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
