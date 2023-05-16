/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import path from 'path';
import { app, BrowserWindow } from 'electron';
import { JsonDoc } from 'git-documentdb';
import { INote } from './note_types';
import { APP_ICON_NAME } from '../modules_common/const';
import { openURL } from './url_schema';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { electronLocalshortcut } = require('@hfelix/electron-localshortcut');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getCurrentKeyboardLayout, getKeyMap } = require('native-keymap');

electronLocalshortcut.setKeyboardLayout(getCurrentKeyboardLayout(), getKeyMap());

// eslint-disable-next-line import/no-mutable-exports
export let dashboard: BrowserWindow;

export const closeDashboard = (destroy: boolean) => {
  if (dashboard !== undefined && !dashboard.isDestroyed()) {
    if (destroy) {
      dashboard.close();
    }
    else {
      //      dashboard.minimize();
      dashboard.hide();
    }
  }
};

export const openDashboard = (
  note: INote,
  initialCardProp?: JsonDoc,
  minimize?: boolean
): boolean => {
  if (!minimize && dashboard !== undefined && !dashboard.isDestroyed()) {
    // dashboard.restore();
    dashboard.show();
    return false;
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
    title: 'Petasti Dashboard',
    show: false,
    icon: path.join(__dirname, '../../assets/' + APP_ICON_NAME),
  });

  dashboard.webContents.on('did-finish-load', () => {
    dashboard.webContents.send('initialize-store', note.info);
    if (initialCardProp) {
      dashboard.webContents.send('open-card', initialCardProp);
    }
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

  // https://github.com/electron/electron/blob/main/docs/api/accelerator.md
  let opt = 'Alt';
  if (process.platform === 'darwin') {
    opt = 'Option';
  }

  electronLocalshortcut.register(dashboard, 'CmdOrCtrl+R', () => {
    // Disable reload

    // return true to prevent default
    // https://github.com/parro-it/electron-localshortcut/pull/92
    return true;
  });
  /* Close window is not allowed */
  electronLocalshortcut.register(dashboard, 'CmdOrCtrl+W', () => {
    closeDashboard(false);
    return true;
  });

  electronLocalshortcut.register(dashboard, 'CmdOrCtrl+S', () => {
    // Show space list page
    dashboard.webContents.send('select-page', 'space');
  });

  electronLocalshortcut.register(dashboard, 'CmdOrCtrl+K', () => {
    // Show search page
    dashboard.webContents.send('select-page', 'search');
  });

  /* This interfares clearing search field by ESC
  electronLocalshortcut.register(dashboard, 'Escape', () => {
    // Show search page
    dashboard.webContents.send('escape');
  });
  */
  return true;
};
