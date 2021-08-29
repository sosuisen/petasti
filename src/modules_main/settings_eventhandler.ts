/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { BrowserWindow, dialog, ipcMain } from 'electron';
import { selectPreferredLanguage } from 'typed-intl';
import { Sync, SyncResult } from 'git-documentdb';
import { DatabaseCommand } from '../modules_common/db.types';
import { availableLanguages, defaultLanguage, MessageLabel } from '../modules_common/i18n';
import { emitter } from './event';
import { settingsDialog } from './settings';
import { DIALOG_BUTTON } from '../modules_common/const';
import { cacheOfCard } from './card_cache';
import { MESSAGE, setMessages } from './messages';
import { showDialog } from './utils_main';
import { INote } from './note_types';

export const addSettingsHandler = (note: INote) => {
  // Request from settings dialog
  ipcMain.handle('open-directory-selector-dialog', (event, message: string) => {
    return openDirectorySelectorDialog(message);
  });

  ipcMain.handle('open-file-selector-dialog', (event, message: string) => {
    return openFileSelectorDialog(message);
  });

  ipcMain.handle('close-cardio', async event => {
    await note.closeDB();
  });

  // eslint-disable-next-line complexity
  ipcMain.handle('db', async (e, command: DatabaseCommand) => {
    // eslint-disable-next-line default-case
    switch (command.command) {
      case 'db-language-update': {
        note.settings.language = command.data;
        selectPreferredLanguage(availableLanguages, [
          note.settings.language,
          defaultLanguage,
        ]);
        note.info.messages = note.translations.messages();
        setMessages(note.info.messages);
        settingsDialog.webContents.send('update-info', note.info);

        emitter.emit('updateTrayContextMenu');

        await note.settingsDB.put(note.settings);

        break;
      }
      case 'db-data-store-path-update': {
        note.settings.dataStorePath = command.data;

        break;
      }
      case 'db-sync-enabled-update': {
        if (!command.data) {
          if (note.sync !== undefined) {
            note.bookDB.removeSync(note.sync.remoteURL);
            note.sync = undefined;
          }
        }
        note.settings.sync.enabled = command.data;
        await note.settingsDB.put(note.settings);
        break;
      }
      case 'db-sync-remote-url-update': {
        note.settings.sync.remoteUrl = command.data;
        await note.settingsDB.put(note.settings);
        break;
      }
      case 'db-sync-personal-access-token-update': {
        note.settings.sync.connection.personalAccessToken = command.data;
        await note.settingsDB.put(note.settings);
        break;
      }
      case 'db-sync-interval-update': {
        note.settings.sync.interval = command.data;
        if (note.sync !== undefined) {
          note.sync.pause();
          note.sync.resume({ interval: note.settings.sync.interval });
        }
        await note.settingsDB.put(note.settings);
        break;
      }
      case 'db-test-sync': {
        if (note.sync !== undefined) {
          note.bookDB.removeSync(note.sync.remoteURL);
        }
        note.remoteOptions = {
          remoteUrl: note.settings.sync.remoteUrl,
          connection: note.settings.sync.connection,
          interval: note.settings.sync.interval,
          conflictResolutionStrategy: 'ours-diff',
          live: true,
        };
        // eslint-disable-next-line require-atomic-updates
        const syncOrError: [Sync, SyncResult] | Error = await note.bookDB
          .sync(note.remoteOptions, true)
          .catch(err => {
            return err;
          });
        if (syncOrError instanceof Error) {
          return syncOrError.name;
        }
        // eslint-disable-next-line require-atomic-updates
        note.sync = syncOrError[0];
        const syncResult = syncOrError[1];
        if (syncResult.action === 'combine database') {
          await note.combineDB(settingsDialog);
        }
        else {
          settingsDialog.webContents.send('initialize-store', note.info, note.settings);
        }
        return 'succeed';
      }
      case 'db-pause-sync': {
        if (note.sync !== undefined) {
          note.sync.pause();
        }
        break;
      }
      case 'db-resume-sync': {
        if (note.sync !== undefined) {
          note.sync.resume();
        }
        break;
      }
    }
  });
};

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

ipcMain.handle('alert-dialog', (event, url: string, label: MessageLabel) => {
  let win: BrowserWindow;
  if (url === 'settingsDialog') {
    win = settingsDialog;
  }
  else {
    const card = cacheOfCard.get(url);
    if (!card) {
      return;
    }
    win = card.window;
  }
  showDialog(win, 'question', label);
});

ipcMain.handle(
  'confirm-dialog',
  (event, url: string, buttonLabels: MessageLabel[], label: MessageLabel) => {
    let win: BrowserWindow;
    if (url === 'settingsDialog') {
      win = settingsDialog;
    }
    else {
      const card = cacheOfCard.get(url);
      if (!card) {
        return;
      }
      win = card.window;
    }

    const buttons: string[] = buttonLabels.map(buttonLabel => MESSAGE(buttonLabel));
    return dialog.showMessageBoxSync(win, {
      type: 'question',
      buttons: buttons,
      defaultId: DIALOG_BUTTON.default,
      cancelId: DIALOG_BUTTON.cancel,
      message: MESSAGE(label),
    });
  }
);
