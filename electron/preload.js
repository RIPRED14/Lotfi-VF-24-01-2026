import { contextBridge, ipcRenderer } from 'electron';

// Exposer des APIs sécurisées au renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Exemple d'API si nécessaire
  platform: process.platform,
  versions: process.versions
});

// Log pour vérifier que le preload est chargé
console.log('✅ Preload script chargé');









