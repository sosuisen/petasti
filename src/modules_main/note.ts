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
} from 'git-documentdb';
import { selectPreferredLanguage, translate, Translator } from 'typed-intl';
import { monotonicFactory } from 'ulid';
import {
  generateId,
  getCardIdFromUrl,
  getCurrentDateAndTime,
  getNoteIdFromUrl,
  getSketchIdFromUrl,
} from '../modules_common/utils';
import {
  CardBody,
  CardProperty,
  CardSketch,
  Geometry,
  ICard,
  NoteProp,
} from '../modules_common/types';
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
import { APP_ICON_NAME, APP_SCHEME, SETTINGS_DB_NAME } from '../modules_common/const';

import { handlers } from './event';
import { showDialog } from './utils_main';
import { initSync } from './sync';
import { MESSAGE, setMessages } from './messages';
import { destroyTray, initializeTaskTray } from './tray';
import { cacheOfCard } from './card_cache';
import { INote, NoteState } from './note_types';
import { noteStore } from './note_store';
import {
  noteCreateCreator,
  noteInitCreator,
  noteModifiedDateUpdateCreator,
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
        .createFromPath(path.join(__dirname, '../assets/' + APP_ICON_NAME))
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
  loadNotebook = async (): Promise<CardProperty[]> => {
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

  loadCurrentNote = async (): Promise<CardProperty[]> => {
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

  createNote = async (
    name?: string,
    waitFirstCardCreation = false
  ): Promise<[NoteProp, CardProperty]> => {
    if (!name) {
      name = MESSAGE('noteName', (noteStore.getState().size + 1).toString());
    }
    const noteId = generateNewNoteId();
    const current = getCurrentDateAndTime();

    const newNote: NoteProp = {
      date: {
        createdDate: current,
        modifiedDate: current,
      },
      name,
      user: 'local',
      _id: noteId,
    };
    // tsc cannot check redux-thunk middleware
    // @ts-ignore
    noteStore.dispatch(noteCreateCreator(this, newNote));

    // Add first card
    const firstCard = new Card(this, noteId);
    await note.createCard(firstCard.url, firstCard, waitFirstCardCreation);

    return [
      newNote,
      { url: firstCard.url, body: firstCard.body, sketch: firstCard.sketch },
    ];
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

  loadCurrentCards = async (): Promise<CardProperty[]> => {
    const sketchDocs = await this._noteCollection.find({
      prefix: this._settings.currentNoteId + '/c',
    });

    const getCardProp = async (sketchDoc: CardSketch): Promise<CardProperty> => {
      const url = `${APP_SCHEME}://local/${sketchDoc._id}`; // treestickies://local/noteID/(cardID|noteID)
      const cardId = getCardIdFromUrl(url);
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
      const cardProp: CardProperty = {
        url,
        body: cardBodyDoc as CardBody,
        sketch: sketchDoc as CardSketch,
      };
      return cardProp;
    };
    const getCardProps: Promise<CardProperty>[] = [];
    for (const sketchDoc of sketchDocs) {
      getCardProps.push(getCardProp(sketchDoc as CardSketch));
    }

    const cardProps: CardProperty[] = await Promise.all(getCardProps);
    return cardProps;
  };

  createCard = async (
    sketchUrl: string,
    card: ICard,
    waitCreation = false
  ): Promise<void> => {
    cacheOfCard.set(sketchUrl, card);

    await this._createCardBodyDoc(card.body, waitCreation);
    await this._createCardSketchDoc(card.sketch, waitCreation);
    // Update note store & DB
    const noteId = getNoteIdFromUrl(sketchUrl);
    noteStore.dispatch(
      // @ts-ignore
      noteModifiedDateUpdateCreator(this, noteId, card.body.date.modifiedDate)
    );
  };

  updateCard = async (
    sketchUrl: string,
    cardBody: CardBody,
    cardSketch: CardSketch,
    modifiedDate: string
  ): Promise<void> => {
    // Update cacheOfCard
    const card = cacheOfCard.get(sketchUrl);

    await this._updateCardBodyDoc(cardBody);
    if (card) {
      card.body = JSON.parse(JSON.stringify(cardBody));
      card.body.date.modifiedDate = modifiedDate;
    }
    else {
      console.log('Card does note exist in cacheOfCard: ' + sketchUrl);
    }

    await this._updateCardSketchDoc(cardSketch);
    if (card) {
      card.sketch = JSON.parse(JSON.stringify(cardSketch));
      card.sketch.date.modifiedDate = modifiedDate;
    }
    else {
      console.log('Card does note exist in cacheOfCard: ' + sketchUrl);
    }

    // Update note store & DB
    const noteId = getNoteIdFromUrl(sketchUrl);
    noteStore.dispatch(
      // @ts-ignore
      noteModifiedDateUpdateCreator(this, noteId, modifiedDate)
    );
  };

  updateCardBody = async (
    sketchUrl: string,
    cardBody: CardBody,
    modifiedDate: string
  ): Promise<TaskMetadata> => {
    // Update cacheOfCard
    const card = cacheOfCard.get(sketchUrl);
    if (card) {
      card.body = JSON.parse(JSON.stringify(cardBody));
      card.body.date.modifiedDate = modifiedDate;
    }
    else {
      console.log('Card does note exist in cacheOfCard: ' + sketchUrl);
    }
    const task = await this._updateCardBodyDoc(cardBody);

    // Update note store & DB
    if (task !== undefined) {
      const noteId = getNoteIdFromUrl(sketchUrl);
      noteStore.dispatch(
        // @ts-ignore
        noteModifiedDateUpdateCreator(this, noteId, modifiedDate)
      );
    }
    return task;
  };

  updateCardGeometry = async (
    sketchUrl: string,
    geometry: Geometry,
    modifiedTime: string
  ): Promise<TaskMetadata> => {
    // Update cacheOfCard
    const card = cacheOfCard.get(sketchUrl);
    let sketch: CardSketch;
    if (card) {
      card.sketch.geometry = { ...card.sketch.geometry, ...geometry };
      card.sketch.date.modifiedDate = modifiedTime;
      sketch = card.sketch;
    }
    else {
      console.log('Card does note exist in cacheOfCard: ' + sketchUrl);
      sketch = (await this._noteCollection.get(
        getSketchIdFromUrl(sketchUrl)
      )) as CardSketch;
      sketch.geometry = { ...sketch.geometry, ...geometry };
    }
    const task: TaskMetadata = await this._updateCardSketchDoc(sketch!);

    // Update note store & DB
    if (task !== undefined) {
      const noteId = getNoteIdFromUrl(sketchUrl);
      noteStore.dispatch(
        // @ts-ignore
        noteModifiedDateUpdateCreator(this, noteId, modifiedTime)
      );
    }
    return task;
  };

  createCardSketch = async (
    sketchUrl: string,
    cardSketch: CardSketch,
    waitCreation = false
  ): Promise<TaskMetadata> => {
    const task: TaskMetadata = await this._createCardSketchDoc(cardSketch, waitCreation);

    // Update note store & DB
    const noteId = getNoteIdFromUrl(sketchUrl);
    noteStore.dispatch(
      // @ts-ignore
      noteModifiedDateUpdateCreator(this, noteId, cardSketch.date.modifiedDate)
    );

    return task;
  };

  updateCardSketch = async (
    sketchUrl: string,
    cardSketch: CardSketch,
    modifiedDate: string
  ): Promise<TaskMetadata> => {
    // Update cacheOfCard
    const card = cacheOfCard.get(sketchUrl);
    let sketch: CardSketch;
    if (card) {
      card.sketch = JSON.parse(JSON.stringify(cardSketch));
      card.sketch.date.modifiedDate = modifiedDate;
      sketch = card.sketch;
    }
    else {
      console.log('Card does note exist in cacheOfCard: ' + sketchUrl);
      sketch = (await this._noteCollection.get(
        getSketchIdFromUrl(sketchUrl)
      )) as CardSketch;
    }
    const task: TaskMetadata = await this._updateCardSketchDoc(sketch!);

    // Update note store & DB
    const noteId = getNoteIdFromUrl(sketchUrl);
    noteStore.dispatch(
      // @ts-ignore
      noteModifiedDateUpdateCreator(this, noteId, modifiedDate)
    );

    return task;
  };

  deleteCard = async (cardUrl: string): Promise<void> => {
    await this.deleteCardSketch(cardUrl);
    await this._deleteCardBodyDoc(cardUrl);
  };

  deleteCardSketch = async (cardUrl: string): Promise<void> => {
    const card = cacheOfCard.get(cardUrl);

    if (card !== undefined) {
      if (!card.window.isDestroyed()) {
        card.window.destroy();
      }
      cacheOfCard.delete(cardUrl);
      await this._deleteCardSketchDoc(cardUrl);

      // Update note store & DB
      const noteId = getNoteIdFromUrl(cardUrl);
      noteStore.dispatch(
        // @ts-ignore
        noteModifiedDateUpdateCreator(this, noteId, getCurrentDateAndTime())
      );
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
      cacheOfCard.forEach(card => card.removeWindowListenersExceptClosedEvent());
      cacheOfCard.forEach(card => card.window.webContents.send('card-close'));
    } catch (error) {
      console.error(error);
    }
    await this.closeDB();
    destroyTray();

    handlers.forEach(channel => ipcMain.removeHandler(channel));
    handlers.length = 0; // empty
    cacheOfCard.clear();

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
      // this._sync.trySync();
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
      // this._sync.trySync();
    }
    return (task as unknown) as TaskMetadata;
  };

  private _createCardBodyDoc = async (
    cardBody: CardBody,
    waitCreation = false
  ): Promise<TaskMetadata> => {
    console.debug(`# Saving card body doc: ${cardBody._id}`);
    if (waitCreation) {
      // Sync
      let task: TaskMetadata;
      await this._cardCollection
        .insert(cardBody, {
          enqueueCallback: (taskMetadata: TaskMetadata) => {
            task = taskMetadata;
          },
        })
        .catch((err: Error) => console.log(`Error in createCardBodyDoc: ${err.message}`));
      // Consecutive sync task will be skipped
      if (this._sync) {
        // this._sync.trySync();
      }
      return task!;
    }

    // Async
    const task = await new Promise((resolve, reject) => {
      this._cardCollection
        .insert(cardBody, {
          enqueueCallback: (taskMetadata: TaskMetadata) => {
            resolve(taskMetadata);
          },
        })
        .catch(err => reject(err));
    }).catch((err: Error) => console.log(`Error in createCardBodyDoc: ${err.message}`));
    // Consecutive sync task will be skipped
    if (this._sync) {
      // this._sync.trySync();
    }
    return (task as unknown) as TaskMetadata;
  };

  private _createCardSketchDoc = async (
    cardSketch: CardSketch,
    waitCreation = false
  ): Promise<TaskMetadata> => {
    console.debug(`# Saving card sketch doc: ${cardSketch._id}`);
    if (waitCreation) {
      // Sync
      let task: TaskMetadata;
      await this._noteCollection
        .insert(cardSketch, {
          enqueueCallback: (taskMetadata: TaskMetadata) => {
            task = taskMetadata;
          },
        })
        .catch((err: Error) => console.log(`Error in createCardSketchDoc: ${err.message}`));
      // Consecutive sync task will be skipped
      if (this._sync) {
        // this._sync.trySync();
      }
      return task!;
    }

    // Async
    const task = await new Promise((resolve, reject) => {
      this._noteCollection
        .insert(cardSketch, {
          enqueueCallback: (taskMetadata: TaskMetadata) => {
            resolve(taskMetadata);
          },
        })
        .catch(err => reject(err));
    }).catch((err: Error) => console.log(`Error in createCardSketchDoc: ${err.message}`));
    // Consecutive sync task will be skipped
    if (this._sync) {
      // this._sync.trySync();
    }
    return (task as unknown) as TaskMetadata;
  };

  private _updateCardBodyDoc = async (cardBody: CardBody): Promise<TaskMetadata> => {
    console.debug(`# Saving card body doc: ${cardBody._id}`);
    const task = await new Promise((resolve, reject) => {
      this._cardCollection
        .update(cardBody, {
          enqueueCallback: (taskMetadata: TaskMetadata) => {
            resolve(taskMetadata);
          },
        })
        .catch(err => reject(err));
    }).catch((err: Error) => {
      console.log(`Error in updateCardBodyDoc: ${err.message}`);
      return undefined;
    });
    // Consecutive sync task will be skipped
    if (this._sync) {
      // this._sync.trySync();
    }
    return (task as unknown) as TaskMetadata;
  };

  private _updateCardSketchDoc = async (cardSketch: CardSketch): Promise<TaskMetadata> => {
    console.debug(`# Saving card sketch doc: ${cardSketch._id}`);
    const task = await new Promise((resolve, reject) => {
      this._noteCollection
        .update(cardSketch, {
          enqueueCallback: (taskMetadata: TaskMetadata) => {
            resolve(taskMetadata);
          },
        })
        .catch(err => reject(err));
    }).catch((err: Error) => {
      console.log(`Error in updateCardSketchDoc: ${err.message}`);
      return undefined;
    });
    // Consecutive sync task will be skipped
    if (this._sync) {
      // this._sync.trySync();
    }
    return (task as unknown) as TaskMetadata;
  };

  private _deleteCardBodyDoc = async (url: string): Promise<TaskMetadata> => {
    console.debug(`# Deleting card body doc: ${url}`);
    const task = await new Promise((resolve, reject) => {
      this._cardCollection
        .delete(getCardIdFromUrl(url), {
          enqueueCallback: (taskMetadata: TaskMetadata) => {
            resolve(taskMetadata);
          },
        })
        .catch(err => reject(err));
    }).catch((err: Error) => console.log(`Error in deletingCardBody: ${err.message}`));
    // Consecutive sync task will be skipped
    if (this._sync) {
      // this._sync.trySync();
    }
    return (task as unknown) as TaskMetadata;
  };

  private _deleteCardSketchDoc = async (url: string): Promise<TaskMetadata> => {
    console.debug(`# Deleting card doc: ${url}`);
    const task = await new Promise((resolve, reject) => {
      this._noteCollection
        .delete(getNoteIdFromUrl(url) + '/' + getCardIdFromUrl(url), {
          enqueueCallback: (taskMetadata: TaskMetadata) => {
            resolve(taskMetadata);
          },
        })
        .catch(err => reject(err));
    }).catch((err: Error) => console.log(`Error in deletingCardBody: ${err.message}`));
    // Consecutive sync task will be skipped
    if (this._sync) {
      // this._sync.trySync();
    }
    return (task as unknown) as TaskMetadata;
  };
}

export const note = new Note();
