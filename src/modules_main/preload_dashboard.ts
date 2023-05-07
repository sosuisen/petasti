/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import { contextBridge, ipcRenderer } from 'electron';
import { DatabaseCommand } from '../modules_common/db.types';

contextBridge.exposeInMainWorld('api', {
  /**
   * Command from Renderer process
   */
  db: (command: DatabaseCommand) => {
    return ipcRenderer.invoke('db-settings', command);
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
