/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { BrowserWindow, dialog, ipcMain } from 'electron';
import fs, { readJSONSync } from 'fs-extra';
import rimraf from 'rimraf';
import { selectPreferredLanguage } from 'typed-intl';
import {
  CollectionOptions,
  DatabaseOptions,
  GitDocumentDB,
  JsonDoc,
  Sync,
  SyncResult,
} from 'git-documentdb';
import { decodeTime, ulid } from 'ulid';
import { monotonicFactory as monotonicFactoryHmtid } from 'hmtid';
import ProgressBar from 'electron-progressbar';
import { DatabaseCommand } from '../modules_common/db.types';
import { availableLanguages, defaultLanguage, MessageLabel } from '../modules_common/i18n';
import { emitter } from './event';
import { closeSettings, settingsDialog } from './settings';
import { DIALOG_BUTTON, SCHEMA_VERSION } from '../modules_common/const';
import { cacheOfCard } from './card_cache';
import { MESSAGE, setMessages } from './messages';
import { showConfirmDialog, showDialog } from './utils_main';
import { INote } from './note_types';
import { setTrayContextMenu } from './tray';
import { initSync } from './sync';
import { getCurrentDateAndTime } from '../modules_common/utils';

export const addSettingsHandler = (note: INote) => {
  // Request from settings dialog
  ipcMain.handle('open-directory-selector-dialog', (event, message: string) => {
    return openDirectorySelectorDialog(message);
  });

  ipcMain.handle('close-cardio', async event => {
    await note.closeDB();
  });

  // eslint-disable-next-line complexity
  ipcMain.handle('db-settings', async (e, command: DatabaseCommand) => {
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
        else if (note.sync) {
          if (note.settings.sync.remoteUrl !== note.sync.remoteURL) {
            note.bookDB.removeSync(note.sync.remoteURL);
            // eslint-disable-next-line require-atomic-updates
            note.sync = await initSync(note);
          }
          else {
            // nop
          }
        }
        else {
          // eslint-disable-next-line require-atomic-updates
          note.sync = await initSync(note);
        }
        // eslint-disable-next-line require-atomic-updates
        note.settings.sync.enabled = command.data;
        await note.settingsDB.put(note.settings);

        setTrayContextMenu();
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
        const syncOrError: [Sync, SyncResult] | Error = await note.bookDB.sync(
          note.remoteOptions,
          true
        );
        if (syncOrError instanceof Error) {
          return syncOrError.name;
        }
        // eslint-disable-next-line require-atomic-updates
        note.sync = syncOrError[0];
        const syncResult = syncOrError[1];
        if (syncResult.action === 'combine database') {
          // eslint-disable-next-line require-atomic-updates
          note.settings.sync.enabled = true;
          await note.settingsDB.put(note.settings, {
            debounceTime: 0,
          });

          await note.combineDB(settingsDialog);
          return 'combine';
        }
        settingsDialog.webContents.send('initialize-store', note.info, note.settings);
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
      case 'export-data': {
        showDialog(settingsDialog, 'info', 'exportDataAlert');

        const file = openDirectorySelectorDialog(MESSAGE('exportDataButton'));
        if (file) {
          const filepath =
            file[0] +
            '/treestickies_' +
            getCurrentDateAndTime().replace(/\s/g, '_').replace(/:/g, '') +
            '.json';
          exportJSON(filepath);
        }
        break;
      }
      case 'import-data': {
        const file = openFileSelectorDialog(MESSAGE('importDataButton'), [
          { name: 'JSON', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ]);
        if (file) {
          importJSON(file[0]);
        }
        break;
      }
    }
  });

  const exportJSON = async (filepath: string) => {
    if (note.sync && note.sync.options.live) note.sync.pause();

    const cards = await note.bookDB.find({ prefix: 'card/' });
    const notes = await note.bookDB.find({ prefix: 'note/' });
    const snapshots = await note.bookDB.find({ prefix: 'snapshot/' });

    const bookObj = {
      schemaVersion: SCHEMA_VERSION,
      app: note.info.appinfo.name,
      appVersion: note.info.appinfo.version,
      createdDate: getCurrentDateAndTime(),
      cards,
      notes,
      snapshots,
    };

    await fs.writeJSON(filepath, bookObj, { spaces: 2 });

    if (note.sync && note.sync.options.live) note.sync.resume();
  };

  // eslint-disable-next-line complexity
  const importJSON = async (filepath: string) => {
    if (note.sync && note.sync.options.live) note.sync.pause();

    // console.debug('Start import JSON from ' + filepath);
    const jsonObj = readJSONSync(filepath);

    if (jsonObj.schemaVersion !== 0.1) {
      showDialog(settingsDialog, 'error', 'invalidSchemaVersion', jsonObj.schemaVersion);
      return;
    }

    const confirmResult = showConfirmDialog(
      settingsDialog,
      'question',
      ['btnOK', 'btnCancel'],
      'importConfirmation'
    );

    if (confirmResult !== DIALOG_BUTTON.ok) {
      return;
    }

    const sortedCards = (jsonObj.cards as JsonDoc[]).sort((a, b) => {
      if (a._id > b._id) return 1;
      else if (a._id < b._id) return -1;
      return 0;
    });

    const sortedNotes = (jsonObj.notes as JsonDoc[]).sort((a, b) => {
      if (a._id > b._id) return 1;
      else if (a._id < b._id) return -1;
      return 0;
    });

    const sortedSnapshots = (jsonObj.snapshots as JsonDoc[]).sort((a, b) => {
      if (a._id > b._id) return 1;
      else if (a._id < b._id) return -1;
      return 0;
    });

    if (note.settings.sync.enabled) {
      showDialog(settingsDialog, 'info', 'importSyncAlert');
      note.settings.sync.enabled = false;
      await note.settingsDB.put(note.settings, {
        debounceTime: 0,
      });
    }

    const maxValue = sortedCards.length + sortedNotes.length + sortedSnapshots.length;
    const progressBar = new ProgressBar({
      indeterminate: false,
      text: MESSAGE('importingDataProgressBarTitle'),
      detail: MESSAGE('importingDataProgressBarBody'),
      maxValue,
    });
    progressBar
      .on('completed', () => {
        progressBar.detail = MESSAGE('completed');
      })
      // @ts-ignore
      .on('progress', (value: number) => {
        progressBar.detail = MESSAGE(
          'importingDataProgressBarProgress',
          `${value}`,
          `${maxValue}`
        );
      });

    // Create temporary repository
    const tmpNewDbName = 'tmpNew' + ulid();
    const tmpOldWorkingDir = note.bookDB.workingDir + '_' + ulid();
    const bookDbOption: DatabaseOptions & CollectionOptions = {
      localDir: note.settings.dataStorePath,
      dbName: tmpNewDbName,
      debounceTime: 3000,
      logLevel: 'trace',
      serializeFormat: 'front-matter',
    };
    let tmpBookDB: GitDocumentDB | undefined;
    try {
      tmpBookDB = new GitDocumentDB(bookDbOption);
      await tmpBookDB.open();

      // eslint-disable-next-line require-atomic-updates
      tmpBookDB.author = note.bookDB.author;
      // eslint-disable-next-line require-atomic-updates
      tmpBookDB.committer = note.bookDB.committer;
      await tmpBookDB.saveAuthor();

      if (jsonObj.schemaVersion === 0.1) {
        let hmtid = monotonicFactoryHmtid();
        const cardIdMap: Record<string, string> = {};
        sortedCards.forEach(card => {
          const oldId = card._id;
          const newId = 'card/c' + hmtid(decodeTime(oldId.substring(6)));
          card._id = newId;

          cardIdMap[oldId.substring(5)] = newId.substring(5);
        });

        hmtid = monotonicFactoryHmtid();
        const noteIdMap: Record<string, string> = {};
        sortedNotes.forEach(tmpNote => {
          const oldId = tmpNote._id;
          const found = oldId.match(/^note\/(.+?)\/(.+)$/);
          const oldNoteId = found[1];
          let childId = found[2]; // cardId or 'prop'
          if (cardIdMap[childId]) {
            childId = cardIdMap[childId];
          }
          let newNoteId = '';
          if (noteIdMap[oldNoteId]) {
            newNoteId = noteIdMap[oldNoteId];
          }
          else {
            newNoteId = 'n' + hmtid(decodeTime(oldNoteId.substring(1)));
            noteIdMap[oldNoteId] = newNoteId;
          }
          newNoteId = 'note/' + newNoteId;

          const newId = newNoteId + '/' + childId;
          console.log(newId);
          tmpNote._id = newId;
        });

        hmtid = monotonicFactoryHmtid();
        sortedSnapshots.forEach(snapshot => {
          const oldId = snapshot._id;
          const newId = 'snapshot/s' + hmtid(decodeTime(oldId.substring(9)));
          console.log(newId);
          snapshot._id = newId;
          snapshot.createdDate = new Date(decodeTime(oldId.substring(9)))
            .toISOString()
            .replace(/^(.+?)T(.+?)\..+?$/, '$1 $2');
          console.log(snapshot.createdDate);
          (snapshot.cards as JsonDoc[]).forEach(tmpCard => {
            tmpCard._id = cardIdMap[tmpCard._id];
          });

          snapshot.note._id = noteIdMap[snapshot.note._id];
        });
      }

      for (const card of sortedCards) {
        // eslint-disable-next-line no-await-in-loop
        await tmpBookDB.put(card);
        progressBar.value++;
      }

      for (const tmpNote of sortedNotes) {
        // eslint-disable-next-line no-await-in-loop
        await tmpBookDB.put(tmpNote);
        progressBar.value++;
      }

      for (const snapshot of sortedSnapshots) {
        // eslint-disable-next-line no-await-in-loop
        await tmpBookDB.put(snapshot);
        progressBar.value++;
      }

      await tmpBookDB.close();

      await note.bookDB.close();
      await fs.rename(note.bookDB.workingDir, tmpOldWorkingDir);
      await fs.rename(tmpBookDB.workingDir, note.bookDB.workingDir);
      // Removing tmpOldWorkingDir is not important.
      // Exec rimraf asynchronously, do not wait and do not catch errors.
      rimraf(tmpOldWorkingDir, error => {
        console.log(error);
      });
    } catch (err) {
      progressBar.close();
      showDialog(undefined, 'error', 'databaseCreateError', (err as Error).message);
      console.log(err);
      if (fs.existsSync(tmpOldWorkingDir)) {
        // Restore directory names
        if (fs.existsSync(note.bookDB.workingDir)) {
          await fs.rename(note.bookDB.workingDir, tmpBookDB!.workingDir);
        }
        await fs.rename(tmpOldWorkingDir, note.bookDB.workingDir);
      }
      if (tmpBookDB !== undefined) {
        await tmpBookDB.destroy();
      }
      if (note.sync && note.sync.options.live) note.sync.resume();
      return;
    }

    // Restart
    showDialog(settingsDialog, 'info', 'reloadNotebookByCombine');
    // eslint-disable-next-line require-atomic-updates
    note.changingToNoteId = 'restart';
    try {
      // Remove listeners firstly to avoid focus another card in closing process
      closeSettings();
      cacheOfCard.forEach(card => card.removeWindowListenersExceptClosedEvent());
      cacheOfCard.forEach(card => card.window.webContents.send('card-close'));
    } catch (error) {
      console.error(error);
    }
  };
};

const openDirectorySelectorDialog = (message: string) => {
  const file: string[] | undefined = dialog.showOpenDialogSync(settingsDialog, {
    properties: ['openDirectory'],
    title: message,
    message: message, // macOS only
  });
  return file;
};

const openFileSelectorDialog = (message: string, filters: any[]) => {
  const file: string[] | undefined = dialog.showOpenDialogSync(settingsDialog, {
    properties: ['openFile'],
    filters,
    title: message,
    message: message, // macOS only
  });
  return file;
};

ipcMain.handle(
  'alert-dialog',
  (event, url: string, label: MessageLabel, ...msg: string[]) => {
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
    showDialog(win, 'question', label, ...msg);
  }
);

ipcMain.handle(
  'confirm-dialog',
  (
    event,
    url: string,
    buttonLabels: MessageLabel[],
    label: MessageLabel,
    ...msg: string[]
  ) => {
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
    showConfirmDialog(win, 'question', buttonLabels, label, ...msg);
  }
);
