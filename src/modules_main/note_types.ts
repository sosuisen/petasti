/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { BrowserWindow } from 'electron';
import {
  Collection,
  GitDocumentDB,
  RemoteOptions,
  Sync,
  TaskMetadata,
} from 'git-documentdb';
import { Translator } from 'typed-intl';
import { Messages } from '../modules_common/i18n';
import { InfoState, SettingsState } from '../modules_common/store.types';
import { CardProp, NoteProp } from '../modules_common/types';

export interface INote {
  remoteOptions: RemoteOptions | undefined;
  bookDB: GitDocumentDB;
  settingsDB: GitDocumentDB;

  cardCollection: Collection;
  noteCollection: Collection;
  combineDB: (target: BrowserWindow | undefined) => void;
  settings: SettingsState;
  info: InfoState;

  sync: Sync | undefined;

  translations: Translator<Messages>;

  closeDB: () => Promise<void>;

  updateNoteDoc: (noteProp: NoteProp) => Promise<TaskMetadata>;
  deleteNoteDoc: (noteId: string) => Promise<TaskMetadata>;

  updateCardBody: (prop: CardProp) => Promise<void>;
  updateCardDoc: (prop: CardProp) => Promise<void>;

  deleteCard: (cardUrl: string) => Promise<void>;

  notePropMap: Map<string, NoteProp>;
  getSortedNoteIdList: () => string[];
  changingToNoteId: string;
  createNote: (name?: string) => Promise<NoteProp>;
  getZIndexOfTopCard: (noteId: string) => Promise<number>;
}
