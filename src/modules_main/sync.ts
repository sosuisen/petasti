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
import { INoteStore } from './note_store_types';
import { NoteProp } from '../modules_common/types';
import { currentCardMap } from './card_map';

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
      for (const changedFile of changes) {
        let cardBodyId: string;
        if (changedFile.operation === 'insert') {
          cardBodyId = (changedFile.new.doc as JsonDoc)._id;
          // nop
        }
        else if (changedFile.operation === 'update') {
          cardBodyId = (changedFile.new.doc as JsonDoc)._id;
          // TODO: Update body, date of target Card if currentCardMap contains it.
          const card = currentCardMap.get(cardBodyId);
          if (card && taskMetadata.enqueueTime > card.bodyLastUpdate) {
            card.bodyLastUpdate = taskMetadata.enqueueTime;
            card._body = (changedFile.new.doc as JsonDoc)._body;
            card.date.createdDate = (changedFile.new.doc as JsonDoc).date.created_date;
            card.date.modifiedDate = (changedFile.new.doc as JsonDoc).date.modified_date;
            card.version = (changedFile.new.doc as JsonDoc).date.version;
            card.type = (changedFile.new.doc as JsonDoc).date.type;
            card.user = (changedFile.new.doc as JsonDoc).date.user;
            // 
          }

        }
        else if (changedFile.operation === 'delete') {
          cardBodyId = (changedFile.old.doc as JsonDoc)._id;
          // TODO: Delete body of target Card if currentCardMap contains it.
          // TaskQueue の日時をチェックして、すでに新しい _body 修正コマンドが出ていたらそこでキャンセル
          // かつ、削除されたカードに対する更新は、カードを作成する仕様とする必要がある。
        }
      }
    }
  );

  noteStore.noteCollection.onSyncEvent(
    sync,
    'localChange',
    // eslint-disable-next-line complexity
    (changes: ChangedFile[], taskMetadata: TaskMetadata) => {
      for (const changedFile of changes) {
        let cardBodyId: string;
        let noteId: string;
        let fileId: string;
        if (changedFile.operation === 'insert') {
          cardBodyId = (changedFile.new as FatJsonDoc)._id;
          const idArray = cardBodyId.split('/');
          noteId = idArray[0];
          fileId = idArray[1];
        }
        else if (changedFile.operation === 'update') {
          cardBodyId = (changedFile.new as FatJsonDoc)._id;
          const idArray = cardBodyId.split('/');
          noteId = idArray[0];
          fileId = idArray[1];
        }
        else if (changedFile.operation === 'delete') {
          cardBodyId = (changedFile.old as FatJsonDoc)._id;
          const idArray = cardBodyId.split('/');
          noteId = idArray[0];
          fileId = idArray[1];
        }

        if (changedFile.operation === 'insert') {
          if (fileId === 'prop') {
            const prop = changedFile.new.doc as NoteProp;
            prop._id = noteId; // Set note id instead of 'prop'.
            noteStore.notePropMap.set(noteId, prop);
            // TODO: Add new note into context menu on Tray and Card
            // TODO: Update if already exists
          }
          else {
            // TODO: Create new Card if noteId is currentNoteId.
            // TODO: Create new note (with default props) if not exits
          }
        }
        else if (changedFile.operation === 'update') {
          if (fileId === 'prop') {
            const prop = changedFile.new.doc as NoteProp;
            prop._id = noteId; // Set note id instead of 'prop'.
            // TaskQueue の日時をチェックして、すでに新しい noteProp 修正コマンドが出ていたらそこでキャンセル
            // noteStore.notePropMap.set(noteId, prop);
            // TODO: Update note in context menu on Tray and Card
          }
          else {
            // TaskQueue の日時をチェックして、すでに新しい cardProp 修正コマンドが出ていたらそこでキャンセル
            // TODO: Update new Card if noteId is currentNoteId.
          }
        }
        else if (changedFile.operation === 'delete') {
          if (fileId === 'prop') {
            // TaskQueue の日時をチェックして、すでに新しい noteProp 修正コマンドが出ていたらそこでキャンセル
            // TODO: First, check cards under the note directory.
            // TODO: If card does not exist:
            // TODO: - Delete background note.
            // TODO: - Delete current note if noteId is currentNoteId
            // TODO: - Delete note in context menu on Tray and Card if exists.
            // コンフリクトに注意。なお ours 戦略なので、こちらでノートの更新日付修正があれば削除はされない。
            // もしカードがある場合は、削除されたノートを復活させる。
          }
          else {
            // TaskQueue の日時をチェックして、すでに新しい cardProp 修正コマンドが出ていたらそこでキャンセル
            // TODO: Delete card if noteId is currentNoteId
            // コンフリクトに注意。なお ours 戦略なので、こちらでカードの更新日付修正があれば削除はされない。
          }
        }
      }
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
