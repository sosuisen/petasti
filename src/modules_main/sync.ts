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
        if (changedFile.operation === 'insert') {
          cardBodyId = (changedFile.new.doc as JsonDoc)._id;
          // nop
        }
        else if (changedFile.operation === 'update') {
          cardBodyId = (changedFile.new.doc as JsonDoc)._id;
          // TODO: Update body, date of target Card if currentCardMap contains it.
          const card = currentCardMap.get(cardBodyId);
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

  note.noteCollection.onSyncEvent(
    sync,
    'localChange',
    // eslint-disable-next-line complexity
    (changes: ChangedFile[], taskMetadata: TaskMetadata) => {
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
            note.notePropMap.set(noteId, prop);

            setTrayContextMenu();
            currentCardMap.forEach(card => card.resetContextMenu());
          }
          else if (changedFile.operation === 'update') {
            const prop = changedFile.new.doc as NoteProp;
            prop._id = noteId; // Set note id instead of 'prop'.
            // TaskQueue の日時をチェックして、すでに新しい noteProp 修正コマンドが出ていたらそこでキャンセル
            // note.notePropMap.set(noteId, prop);
            // TODO: Update note in context menu on Tray and Card
            // すでに削除されたノートに対する更新は、新規ノート作成
          }
          else if (changedFile.operation === 'delete') {
            // TaskQueue の日時をチェックして、すでに新しい noteProp 修正コマンドが出ていたらそこでキャンセル
            // TODO: First, check cards under the note directory.
            // TODO: If card does not exist:
            // TODO: - Delete background note.
            // TODO: - Delete current note if noteId is currentNoteId
            // TODO: - Delete note in context menu on Tray and Card if exists.
            // コンフリクトに注意。なお ours 戦略なので、こちらでノートの更新日付修正があれば削除はされない。
            // もしカードがある場合は、削除されたノートを復活させる。
          }
        }
        else {
          const card = currentCardMap.get(cardId);
          if (card) {
            card.window.webContents.send('sync-card', changes, taskMetadata);
          }
          /*
        if (changedFile.operation === 'insert') {
          // TODO: Create new Card if noteId is currentNoteId.
          // TODO: Create new note (with default props) if not exits
        }
        else if (changedFile.operation === 'update') {
          // TaskQueue の日時をチェックして、すでに新しい cardProp 修正コマンドが出ていたらそこでキャンセル
          // TODO: Update new Card if noteId is currentNoteId.
          // すでに削除されたノートに対する更新は、新規ノート作成
        }
        else if (changedFile.operation === 'delete') {
          // TaskQueue の日時をチェックして、すでに新しい cardProp 修正コマンドが出ていたらそこでキャンセル
          // TODO: Delete card if noteId is currentNoteId
          // コンフリクトに注意。なお ours 戦略なので、こちらでカードの更新日付修正があれば削除はされない。
        }
        */
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
