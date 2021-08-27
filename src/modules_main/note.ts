/* eslint-disable dot-notation */
/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import path from 'path';

import { app, BrowserWindow, ipcMain, nativeImage } from 'electron';
import {
  Collection,
  DatabaseOptions,
  GitDocumentDB,
  RemoteOptions,
  Sync,
  TaskMetadata,
  TaskQueue,
} from 'git-documentdb';
import { selectPreferredLanguage, translate, Translator } from 'typed-intl';
import { monotonicFactory } from 'ulid';
import {
  generateId,
  generateNewCardId,
  getCardIdFromUrl,
  getCurrentDateAndTime,
  getNoteIdFromUrl,
} from '../modules_common/utils';
import { CardBody, CardProp, CardSketch, NoteProp } from '../modules_common/types';
import {
  defaultDataDir,
  InfoState,
  initialSettingsState,
  SettingsState,
} from '../modules_common/store.types';
import {
  availableLanguages,
  defaultLanguage,
  ENGLISH,
  JAPANESE,
  Messages,
} from '../modules_common/i18n';
import {
  APP_SCHEME,
  CARD_VERSION,
  DEFAULT_CARD_CONDITION,
  DEFAULT_CARD_GEOMETRY,
  DEFAULT_CARD_STYLE,
  SETTINGS_DB_NAME,
} from '../modules_common/const';

import { handlers } from './event';
import { showDialog } from './utils_main';
import { initSync } from './sync';
import { MESSAGE, setMessages } from './messages';
import { destroyTray, initializeTaskTray } from './tray';
import { currentCardMap } from './card_map';
import { INote, NoteState } from './note_types';
import { noteStore } from './note_store';
import {
  noteCreateCreator,
  noteInitCreator,
  noteUpdateCreator,
} from './note_action_creator';
import { Card } from './card';

export const generateNewNoteId = () => {
  const ulid = monotonicFactory();
  return 'n' + ulid(Date.now());
};

class Note implements INote {
  constructor () {}
  /**
   * GitDocumentDB
   */
  private _bookDB!: GitDocumentDB;
  get bookDB (): GitDocumentDB {
    return this._bookDB;
  }

  private _settingsDB!: GitDocumentDB;
  get settingsDB (): GitDocumentDB {
    return this._settingsDB;
  }

  private _noteCollection!: Collection;
  get noteCollection (): Collection {
    return this._noteCollection;
  }

  private _cardCollection!: Collection;
  get cardCollection (): Collection {
    return this._cardCollection;
  }

  /**
   * Sync
   */
  remoteUrl = '';
  private _sync: Sync | undefined;
  get sync (): Sync | undefined {
    return this._sync;
  }

  set sync (sync: Sync | undefined) {
    this._sync = sync;
  }

  private _remoteOptions: RemoteOptions | undefined;
  get remoteOptions (): RemoteOptions | undefined {
    return this._remoteOptions;
  }

  set remoteOptions (options: RemoteOptions | undefined) {
    this._remoteOptions = options;
  }

  private _settings: SettingsState = initialSettingsState;
  get settings (): SettingsState {
    return this._settings;
  }

  /**
   * Info
   */
  private _info: InfoState = {
    messages: ENGLISH,
    appinfo: {
      name: app.getName(),
      version: app.getVersion(),
      iconDataURL: nativeImage
        // .ico cannot be loaded in ubuntu
        //  .createFromPath(path.resolve(__dirname, '../assets/tree-stickies-icon.ico'))
        .createFromPath(path.resolve(__dirname, '../assets/tree-stickies-icon-128x128.png'))
        .toDataURL(),
    },
  };

  get info (): InfoState {
    return this._info;
  }

  /**
   * Note
   */

  changingToNoteId = 'none'; // changingToNoteId stores next id while workspace is changing, 'none' or 'exit'

  /**
   * I18n
   */
  private _translations = translate(ENGLISH).supporting('ja', JAPANESE);
  get translations (): Translator<Messages> {
    return this._translations;
  }

  /**
   * loadNoteBook
   */
  // eslint-disable-next-line complexity
  loadNotebook = async (): Promise<CardProp[]> => {
    // locale can be got after 'ready'
    const myLocale = app.getLocale();
    console.debug(`locale: ${myLocale}`);
    let preferredLanguage: string = defaultLanguage;
    if (availableLanguages.includes(myLocale)) {
      preferredLanguage = myLocale;
    }
    // Set i18n from locale (for initial error)
    selectPreferredLanguage(availableLanguages, [preferredLanguage]);

    // Set i18n from locale (for initial errors)
    this._info.messages = this._translations.messages();
    setMessages(this._info.messages);

    // Open databases
    try {
      this._settingsDB = new GitDocumentDB({
        localDir: defaultDataDir,
        dbName: SETTINGS_DB_NAME,
      });
      await this._settingsDB.open();

      const loadedSettings = ((await this._settingsDB.get(
        'settings'
      )) as unknown) as SettingsState;
      if (loadedSettings === undefined) {
        await this._settingsDB.put(this._settings);
      }
      else {
        this._settings = loadedSettings;
      }

      const bookDbOption: DatabaseOptions = {
        localDir: this._settings.dataStorePath,
        dbName: this._settings.currentNotebookName,
      };

      this._bookDB = new GitDocumentDB(bookDbOption);

      const openResult = await this._bookDB.open();
      if (openResult.isNew) {
        const terminalId = generateId();
        const userId = generateId();
        const author = {
          name: userId,
          email: terminalId + '@localhost',
        };
        const committer = {
          name: userId,
          email: terminalId + '@localhost',
        };
        // eslint-disable-next-line require-atomic-updates
        this._bookDB.author = author;
        // eslint-disable-next-line require-atomic-updates
        this._bookDB.committer = committer;
        this._bookDB.saveAuthor();
      }
      else {
        this._bookDB.loadAuthor();
        // eslint-disable-next-line require-atomic-updates
        this._bookDB.committer = this._bookDB.author;
      }

      if (this._settings.sync.enabled) {
        this._remoteOptions = {
          remoteUrl: this._settings.sync.remoteUrl,
          connection: this._settings.sync.connection,
          interval: this._settings.sync.interval,
          conflictResolutionStrategy: 'ours-diff',
          live: true,
        };
      }
    } catch (err) {
      showDialog(undefined, 'error', 'databaseCreateError', err.message);
      console.log(err);
      app.exit();
    }

    if (!this._settingsDB || !this._bookDB) {
      return [];
    }

    if (this._settings.language === '') {
      // eslint-disable-next-line require-atomic-updates
      this._settings.language = preferredLanguage;
    }

    /**
     * Set i18n from settings
     */
    selectPreferredLanguage(availableLanguages, [this._settings.language, defaultLanguage]);
    this._info.messages = this._translations.messages();
    setMessages(note.info.messages);

    // Create collections
    this._cardCollection = this._bookDB.collection('card');
    this._noteCollection = this._bookDB.collection('note');

    // Load note properties
    const noteDirList = await this._noteCollection.getCollections();
    const initialNoteState: NoteState = new Map();
    for (const noteDir of noteDirList) {
      // eslint-disable-next-line no-await-in-loop
      const prop: NoteProp = (await noteDir.get('prop')) as NoteProp;
      const pathArr = noteDir.collectionPath.split('/'); // collectionPath is note/nXXXXXX/
      prop._id = pathArr[1]; // Set note id instead of 'prop'.
      initialNoteState.set(prop._id, prop);
    }
    noteStore.dispatch(noteInitCreator(initialNoteState));

    this._sync = await initSync(this);

    return await this.loadCurrentNote();
  };

  /**
   * Note
   */
  getSortedNoteIdList = (): string[] => {
    const sortedNoteIdList = [...noteStore.getState().keys()].sort((a, b) => {
      if (noteStore.getState().get(a)!.name > noteStore.getState().get(b)!.name) return 1;
      else if (noteStore.getState().get(a)!.name < noteStore.getState().get(b)!.name)
        return -1;
      return 0;
    });
    return sortedNoteIdList;
  };

  loadCurrentNote = async (): Promise<CardProp[]> => {
    // Create note if not exist.
    let createNoteFlag = false;
    if (noteStore.getState().size === 0) {
      createNoteFlag = true;
    }
    else if (
      this._settings.currentNoteId === undefined ||
      this._settings.currentNoteId === ''
    ) {
      this._settings.currentNoteId = this.getSortedNoteIdList()[0];
      await this._settingsDB.put(this._settings);
    }
    else if (noteStore.getState().get(this._settings.currentNoteId) === undefined) {
      createNoteFlag = true;
    }

    if (createNoteFlag) {
      const [currentNoteProp, firstCardProp] = await this.createNote();

      // eslint-disable-next-line require-atomic-updates
      this._settings.currentNoteId = currentNoteProp._id;
      await this._settingsDB.put(this._settings);

      return [firstCardProp];
    }
    console.log('# currentNoteId: ' + this._settings.currentNoteId);
    return await this.loadCurrentCards();
  };

  createNote = async (name?: string): Promise<[NoteProp, CardProp]> => {
    if (!name) {
      name = MESSAGE('noteName', (noteStore.getState().size + 1).toString());
    }
    const _id = generateNewNoteId();
    const current = getCurrentDateAndTime();

    const newNote: NoteProp = {
      date: {
        createdDate: current,
        modifiedDate: current,
      },
      name,
      user: 'local',
      _id,
    };
    // tsc cannot check redux-thunk middleware
    // @ts-ignore
    noteStore.dispatch(noteCreateCreator(this, newNote));

    // Add first card
    const firstCard = new Card(this, _id);
    const firstCardProp = firstCard.toObject();
    await note.updateCard(firstCardProp);

    return [newNote, firstCardProp];
  };

  updateNoteDoc = async (noteProp: NoteProp): Promise<TaskMetadata> => {
    const serializingProp = JSON.parse(JSON.stringify(noteProp));
    delete serializingProp.updatedTime;

    const task = await new Promise((resolve, reject) => {
      this._noteCollection
        .put(noteProp._id + '/prop', serializingProp, {
          enqueueCallback: (taskMetadata: TaskMetadata) => {
            resolve(taskMetadata);
          },
        })
        .catch(err => reject(err));
    }).catch((err: Error) => console.log(err.message + ', ' + noteProp._id));
    if (this._sync) {
      this._sync.trySync();
    }
    return (task as unknown) as TaskMetadata;
  };

  deleteNoteDoc = async (noteId: string): Promise<TaskMetadata> => {
    const task = await new Promise((resolve, reject) => {
      this._noteCollection
        .delete(noteId + '/prop', {
          enqueueCallback: (taskMetadata: TaskMetadata) => {
            resolve(taskMetadata);
          },
        })
        .catch(err => reject(err));
    }).catch((err: Error) => console.log(err.message + ', ' + noteId + '/prop'));
    if (this._sync) {
      this._sync.trySync();
    }
    return (task as unknown) as TaskMetadata;
  };

  /**
   * Card
   */
  getZIndexOfTopCard = async (noteId: string) => {
    const cardDocs = await this._noteCollection.find({
      prefix: noteId + '/c',
    });
    let maxZIndex: number | undefined;
    cardDocs.forEach(cardDoc => {
      if (maxZIndex === undefined || cardDoc.geometry.z > maxZIndex)
        maxZIndex = cardDoc.geometry.z;
    });
    if (maxZIndex === undefined) return 0;
    return maxZIndex;
  };

  loadCurrentCards = async (): Promise<CardProp[]> => {
    const cardDocs = await this._noteCollection.find({
      prefix: this._settings.currentNoteId + '/c',
    });

    const cardProps: CardProp[] = [];
    for (const cardDoc of cardDocs) {
      const url = `${APP_SCHEME}://local/${cardDoc._id}`; // treestickies://local/noteID/(cardID|noteID)
      const cardId = getCardIdFromUrl(url);
      // eslint-disable-next-line no-await-in-loop
      let cardBodyDoc = await this._cardCollection.get(cardId);
      if (cardBodyDoc === undefined) {
        const current = getCurrentDateAndTime();
        cardBodyDoc = {
          _body: '',
          date: {
            createDate: current,
            modifiedDate: current,
          },
        };
      }
      const cardProp: CardProp = {
        url,
        type: cardBodyDoc.type,
        user: cardBodyDoc.user,
        geometry: cardDoc.geometry,
        style: cardDoc.style,
        condition: cardDoc.condition,
        date: {
          createdDate: cardBodyDoc.date.createdDate,
          modifiedDate: cardBodyDoc.date.modifiedDate,
        },
        version: cardBodyDoc.version,
        _body: cardBodyDoc._body,
      };

      cardProps.push(cardProp);
    }
    return cardProps;
  };

  updateCard = async (prop: CardProp): Promise<void> => {
    const cardBody = await this._updateCardBodyDoc(prop);
    const cardSketch = await this._updateCardSketchDoc(prop);

    // Update currentCardMap
    const card = currentCardMap.get(prop.url);
    if (card) {
      card.version = cardBody.version;
      card.type = cardBody.type;
      card.user = cardBody.user;
      card.date = cardBody.date;
      card._body = cardBody._body;

      card.geometry = cardSketch.geometry;
      card.style = cardSketch.style;
      card.condition = cardSketch.condition;
    }
    else {
      console.log('Card does note exist in currentCardMap: ' + prop.url);
    }

    // Update note store & DB
    const noteId = getNoteIdFromUrl(prop.url);
    const noteProp = noteStore.getState().get(noteId);
    if (noteProp !== undefined) {
      noteProp.date.modifiedDate = getCurrentDateAndTime();
      // @ts-ignore
      noteStore.dispatch(noteUpdateCreator(this, noteProp));
    }
    else {
      console.log(`Note ${noteId} does not exist.`);
    }
  };

  updateCardBody = async (prop: CardProp): Promise<void> => {
    const cardBody = await this._updateCardBodyDoc(prop);

    // Update currentCardMap
    const card = currentCardMap.get(prop.url);
    if (card) {
      card.version = cardBody.version;
      card.type = cardBody.type;
      card.user = cardBody.user;
      card.date = cardBody.date;
      card._body = cardBody._body;
    }
    else {
      console.log('Card does note exist in currentCardMap: ' + prop.url);
    }

    // Update note store & DB
    const noteId = getNoteIdFromUrl(prop.url);
    const noteProp = noteStore.getState().get(noteId);
    if (noteProp !== undefined) {
      noteProp.date.modifiedDate = getCurrentDateAndTime();
      // @ts-ignore
      noteStore.dispatch(noteUpdateCreator(this, noteProp));
    }
    else {
      console.log(`Note ${noteId} does not exist.`);
    }
  };

  updateCardSketch = async (prop: CardProp): Promise<void> => {
    const cardSketch = await this._updateCardSketchDoc(prop);

    // Update currentCardMap
    const card = currentCardMap.get(prop.url);
    if (card) {
      card.geometry = cardSketch.geometry;
      card.style = cardSketch.style;
      card.condition = cardSketch.condition;
    }
    else {
      console.log('Card does note exist in currentCardMap: ' + prop.url);
    }

    // Update note store & DB
    const noteId = getNoteIdFromUrl(prop.url);
    const noteProp = noteStore.getState().get(noteId);
    if (noteProp !== undefined) {
      noteProp.date.modifiedDate = getCurrentDateAndTime();
      // @ts-ignore
      noteStore.dispatch(noteUpdateCreator(this, noteProp));
    }
    else {
      console.log(`Note ${noteId} does not exist.`);
    }
  };

  deleteCard = async (cardUrl: string) => {
    await this.deleteCardSketch(cardUrl);
    await this._deleteCardBodyDoc(cardUrl);
  };

  deleteCardSketch = async (cardUrl: string) => {
    const card = currentCardMap.get(cardUrl);

    if (card !== undefined) {
      if (!card.window.isDestroyed()) {
        card.window.destroy();
      }
      await this._deleteCardSketchDoc(cardUrl);
      currentCardMap.delete(cardUrl);

      // Update note store & DB
      const noteId = getNoteIdFromUrl(cardUrl);
      const noteProp = noteStore.getState().get(noteId);
      if (noteProp !== undefined) {
        noteProp.date.modifiedDate = getCurrentDateAndTime();
        // @ts-ignore
        noteStore.dispatch(noteUpdateCreator(this, noteProp));
      }
      else {
        throw new Error(`Error in deleteCardSketch: note ${noteId} does not exist.`);
      }
    }
    else {
      console.error(`${cardUrl} does not exist`);
    }
  };

  /**
   * Database
   */
  combineDB = async (target: BrowserWindow | undefined) => {
    showDialog(target, 'info', 'reloadNotebookByCombine');

    try {
      // Remove listeners firstly to avoid focus another card in closing process
      currentCardMap.forEach(card => card.removeWindowListenersExceptClosedEvent());
      currentCardMap.forEach(card => card.window.webContents.send('card-close'));
    } catch (error) {
      console.error(error);
    }
    await this.closeDB();
    destroyTray();

    handlers.forEach(channel => ipcMain.removeHandler(channel));
    handlers.length = 0; // empty
    currentCardMap.clear();

    initializeTaskTray(this);
  };

  closeDB = async () => {
    if (this._settingsDB !== undefined) {
      await this._settingsDB.close();
    }
    if (!this._bookDB !== undefined) {
      return this._bookDB.close();
    }
    return Promise.resolve();
  };

  private _updateCardBodyDoc = async (prop: CardProp): Promise<CardBody> => {
    console.debug(`# Saving card body doc: ${prop.url}`);
    const cardId = getCardIdFromUrl(prop.url);
    const cardBodyDoc: CardBody = {
      version: prop.version,
      type: prop.type,
      user: prop.user,
      date: prop.date,
      _body: prop._body,
      _id: cardId,
    };
    await this._cardCollection.put(cardBodyDoc).catch(e => {
      throw new Error(`Error in updateCardBodyDoc: ${e.message}`);
    });

    return cardBodyDoc;
  };

  private _updateCardSketchDoc = async (prop: CardProp): Promise<CardSketch> => {
    console.debug(`# Saving card sketch doc: ${prop.url}`);
    const cardId = getCardIdFromUrl(prop.url);
    const cardSketch: CardSketch = {
      geometry: prop.geometry,
      style: prop.style,
      condition: prop.condition,
      _id: getNoteIdFromUrl(prop.url) + '/' + cardId,
    };
    await this._noteCollection.put(cardSketch).catch(e => {
      throw new Error(`Error in updateCardSketchDoc: ${e.message}`);
    });
    return cardSketch;
  };

  private _deleteCardBodyDoc = async (url: string) => {
    console.debug(`# Deleting card body doc: ${url}`);
    await this._cardCollection.delete(getCardIdFromUrl(url)).catch(e => {
      throw new Error(`Error in deletingCardBody: ${e.message}`);
    });
  };

  private _deleteCardSketchDoc = async (url: string) => {
    console.debug(`# Deleting card doc: ${url}`);
    await this._noteCollection
      .delete(getNoteIdFromUrl(url) + '/' + getCardIdFromUrl(url))
      .catch(e => {
        throw new Error(`Error in deletingCardSketchDoc: ${e.message}`);
      });
  };
}

export const note = new Note();
