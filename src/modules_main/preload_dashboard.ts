/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import { contextBridge, ipcRenderer } from 'electron';
import { DatabaseCommand } from '../modules_common/db.types';
import { DashboardCommand } from '../modules_common/dashboard.types';

contextBridge.exposeInMainWorld('api', {
  /**
   * Command from Renderer process
   */
  dashboard: (command: DashboardCommand) => {
    return ipcRenderer.invoke('dashboard', command);
  },
});

/**
 * Command from Main process
 */
ipcRenderer.on('initialize-store', (event, info, settings) => {
  window.postMessage({ command: 'initialize-store', info, settings }, 'file://');
});

ipcRenderer.on('update-info', (event, info) => {
  window.postMessage({ command: 'update-info', info }, 'file://');
});

ipcRenderer.on('search-result-note-and-card', (event, noteResults, cardResults) => {
  window.postMessage(
    { command: 'search-result-note-and-card', noteResults, cardResults },
    'file://'
  );
});

ipcRenderer.on('search-result-note', (event, noteResults, currentIndex) => {
  window.postMessage(
    { command: 'search-result-note', noteResults, currentIndex },
    'file://'
  );
});

ipcRenderer.on('get-all-notes', (event, noteResults) => {
  window.postMessage({ command: 'get-all-notes', noteResults }, 'file://');
});

ipcRenderer.on('open-card', (event, cardProp) => {
  window.postMessage({ command: 'open-card', cardProp }, 'file://');
});

ipcRenderer.on('get-references', (event, refs) => {
  window.postMessage({ command: 'get-references', refs }, 'file://');
});
