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
import {
  CardBody,
  CardProperty,
  CardSketch,
  Geometry,
  NoteProp,
} from '../modules_common/types';

export type NoteState = Map<string, NoteProp>;

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

  updateCard: (
    sketchUrl: string,
    cardBody: CardBody,
    cardSketch: CardSketch
  ) => Promise<void>;
  updateCardBody: (sketchUrl: string, cardBody: CardBody) => Promise<TaskMetadata>;
  updateCardGeometry: (sketchUrl: string, geometry: Geometry) => Promise<TaskMetadata>;
  updateCardSketch: (sketchUrl: string, cardSketch: CardSketch) => Promise<TaskMetadata>;

  deleteCardSketch: (cardUrl: string) => Promise<void>;

  getSortedNoteIdList: () => string[];
  changingToNoteId: string;
  createNote: (name?: string) => Promise<[NoteProp, CardProperty]>;
  getZIndexOfTopCard: (noteId: string) => Promise<number>;
}
