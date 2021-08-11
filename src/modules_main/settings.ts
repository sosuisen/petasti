/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import path from 'path';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { closeDB } from './store';

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
      nodeIntegration: true,
      sandbox: false,
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

  // hot reload
  if (!app.isPackaged && process.env.NODE_ENV === 'development') {
    require('electron-connect').client.create(settingsDialog);
    settingsDialog.webContents.openDevTools();
  }

  settingsDialog.loadURL(path.join(__dirname, '../settings/settings.html'));
  settingsDialog.webContents.on('did-finish-load', () => {
    //    const unsubscribe = subscribeStoreFromSettings(settingsDialog);
    settingsDialog.on('close', () => {
      //      unsubscribe();
    });
  });
  settingsDialog.webContents.on('new-window', (e, _url) => {
    e.preventDefault();
    shell.openExternal(_url);
  });
};

// Request from settings dialog
ipcMain.handle('open-directory-selector-dialog', (event, message: string) => {
  return openDirectorySelectorDialog(message);
});

ipcMain.handle('open-file-selector-dialog', (event, message: string) => {
  return openFileSelectorDialog(message);
});

ipcMain.handle('close-cardio', async event => {
  await closeDB();
});

const openDirectorySelectorDialog = (message: string) => {
  const file: string[] | undefined = dialog.showOpenDialogSync(settingsDialog, {
    properties: ['openDirectory'],
    title: message,
    message: message, // macOS only
  });
  return file;
};

const openFileSelectorDialog = (message: string) => {
  const file: string[] | undefined = dialog.showOpenDialogSync(settingsDialog, {
    properties: ['openFile'],
    filters: [
      { name: 'JSON', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    title: message,
    message: message, // macOS only
  });
  return file;
};
