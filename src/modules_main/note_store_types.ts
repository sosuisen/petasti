/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { BrowserWindow } from 'electron';
import { Collection, GitDocumentDB, RemoteOptions, Sync } from 'git-documentdb';
import { Translator } from 'typed-intl';
import { Messages } from '../modules_common/i18n';
import { InfoState, SettingsState } from '../modules_common/store.types';
import { CardProp, NoteProp } from '../modules_common/types';

export interface INoteStore {
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

  deleteNoteDoc: (noteId: string) => Promise<void>;
  updateNoteDoc: (noteProp: NoteProp) => Promise<void>;
  notePropMap: Map<string, NoteProp>;
  getSortedNoteIdList: () => string[];
  changingToNoteId: string;
  updateCardDoc: (prop: CardProp) => Promise<void>;
  updateSketchDoc: (prop: CardProp) => Promise<void>;
  createNote: (name?: string) => Promise<NoteProp>;
  deleteSketch: (sketchUrl: string) => Promise<void>;
  getZIndexOfTopCard: (noteId: string) => Promise<number>;
}
