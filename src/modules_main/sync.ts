/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import {
  ChangedFile,
  ChangedFileInsert,
  DuplicatedFile,
  FatJsonDoc,
  JsonDoc,
  Sync,
  TaskMetadata,
} from 'git-documentdb';
import { showDialog } from './utils_main';
import { INote } from './note_types';
import { CardBody, CardSketch, NoteProp } from '../modules_common/types';
import { cacheOfCard } from './card_cache';
import { setTrayContextMenu } from './tray';
import { noteStore } from './note_store';
import {
  noteCreateCreator,
  noteDeleteCreator,
  noteUpdateCreator,
} from './note_action_creator';
import { emitter } from './event';
import { APP_SCHEME } from '../modules_common/const';
import { createCardWindow } from './card';

export const initSync = async (note: INote): Promise<Sync | undefined> => {
  let sync: Sync | undefined;
  if (note.remoteOptions) {
    sync = await note.bookDB.sync(note.remoteOptions).catch(err => {
      showDialog(undefined, 'error', 'syncError', err.message);
      return undefined;
    });
  }

  if (sync === undefined) return undefined;

  note.cardCollection.onSyncEvent(
    sync,
    'localChange',
    (changes: ChangedFile[], taskMetadata: TaskMetadata) => {
      for (const changedFile of changes) {
        let cardBodyId: string;
        if (changedFile.operation === 'insert' || changedFile.operation === 'update') {
          cardBodyId = (changedFile.new.doc as JsonDoc)._id;
        }
        else if (changedFile.operation === 'delete') {
          cardBodyId = (changedFile.old.doc as JsonDoc)._id;
        }

        const card = cacheOfCard.get(cardBodyId!);
        if (card !== undefined) {
          if (changedFile.operation === 'insert' || changedFile.operation === 'update') {
            card.body = changedFile.new.doc as CardBody;
          }
          else if (changedFile.operation === 'delete') {
            card.body._body = '';
          }

          card.window.webContents.send(
            'sync-card-body',
            changedFile,
            taskMetadata.enqueueTime
          );
        }
      }
    }
  );

  note.noteCollection.onSyncEvent(
    sync,
    'localChange',
    // eslint-disable-next-line complexity
    async (changes: ChangedFile[], taskMetadata: TaskMetadata) => {
      const propChanges: ChangedFile[] = [];
      for (const changedFile of changes) {
        let sketchId = '';
        if (changedFile.operation === 'insert' || changedFile.operation === 'update') {
          sketchId = (changedFile.new as FatJsonDoc)._id;
        }
        else {
          sketchId = (changedFile.old as FatJsonDoc)._id;
        }
        const [noteId, cardId] = sketchId.split('/');

        if (cardId === 'prop') {
          // Update note property
          propChanges.push(changedFile);
        }
        else {
          // Update card sketch
          const card = cacheOfCard.get(sketchId);
          if (changedFile.operation === 'insert') {
            // Create card
            if (note.settings.currentNoteId === noteId) {
              const url = `${APP_SCHEME}://local/${sketchId}`;
              // eslint-disable-next-line no-await-in-loop
              const cardBody = await note.cardCollection.get(cardId);
              createCardWindow(note, url, cardBody!, changedFile.new.doc as CardSketch);
            }
          }
          else if (changedFile.operation === 'update') {
            if (card) {
              card.sketch = (changedFile.new as unknown) as CardSketch;
              card.window.webContents.send(
                'sync-card-sketch',
                changedFile,
                taskMetadata.enqueueTime
              );
            }
          }
          else if (changedFile.operation === 'delete') {
            if (card) {
              // Can delete.
              // Delete from remote is superior to update from renderer.
              const url = `${APP_SCHEME}://local/${sketchId}`;
              note.deleteCardSketch(url);
            }
          }
        }
      }

      // Update note property
      for (const changedFile of propChanges) {
        let sketchId = '';
        if (changedFile.operation === 'insert' || changedFile.operation === 'update') {
          sketchId = (changedFile.new as FatJsonDoc)._id;
        }
        else {
          sketchId = (changedFile.old as FatJsonDoc)._id;
        }
        const [noteId] = sketchId.split('/');

        if (changedFile.operation === 'insert') {
          const prop = changedFile.new.doc as NoteProp;
          prop._id = noteId; // Set note id instead of 'prop'.
          noteStore.dispatch(
            // @ts-ignore
            noteCreateCreator(note, prop, 'remote')
          );

          setTrayContextMenu();
          cacheOfCard.forEach(card => card.resetContextMenu());
        }
        else if (changedFile.operation === 'update') {
          const prop = changedFile.new.doc as NoteProp;
          prop._id = noteId; // Set note id instead of 'prop'.
          // Deleted note will be created again.
          // Expired update will be skipped.
          noteStore.dispatch(
            // @ts-ignore
            noteUpdateCreator(note, prop, 'remote', taskMetadata.enqueueTime)
          );

          setTrayContextMenu();
          cacheOfCard.forEach(card => card.resetContextMenu());
        }
        else if (changedFile.operation === 'delete') {
          // eslint-disable-next-line no-await-in-loop
          const cardDocs = await note.noteCollection.find({
            prefix: noteId + '/c',
          });
          if (cardDocs.length === 0) {
            // Expired update will be skipped.
            noteStore.dispatch(
              // @ts-ignore
              noteDeleteCreator(note, noteId, 'remote', taskMetadata.enqueueTime)
            );
            if (noteId === note.settings.currentNoteId) {
              note.settings.currentNoteId = note.getSortedNoteIdList()[0];
              emitter.emit('change-note', note.settings.currentNoteId);
              // setTrayContextMenu() will be called in change-note event.
            }
            else {
              setTrayContextMenu();
              cacheOfCard.forEach(card => card.resetContextMenu());
            }
          }
          else {
            // Card exists. Revert deleted note
            note.noteCollection
              .getOldRevision(noteId, 0, {
                filter: [{ author: { name: note.bookDB.author.name } }],
              })
              .then(revertedNote => {
                if (revertedNote) {
                  note.noteCollection.put(revertedNote);
                }
                else throw new Error('backNumber does not found');
              })
              .then(() => {
                if (sync) {
                  sync.trySync();
                }
              })
              .catch((err: Error) => console.log(err.message));
            break;
          }
        }
      }
    }
  );

  sync.on('combine', async (duplicatedFiles: DuplicatedFile[]) => {
    await note.combineDB(undefined);
  });

  sync.on('start', () => {
    console.log('# Start sync...');
    // mainWindow.webContents.send('sync-start');
  });

  sync.on('complete', () => {
    console.log('# Sync completed.');
    // mainWindow.webContents.send('sync-complete');
  });

  sync.on('error', (err: Error) => {
    console.log('# Sync error: ' + err);
    // mainWindow.webContents.send('sync-complete');
  });

  return sync;
};
