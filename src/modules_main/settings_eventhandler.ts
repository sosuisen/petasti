/**
 * Petasti
 * © 2023 Hidekazu Kubota
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
import { cacheOfCard, closeAllCards } from './card_cache';
import { MESSAGE, setMessages } from './messages';
import { showConfirmDialog, showDialog } from './utils_main';
import { INote } from './note_types';
import { setTrayContextMenu } from './tray';
import { initSync } from './sync';
import { getCurrentDateAndTime } from '../modules_common/utils';
import { defaultDataDir } from '../modules_common/store.types';
import { Geometry } from '../modules_common/types';
import { closeDashboard, dashboard } from './dashboard';

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
        if (!dashboard.isDestroyed()) {
          dashboard.webContents.send('update-info', note.info);
        }

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
      case 'db-sync-after-changes-update': {
        note.settings.sync.syncAfterChanges = command.data;
        await note.settingsDB.put(note.settings);
        break;
      }
      case 'db-save-zorder-update': {
        note.settings.saveZOrder = command.data;
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
            '/petasti_' +
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
      case 'rebuild-index': {
        await note.rebuildSearchIndex();
        await note.cardCollection.serializeIndex();
        await note.noteCollection.serializeIndex();
        break;
      }
    }
  });

  const exportJSON = async (filepath: string) => {
    if (note.sync && note.sync.options.live) note.sync.pause();

    // Select only related files.
    const cards = await note.bookDB.find({ prefix: 'card/c' });
    const notes = await note.bookDB.find({ prefix: 'note/n' });
    const filteredNotes: JsonDoc[] = notes.filter(sketch => {
      if (sketch._id.match(/^note\/n.+?\/c.+$/) || sketch._id.match(/^note\/n.+?\/prop$/))
        return true;
      return false;
    });
    const snapshots = await note.bookDB.find({ prefix: 'snapshot/s' });
    const bookObj = {
      schemaVersion: SCHEMA_VERSION,
      app: note.info.appinfo.name,
      appVersion: note.info.appinfo.version,
      createdDate: getCurrentDateAndTime(),
      cards,
      notes: filteredNotes,
      snapshots,
    };

    await fs.writeJSON(filepath, bookObj, { spaces: 2 });

    if (note.sync && note.sync.options.live) note.sync.resume();

    showDialog(settingsDialog, 'info', 'completed');
  };

  // eslint-disable-next-line complexity
  const importJSON = async (filepath: string) => {
    if (note.sync && note.sync.options.live) note.sync.pause();

    // console.debug('Start import JSON from ' + filepath);
    const jsonObj = readJSONSync(filepath);

    if (jsonObj.schemaVersion < 0.5) {
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
    const tmpNewSettingsName = 'tmpNewSettings' + ulid();
    const tmpOldSettingsWorkingDir = note.settingsDB.workingDir + '_' + ulid();
    let tmpSettingsDB: GitDocumentDB | undefined;

    const tmpNewDbName = 'tmpNewBook' + ulid();
    const tmpOldWorkingDir = note.bookDB.workingDir + '_' + ulid();
    let tmpBookDB: GitDocumentDB | undefined;
    try {
      /**
       * Import settings
       */
      const settingsDbOption: DatabaseOptions & CollectionOptions = {
        localDir: defaultDataDir,
        dbName: tmpNewSettingsName,
        serialize: 'front-matter',
        logLevel: 'trace',
      };

      tmpSettingsDB = new GitDocumentDB(settingsDbOption);
      await tmpSettingsDB.open();

      // eslint-disable-next-line require-atomic-updates
      tmpSettingsDB.author = note.settingsDB.author;
      // eslint-disable-next-line require-atomic-updates
      tmpSettingsDB.committer = note.settingsDB.committer;
      await tmpSettingsDB.saveAuthor();
      const settings = await note.settingsDB.get('settings');
      await tmpSettingsDB.put(settings!);

      await tmpSettingsDB.close();

      await note.settingsDB.close();
      await fs.rename(note.settingsDB.workingDir, tmpOldSettingsWorkingDir);
      await fs.rename(tmpSettingsDB.workingDir, note.settingsDB.workingDir);
      // Removing tmpOldWorkingDir is not important.
      // Exec rimraf asynchronously, do not wait and do not catch errors.
      rimraf(tmpOldSettingsWorkingDir, error => {
        console.log(error);
      });

      const bookDbOption: DatabaseOptions & CollectionOptions = {
        localDir: note.settings.dataStorePath,
        dbName: tmpNewDbName,
        logLevel: 'trace',
        serialize: 'front-matter',
      };

      /**
       * Import book
       */
      tmpBookDB = new GitDocumentDB(bookDbOption);
      await tmpBookDB.open();

      // eslint-disable-next-line require-atomic-updates
      tmpBookDB.author = note.bookDB.author;
      // eslint-disable-next-line require-atomic-updates
      tmpBookDB.committer = note.bookDB.committer;
      await tmpBookDB.saveAuthor();

      if (jsonObj.schemaVersion <= 0.6) {
        for (const tmpNote of sortedNotes) {
          tmpNote.zOrder = [];
        }
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

      if (fs.existsSync(tmpOldSettingsWorkingDir)) {
        // Restore directory names
        if (fs.existsSync(note.settingsDB.workingDir)) {
          await fs.rename(note.settingsDB.workingDir, tmpSettingsDB!.workingDir);
        }
        await fs.rename(tmpOldSettingsWorkingDir, note.settingsDB.workingDir);
      }
      if (tmpSettingsDB !== undefined) {
        await tmpSettingsDB.destroy();
      }

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
      closeSettings();
      closeDashboard(true);
      closeAllCards(note);
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
      if (!card || !card.window) {
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
      if (!card || !card.window) {
        return;
      }
      win = card.window;
    }
    showConfirmDialog(win, 'question', buttonLabels, label, ...msg);
  }
);
