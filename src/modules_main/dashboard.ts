/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import path from 'path';
import { app, BrowserWindow, shell } from 'electron';
import { INote } from './note_types';
import { APP_ICON_NAME } from '../modules_common/const';
import { openURL } from './url_schema';

// eslint-disable-next-line import/no-mutable-exports
export let dashboard: BrowserWindow;

export const closeDashboard = () => {
  if (dashboard !== undefined && !dashboard.isDestroyed()) {
    dashboard.close();
  }
};

export const openDashboard = (note: INote) => {
  if (dashboard !== undefined && !dashboard.isDestroyed()) {
    return;
  }

  dashboard = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, './preload_dashboard.js'),
      sandbox: true,
      contextIsolation: true,
    },
    width: 800,
    height: 480,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    transparent: true,
    frame: false,
    icon: path.join(__dirname, '../../assets/' + APP_ICON_NAME),
  });

  dashboard.webContents.on('did-finish-load', () => {
    dashboard.webContents.send('initialize-store', note.info);
  });

  dashboard.loadFile(path.join(__dirname, '../dashboard/dashboard.html'));

  dashboard.webContents.on('new-window', (e, _url) => {
    e.preventDefault();
    openURL(_url);
    // shell.openExternal(_url);
  });

  // hot reload
  if (!app.isPackaged && process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('electron-connect').client.create(dashboard);
    if (process.env.DASHBOARD === 'open') {
      dashboard.webContents.openDevTools();
    }
  }
};
