/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import path from 'path';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { noteStore } from './note_store';

// eslint-disable-next-line import/no-mutable-exports
export let settingsDialog: BrowserWindow;

export const closeSettings = () => {
  if (settingsDialog !== undefined && !settingsDialog.isDestroyed()) {
    settingsDialog.close();
  }
};

export const openSettings = () => {
  if (settingsDialog !== undefined && !settingsDialog.isDestroyed()) {
    return;
  }

  settingsDialog = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, './preload_settings.js'),
      sandbox: true,
      contextIsolation: true,
    },
    width: 800,
    height: 360,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    transparent: true,
    frame: false,
    icon: path.join(__dirname, '../../assets/media_stickies_grad_icon.ico'),
  });

  settingsDialog.loadFile(path.join(__dirname, '../settings/settings.html'));

  // hot reload
  if (!app.isPackaged && process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('electron-connect').client.create(settingsDialog);
    if (process.env.SETTINGS_DIALOG === 'open') {
      settingsDialog.webContents.openDevTools();
    }
  }

  settingsDialog.webContents.on('did-finish-load', () => {
    settingsDialog.webContents.send('initialize-store', noteStore.info, noteStore.settings);
  });
  settingsDialog.webContents.on('new-window', (e, _url) => {
    e.preventDefault();
    shell.openExternal(_url);
  });
};
