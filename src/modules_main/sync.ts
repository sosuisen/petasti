/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { ChangedFile, DuplicatedFile, Sync, TaskMetadata } from 'git-documentdb';
import { showDialog } from './utils_main';
import { INoteStore } from './note_store_types';

export const initSync = async (noteStore: INoteStore): Promise<Sync | undefined> => {
  let sync: Sync | undefined;
  if (noteStore.remoteOptions) {
    sync = await noteStore.bookDB.sync(noteStore.remoteOptions).catch(err => {
      showDialog(undefined, 'error', 'syncError', err.message);
      return undefined;
    });
  }

  if (sync === undefined) return undefined;

  noteStore.cardCollection.onSyncEvent(
    sync,
    'localChange',
    (changes: ChangedFile[], taskMetadata: TaskMetadata) => {
      // mainWindow.webContents.send('sync-item', changes, taskMetadata);
    }
  );

  noteStore.noteCollection.onSyncEvent(
    sync,
    'localChange',
    (changes: ChangedFile[], taskMetadata: TaskMetadata) => {
      // mainWindow.webContents.send('sync-item', changes, taskMetadata);
    }
  );

  sync.on('combine', async (duplicatedFiles: DuplicatedFile[]) => {
    await noteStore.combineDB(undefined);
  });

  sync.on('start', () => {
    // mainWindow.webContents.send('sync-start');
  });

  sync.on('complete', () => {
    // mainWindow.webContents.send('sync-complete');
  });

  sync.on('error', () => {
    // mainWindow.webContents.send('sync-complete');
  });

  return sync;
};
