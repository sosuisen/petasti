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
import { currentCardMap } from './card_map';
import { MESSAGE, setMessages } from './messages';
import { showDialog } from './utils_main';
import { INoteStore } from './note_store_types';

export const addSettingsHandler = (noteStore: INoteStore) => {
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
        setMessages(noteStore.info.messages);
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
      case 'db-test-sync': {
        if (noteStore.sync !== undefined) {
          noteStore.bookDB.removeSync(noteStore.sync.remoteURL);
        }
        noteStore.remoteOptions = {
          remoteUrl: noteStore.settings.sync.remoteUrl,
          connection: noteStore.settings.sync.connection,
          interval: noteStore.settings.sync.interval,
          conflictResolutionStrategy: 'ours-diff',
          live: true,
        };
        console.log(noteStore.remoteOptions);
        // eslint-disable-next-line require-atomic-updates
        const syncOrError: [Sync, SyncResult] | Error = await noteStore.bookDB
          .sync(noteStore.remoteOptions, true)
          .catch(err => {
            return err;
          });
        if (syncOrError instanceof Error) {
          return syncOrError.name;
        }
        // eslint-disable-next-line require-atomic-updates
        noteStore.sync = syncOrError[0];
        const syncResult = syncOrError[1];
        if (syncResult.action === 'combine database') {
          await noteStore.combineDB(settingsDialog);
        }
        else {
          settingsDialog.webContents.send(
            'initialize-store',
            noteStore.info,
            noteStore.settings
          );
        }
        return 'succeed';
      }
      case 'db-pause-sync': {
        if (noteStore.sync !== undefined) {
          noteStore.sync.pause();
        }
        break;
      }
      case 'db-resume-sync': {
        if (noteStore.sync !== undefined) {
          noteStore.sync.resume();
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
    const card = currentCardMap.get(url);
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
      const card = currentCardMap.get(url);
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
