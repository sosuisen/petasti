/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import {
  ChangedFile,
  DuplicatedFile,
  FatJsonDoc,
  JsonDoc,
  Sync,
  TaskMetadata,
} from 'git-documentdb';
import { showDialog } from './utils_main';
import { INote } from './note_types';
import { NoteProp } from '../modules_common/types';
import { currentCardMap } from './card_map';
import { setTrayContextMenu } from './tray';
import { noteStore } from './note_store';
import {
  noteCreateCreator,
  noteDeleteCreator,
  noteInitCreator,
  noteUpdateCreator,
} from './note_action_creator';
import { emitter } from './event';

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

        const card = currentCardMap.get(cardBodyId);
        if (card !== undefined) {
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
      for (const changedFile of changes) {
        let cardId = '';
        let noteId = '';
        let fileId = '';
        if (changedFile.operation === 'insert') {
          cardId = (changedFile.new as FatJsonDoc)._id;
          const idArray = cardId.split('/');
          noteId = idArray[0];
          fileId = idArray[1];
        }
        else if (changedFile.operation === 'update') {
          cardId = (changedFile.new as FatJsonDoc)._id;
          const idArray = cardId.split('/');
          noteId = idArray[0];
          fileId = idArray[1];
        }
        else if (changedFile.operation === 'delete') {
          cardId = (changedFile.old as FatJsonDoc)._id;
          const idArray = cardId.split('/');
          noteId = idArray[0];
          fileId = idArray[1];
        }

        if (fileId === 'prop') {
          if (changedFile.operation === 'insert') {
            const prop = changedFile.new.doc as NoteProp;
            prop._id = noteId; // Set note id instead of 'prop'.
            noteStore.dispatch(
              // @ts-ignore
              noteCreateCreator(note, prop, 'remote')
            );

            setTrayContextMenu();
            currentCardMap.forEach(card => card.resetContextMenu());
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
            currentCardMap.forEach(card => card.resetContextMenu());
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
                currentCardMap.forEach(card => card.resetContextMenu());
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
        else {
          const card = currentCardMap.get(cardId);
          if (card) {
            card.window.webContents.send(
              'sync-card',
              changedFile,
              taskMetadata.enqueueTime
            );
          }
        }
      }
    }
  );

  sync.on('combine', async (duplicatedFiles: DuplicatedFile[]) => {
    await note.combineDB(undefined);
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
