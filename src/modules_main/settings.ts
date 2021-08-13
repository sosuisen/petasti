/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import path from 'path';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { selectPreferredLanguage } from 'typed-intl';
import { mainStore } from './store';
import { DatabaseCommand } from '../modules_common/db.types';
import { availableLanguages, defaultLanguage } from '../modules_common/i18n';

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

  // hot reload
  if (!app.isPackaged && process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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
  await mainStore.closeDB();
});

// eslint-disable-next-line complexity
ipcMain.handle('db', async (e, command: DatabaseCommand) => {
  // eslint-disable-next-line default-case
  switch (command.command) {
    case 'db-language-update': {
      mainStore.settings.language = command.data;
      selectPreferredLanguage(availableLanguages, [
        mainStore.settings.language,
        defaultLanguage,
      ]);
      mainStore.info.messages = mainStore.translations.messages();
      // mainWindow.webContents.send('update-info', info);
      await mainStore.settingsDB.put(mainStore.settings);
      break;
    }
    case 'db-data-store-path-update': {
      mainStore.settings.dataStorePath = command.data;

      break;
    }
    case 'db-sync-remote-url-update': {
      if (command.data === '') {
        if (mainStore.sync !== undefined) {
          mainStore.bookDB.removeSync(mainStore.sync.remoteURL);
          mainStore.sync = undefined;
        }
      }
      mainStore.settings.sync.remoteUrl = command.data;
      await mainStore.settingsDB.put(mainStore.settings);
      break;
    }
    case 'db-sync-personal-access-token-update': {
      mainStore.settings.sync.connection.personalAccessToken = command.data;
      await mainStore.settingsDB.put(mainStore.settings);
      break;
    }
    case 'db-sync-interval-update': {
      mainStore.settings.sync.interval = command.data;
      if (mainStore.sync !== undefined) {
        mainStore.sync.pause();
        mainStore.sync.resume({ interval: mainStore.settings.sync.interval });
      }
      await mainStore.settingsDB.put(mainStore.settings);
      break;
    }
  }
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
