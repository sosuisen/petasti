/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { contextBridge, ipcRenderer } from 'electron';
import { DatabaseCommand } from '../modules_common/db.types';

contextBridge.exposeInMainWorld('api', {
  /**
   * Command from Renderer process
   */
  db: (command: DatabaseCommand) => {
    return ipcRenderer.invoke('db', command);
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

ipcRenderer.on('sync-item', (event, changes, taskMetadata) => {
  window.postMessage({ command: 'sync-item', changes, taskMetadata }, 'file://');
});

ipcRenderer.on('sync-box', (event, changes, taskMetadata) => {
  window.postMessage({ command: 'sync-box', changes, taskMetadata }, 'file://');
});

ipcRenderer.on('sync-start', () => {
  window.postMessage({ command: 'sync-start' }, 'file://');
});

ipcRenderer.on('sync-complete', () => {
  window.postMessage({ command: 'sync-complete' }, 'file://');
});
