/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import path from 'path';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { selectPreferredLanguage } from 'typed-intl';
import { noteStore } from './note_store';
import { DatabaseCommand } from '../modules_common/db.types';
import { availableLanguages, defaultLanguage } from '../modules_common/i18n';
import { emitter } from './event';

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

// Request from settings dialog
ipcMain.handle('open-directory-selector-dialog', (event, message: string) => {
  return openDirectorySelectorDialog(message);
});

ipcMain.handle('open-file-selector-dialog', (event, message: string) => {
  return openFileSelectorDialog(message);
});

ipcMain.handle('close-cardio', async event => {
  await noteStore.closeDB();
});

// eslint-disable-next-line complexity
ipcMain.handle('db', async (e, command: DatabaseCommand) => {
  // eslint-disable-next-line default-case
  switch (command.command) {
    case 'db-language-update': {
      noteStore.settings.language = command.data;
      selectPreferredLanguage(availableLanguages, [
        noteStore.settings.language,
        defaultLanguage,
      ]);
      noteStore.info.messages = noteStore.translations.messages();
      settingsDialog.webContents.send('update-info', noteStore.info);

      emitter.emit('updateTrayContextMenu');

      await noteStore.settingsDB.put(noteStore.settings);

      break;
    }
    case 'db-data-store-path-update': {
      noteStore.settings.dataStorePath = command.data;

      break;
    }
    case 'db-sync-enabled-update': {
      if (!command.data) {
        if (noteStore.sync !== undefined) {
          noteStore.bookDB.removeSync(noteStore.sync.remoteURL);
          noteStore.sync = undefined;
        }
      }
      noteStore.settings.sync.enabled = command.data;
      await noteStore.settingsDB.put(noteStore.settings);
      break;
    }
    case 'db-sync-remote-url-update': {
      noteStore.settings.sync.remoteUrl = command.data;
      await noteStore.settingsDB.put(noteStore.settings);
      break;
    }
    case 'db-sync-personal-access-token-update': {
      noteStore.settings.sync.connection.personalAccessToken = command.data;
      await noteStore.settingsDB.put(noteStore.settings);
      break;
    }
    case 'db-sync-interval-update': {
      noteStore.settings.sync.interval = command.data;
      if (noteStore.sync !== undefined) {
        noteStore.sync.pause();
        noteStore.sync.resume({ interval: noteStore.settings.sync.interval });
      }
      await noteStore.settingsDB.put(noteStore.settings);
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
