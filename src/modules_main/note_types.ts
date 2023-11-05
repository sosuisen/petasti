/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import { BrowserWindow, Rectangle, Tray } from 'electron';
import {
  GitDocumentDB,
  ICollection,
  JsonDoc,
  RemoteOptions,
  Sync,
  TaskMetadata,
} from 'git-documentdb';
import { Translator } from 'typed-intl';
import { Logger } from 'tslog';
import { Messages } from '../modules_common/i18n';
import { InfoState, SettingsState } from '../modules_common/store.types';
import {
  CardBody,
  CardProperty,
  CardSketch,
  ICard,
  NoteProp,
  Snapshot,
  ZOrder,
} from '../modules_common/types';

export type NoteState = Map<string, NoteProp>;

export interface INote {
  remoteOptions: RemoteOptions | undefined;
  bookDB: GitDocumentDB;
  settingsDB: GitDocumentDB;

  currentZOrder: ZOrder;

  selectedCards: string[];

  shiftDown: boolean;
  ctrlDown: boolean;
  altDown: boolean;
  metaDown: boolean;

  logger: Logger;

  cardCollection: ICollection;
  noteCollection: ICollection;
  combineDB: (target: BrowserWindow | undefined) => void;
  settings: SettingsState;
  info: InfoState;

  sync: Sync | undefined;

  tray: Tray;

  translations: Translator<Messages>;

  closeDB: () => Promise<void>;

  updateNoteZOrder: () => Promise<void>;
  updateNoteDoc: (noteProp: NoteProp) => Promise<TaskMetadata>;
  deleteNoteDoc: (noteId: string) => Promise<TaskMetadata>;

  createCard: (
    sketchUrl: string,
    card: ICard,
    waitCreation?: boolean,
    updateDB?: boolean
  ) => Promise<void>;
  updateCard: (
    sketchUrl: string,
    cardBody: CardBody,
    cardSketch: CardSketch,
    modifiedDate: string
  ) => Promise<void>;
  updateCardBody: (
    sketchUrl: string,
    cardBody: CardBody,
    modifiedDate: string
  ) => Promise<TaskMetadata>;
  createCardSketch: (
    sketchUrl: string,
    cardSketch: CardSketch,
    waitCreation?: boolean
  ) => Promise<TaskMetadata>;
  updateCardSketch: (
    sketchUrl: string,
    cardSketch: CardSketch,
    modifiedDate: string
  ) => Promise<TaskMetadata | false>;
  createSnapshot: (snap: Snapshot) => Promise<void>;

  deleteCardSketch: (cardUrl: string) => Promise<void>;

  getSortedNoteIdList: () => string[];
  changingToNoteId: string;
  changingToNoteFocusedSketchId: string;
  createNote: (
    name?: string,
    waitFirstCardCreation?: boolean
  ) => Promise<[NoteProp, CardProperty]>;
  calcVacantLand: (
    parentRect: Rectangle,
    childRect: Rectangle,
    xOffset?: number,
    yOffset?: number
  ) => Rectangle;

  rebuildSearchIndex: () => Promise<void>;

  // To avoid dependency cycle
  openDashboardProxy: (
    note: INote,
    initialCardProp?: JsonDoc,
    minimize?: boolean
  ) => boolean;
  closeDashboardProxy: (destroy: boolean) => void;
  dashboardProxy: () => BrowserWindow;
}
