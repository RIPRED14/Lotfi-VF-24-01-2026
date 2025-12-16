import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

// Utiliser HashRouter pour Electron (compatible avec file://)
// BrowserRouter nécessite un serveur HTTP, HashRouter fonctionne avec file://
createRoot(document.getElementById("root")!).render(
  <HashRouter>
    <App />
  </HashRouter>
);
