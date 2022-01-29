/**
 * TreeStickies
 * © 2022 Hidekazu Kubota
 */
import path from 'path';
import { app, BrowserWindow, shell } from 'electron';
import { INote } from './note_types';
import { APP_ICON_NAME } from '../modules_common/const';

// eslint-disable-next-line import/no-mutable-exports
export let settingsDialog: BrowserWindow;

export const closeSettings = () => {
  if (settingsDialog !== undefined && !settingsDialog.isDestroyed()) {
    settingsDialog.close();
  }
};

export const openSettings = (note: INote) => {
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
    icon: path.join(__dirname, '../../assets/' + APP_ICON_NAME),
  });

  settingsDialog.webContents.on('did-finish-load', () => {
    settingsDialog.webContents.send('initialize-store', note.info, note.settings);
  });

  settingsDialog.webContents.on('new-window', (e, _url) => {
    e.preventDefault();
    shell.openExternal(_url);
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
};
