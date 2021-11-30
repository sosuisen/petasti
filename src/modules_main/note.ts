/* eslint-disable dot-notation */
/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import path from 'path';
import fs from 'fs-extra';
import { app, BrowserWindow, nativeImage, Tray } from 'electron';
import {
  Collection,
  CollectionOptions,
  DatabaseOptions,
  Err,
  GitDocumentDB,
  RemoteOptions,
  Sync,
  TaskMetadata,
} from 'git-documentdb';
import { selectPreferredLanguage, translate, Translator } from 'typed-intl';
import { monotonicFactory as monotonicFactoryHmtid } from 'hmtid';
import { ILogObject, Logger } from 'tslog';
import ProgressBar from 'electron-progressbar';
import {
  generateUlid,
  getCardIdFromUrl,
  getCurrentDateAndTime,
  getLocalDateAndTime,
  getNoteIdFromUrl,
} from '../modules_common/utils';
import {
  CardBody,
  CardProperty,
  CardSketch,
  Geometry,
  ICard,
  NoteProp,
  Snapshot,
} from '../modules_common/types';
import {
  defaultDataDir,
  defaultLogDir,
  InfoState,
  initialSettingsState,
  SettingsState,
} from '../modules_common/store.types';
import {
  allMessages,
  availableLanguages,
  defaultLanguage,
  ENGLISH,
  JAPANESE,
  Messages,
} from '../modules_common/i18n';
import { APP_ICON_NAME, APP_SCHEME, SETTINGS_DB_NAME } from '../modules_common/const';

import { showDialog } from './utils_main';
import { initSync } from './sync';
import { MESSAGE, setMessages } from './messages';
import { cacheOfCard } from './card_cache';
import { INote, NoteState } from './note_types';
import { noteStore } from './note_store';
import { noteCreateCreator, noteInitCreator } from './note_action_creator';
import { Card } from './card';
import { closeSettings } from './settings';

const logLevel = 'debug';

export const generateNewNoteId = () => {
  const hmtid = monotonicFactoryHmtid(undefined, '-', true);
  return 'n' + hmtid(Date.now());
};

class Note implements INote {
  constructor () {
    this.logger = new Logger({
      name: 'TreeStickies',
      minLevel: logLevel,
      displayDateTime: true,
      displayFunctionName: false,
      displayFilePath: 'hidden',
    });

    this.logger.attachTransport(
      {
        silly: this._logToTransport,
        debug: this._logToTransport,
        trace: this._logToTransport,
        info: this._logToTransport,
        warn: this._logToTransport,
        error: this._logToTransport,
        fatal: this._logToTransport,
      },
      logLevel
    );
  }

  /**
   * Logger
   */
  logger: Logger;

  private _logToTransport (logObject: ILogObject) {
    const logFileName = 'log.txt';
    fs.appendFileSync(
      defaultLogDir + logFileName,
      `${getLocalDateAndTime(logObject.date.getTime())} [${logObject.logLevel}] ${
        logObject.loggerName
      } ${logObject.argumentsArray[0]}\n`
    );
  }

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

  private _snapshotCollection!: Collection;
  get snapshotCollection (): Collection {
    return this._snapshotCollection;
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

  changingToNoteId = 'none'; // changingToNoteId stores next id while workspace is changing, 'none' or 'exit' or 'restart'

  /**
   * I18n
   */
  private _translations = translate(ENGLISH).supporting('ja', JAPANESE);
  get translations (): Translator<Messages> {
    return this._translations;
  }

  /**
   * Tray
   */
  tray!: Tray;

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
    let startingProgressBar: ProgressBar | undefined;
    try {
      this._settingsDB = new GitDocumentDB({
        localDir: defaultDataDir,
        dbName: SETTINGS_DB_NAME,
        serialize: 'front-matter',
        logLevel,
        logToTransport: this._logToTransport,
        logColorEnabled: false,
      });
      await this._settingsDB.open();

      const loadedSettings = ((await this._settingsDB.get(
        'settings'
      )) as unknown) as SettingsState;
      if (loadedSettings === undefined) {
        await this._settingsDB.put(this._settings);
      }
      else {
        if (loadedSettings.sync.syncAfterChanges === undefined)
          loadedSettings.sync.syncAfterChanges = true;
        this._settings = loadedSettings;
      }

      /**
       * Set i18n from settings
       */
      if (this._settings.language === '') {
        // eslint-disable-next-line require-atomic-updates
        this._settings.language = preferredLanguage;
      }
      selectPreferredLanguage(availableLanguages, [
        this._settings.language,
        defaultLanguage,
      ]);
      this._info.messages = this._translations.messages();
      setMessages(note.info.messages);

      startingProgressBar = new ProgressBar({
        text: MESSAGE('startingAppProgressBarTitle'),
        detail: MESSAGE('loadingNoteProgressBarBody'),
      });
      startingProgressBar.on('completed', () => {
        if (startingProgressBar) startingProgressBar.detail = MESSAGE('completed');
      });

      const bookDbOption: DatabaseOptions & CollectionOptions = {
        localDir: this._settings.dataStorePath,
        dbName: this._settings.currentNotebookName,
        debounceTime: 3000,
        serialize: 'front-matter',
        idGenerator: monotonicFactoryHmtid(undefined, '-', true),
        logLevel,
        logToTransport: this._logToTransport,
        logColorEnabled: false,
      };

      this._bookDB = new GitDocumentDB(bookDbOption);

      const openResult = await this._bookDB.open();
      if (openResult.isNew) {
        const terminalId = generateUlid();
        const userId = generateUlid();
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
        await this._bookDB.saveAuthor();
      }
      else {
        await this._bookDB.loadAuthor();
        // eslint-disable-next-line require-atomic-updates
        this._bookDB.committer = this._bookDB.author;
      }

      this._remoteOptions = {
        remoteUrl: this._settings.sync.remoteUrl,
        connection: this._settings.sync.connection,
        interval: this._settings.sync.interval,
        conflictResolutionStrategy: 'ours-diff',
        live: true,
      };
    } catch (err) {
      if (startingProgressBar) startingProgressBar.close();
      showDialog(undefined, 'error', 'databaseCreateError', (err as Error).message);
      console.log(err);
      app.exit();
    }

    if (!this._settingsDB || !this._bookDB) {
      return [];
    }

    // Create collections
    this._cardCollection = this._bookDB.collection('card');
    this._noteCollection = this._bookDB.collection('note');
    this._snapshotCollection = this._bookDB.collection('snapshot', {
      namePrefix: 's',
    });

    // Load note properties
    let regExpStr = '(';
    for (let i = 0; i < availableLanguages.length; i++) {
      const lang = availableLanguages[i];
      regExpStr += allMessages[lang].residentNoteName;
      if (i === availableLanguages.length - 1) {
        regExpStr += ')';
      }
      else {
        regExpStr += '|';
      }
    }
    const regExpResidentNote = new RegExp(regExpStr, 'i');

    const noteDirList = await this._noteCollection.getCollections();
    const initialNoteState: NoteState = {
      noteMap: new Map(),
      residentNoteId: '',
    };

    let count = 0;
    for (const noteDir of noteDirList) {
      count++;
      // eslint-disable-next-line no-await-in-loop
      const prop: NoteProp = (await noteDir.get('prop')) as NoteProp;
      const pathArr = noteDir.collectionPath.split('/'); // collectionPath is note/nXXXXXX/
      prop._id = pathArr[1]; // Set note id instead of 'prop'.
      initialNoteState.noteMap.set(prop._id, prop);

      if (regExpResidentNote.test(prop.name)) {
        initialNoteState.residentNoteId = prop._id;
        console.log('# resident note: ' + prop._id);
      }

      if (startingProgressBar) {
        startingProgressBar.detail =
          MESSAGE('loadingNoteProgressBarBody') + `(${count}/${noteDirList.length})`;
      }
    }
    noteStore.dispatch(noteInitCreator(initialNoteState));

    if (this.settings.sync.enabled) {
      if (startingProgressBar) {
        // eslint-disable-next-line require-atomic-updates
        startingProgressBar.text = MESSAGE('synchronizingProgressBarTitle');
        // eslint-disable-next-line require-atomic-updates
        startingProgressBar.detail = MESSAGE('synchronizingProgressBarBody');
      }

      try {
        // Need await to sync remote changes correctly
        this._sync = await initSync(this);
      } catch (err) {
        console.error(err);
      }
      /*
      initSync(this)
        .then(sync => (this._sync = sync))
        .catch(err => console.error(err));
        */
    }

    if (startingProgressBar) {
      startingProgressBar.setCompleted();
      setTimeout(() => {
        if (startingProgressBar) startingProgressBar.close();
        startingProgressBar = undefined;
      }, 500);
    }

    return await this.loadCurrentNote();
  };

  /**
   * Note
   */
  getSortedNoteIdList = (): string[] => {
    const sortedNoteIdList = [...noteStore.getState().noteMap.keys()].sort((a, b) => {
      if (
        noteStore.getState().noteMap.get(a)!.name >
        noteStore.getState().noteMap.get(b)!.name
      )
        return 1;
      else if (
        noteStore.getState().noteMap.get(a)!.name <
        noteStore.getState().noteMap.get(b)!.name
      )
        return -1;
      return 0;
    });
    return sortedNoteIdList;
  };

  loadCurrentNote = async (): Promise<CardProperty[]> => {
    // Create note if not exist.
    let createNoteFlag = false;
    let noteName = '';
    if (noteStore.getState().noteMap.size === 0) {
      createNoteFlag = true;
      noteName = MESSAGE('firstNoteName');
    }
    else if (
      this._settings.currentNoteId === undefined ||
      this._settings.currentNoteId === '' ||
      noteStore.getState().noteMap.get(this._settings.currentNoteId) === undefined
    ) {
      this._settings.currentNoteId = this.getSortedNoteIdList()[0];
      await this._settingsDB.put(this._settings);
    }

    if (createNoteFlag) {
      const [currentNoteProp, firstCardProp] = await this.createNote(noteName);

      // eslint-disable-next-line require-atomic-updates
      this._settings.currentNoteId = currentNoteProp._id;
      await this._settingsDB.put(this._settings);

      return [firstCardProp];
    }

    let cards: CardProperty[] = [];
    if (
      noteStore.getState().residentNoteId !== '' &&
      noteStore.getState().residentNoteId !== this._settings.currentNoteId
    ) {
      cards = await this.loadCards(noteStore.getState().residentNoteId);
    }
    cards.push(...(await this.loadCards(this._settings.currentNoteId)));
    return cards;
  };

  createNote = async (
    name?: string,
    waitFirstCardCreation = false
  ): Promise<[NoteProp, CardProperty]> => {
    if (!name || name === '') {
      name = MESSAGE('noteName', (noteStore.getState().noteMap.size + 1).toString());
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
    await noteStore.dispatch(noteCreateCreator(this, newNote));

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

  loadCards = async (noteId: string): Promise<CardProperty[]> => {
    const sketchDocs = await this._noteCollection.find({
      prefix: noteId + '/c',
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
    if (getNoteIdFromUrl(sketchUrl) === note.settings.currentNoteId) {
      cacheOfCard.set(sketchUrl, card);
    }

    await this._createCardBodyDoc(card.body, waitCreation);
    await this._createCardSketchDoc(card.sketch, waitCreation);
    // Update note store & DB
    /*
    const noteId = getNoteIdFromUrl(sketchUrl);
    noteStore.dispatch(
      noteModifiedDateUpdateCreator(this, noteId, card.body.date.modifiedDate)
    );
    */
  };

  updateCard = async (
    sketchUrl: string,
    cardBody: CardBody,
    cardSketch: CardSketch,
    modifiedDate: string
  ): Promise<void> => {
    console.log('updateCard...');
    // Update cacheOfCard
    const card = cacheOfCard.get(sketchUrl);

    await this._updateCardBodyDoc(cardBody);
    if (card) {
      card.body = JSON.parse(JSON.stringify(cardBody));
      card.body.date.modifiedDate = modifiedDate;
    }
    else {
      console.log('Card does not exist in cacheOfCard: ' + sketchUrl);
    }

    await this._updateCardSketchDoc(cardSketch);
    if (card) {
      card.sketch = JSON.parse(JSON.stringify(cardSketch));
      card.sketch.date.modifiedDate = modifiedDate;
    }
    else {
      console.log('Card does not exist in cacheOfCard: ' + sketchUrl);
    }

    // Update note store & DB
    /*
    const noteId = getNoteIdFromUrl(sketchUrl);
    noteStore.dispatch(noteModifiedDateUpdateCreator(this, noteId, modifiedDate));
    */
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
      console.log('Card does not exist in cacheOfCard: ' + sketchUrl);
    }
    const task = await this._updateCardBodyDoc(cardBody);

    // Update note store & DB
    /*
    if (task !== undefined) {
      const noteId = getNoteIdFromUrl(sketchUrl);
      noteStore.dispatch(noteModifiedDateUpdateCreator(this, noteId, modifiedDate));
    }
    */
    return task;
  };

  updateCardGeometry = async (
    sketchUrl: string,
    geometry: Geometry,
    modifiedTime: string
  ): Promise<TaskMetadata | false> => {
    // Update cacheOfCard
    const card = cacheOfCard.get(sketchUrl);
    let sketch: CardSketch;
    if (card) {
      const newJSON = JSON.stringify({ ...card.sketch.geometry, ...geometry });
      if (JSON.stringify(card.sketch.geometry) !== newJSON) {
        card.sketch.geometry = JSON.parse(newJSON);
        card.sketch.date.modifiedDate = modifiedTime;
        sketch = card.sketch;
      }
      else {
        return false;
      }
    }
    else {
      console.log('Card does not exist in cacheOfCard: ' + sketchUrl);
      /*
      sketch = (await this._noteCollection.get(
        getSketchIdFromUrl(sketchUrl)
      )) as CardSketch;
      sketch.geometry = { ...sketch.geometry, ...geometry };
      */
      return false;
    }
    const task: TaskMetadata = await this._updateCardSketchDoc(sketch!);

    // Update note store & DB
    /*
    if (task !== undefined) {
      const noteId = getNoteIdFromUrl(sketchUrl);
      noteStore.dispatch(noteModifiedDateUpdateCreator(this, noteId, modifiedTime));
    }
    */
    return task;
  };

  createCardSketch = async (
    sketchUrl: string,
    cardSketch: CardSketch,
    waitCreation = false
  ): Promise<TaskMetadata> => {
    const task: TaskMetadata = await this._createCardSketchDoc(cardSketch, waitCreation);

    // Update note store & DB
    /*
    const noteId = getNoteIdFromUrl(sketchUrl);
    noteStore.dispatch(
      // @ts-ignore
      noteModifiedDateUpdateCreator(this, noteId, cardSketch.date.modifiedDate)
    );
    */
    return task;
  };

  updateCardSketch = async (
    sketchUrl: string,
    cardSketch: CardSketch,
    modifiedDate: string
  ): Promise<TaskMetadata | false> => {
    // Update cacheOfCard
    const card = cacheOfCard.get(sketchUrl);
    let sketch: CardSketch;
    if (card) {
      const newJSON = JSON.stringify(cardSketch);
      if (JSON.stringify(card.sketch) !== newJSON) {
        card.sketch = JSON.parse(newJSON);
        card.sketch.date.modifiedDate = modifiedDate;
        sketch = card.sketch;
      }
      else {
        return false;
      }
    }
    else {
      console.log('Card does not exist in cacheOfCard: ' + sketchUrl);
      return false;
      /*
      sketch = (await this._noteCollection.get(
        getSketchIdFromUrl(sketchUrl)
      )) as CardSketch;
      */
    }
    const task: TaskMetadata = await this._updateCardSketchDoc(sketch!);

    // Update note store & DB
    /*
    const noteId = getNoteIdFromUrl(sketchUrl);
    noteStore.dispatch(noteModifiedDateUpdateCreator(this, noteId, modifiedDate));
    */
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
      /*
      const noteId = getNoteIdFromUrl(cardUrl);
      noteStore.dispatch(
        noteModifiedDateUpdateCreator(this, noteId, getCurrentDateAndTime())
      );
      */
    }
    else {
      console.error(`${cardUrl} does not exist`);
    }
  };

  /**
   * Database
   */
  combineDB = (target: BrowserWindow | undefined) => {
    showDialog(target, 'info', 'reloadNotebookByCombine');
    note.changingToNoteId = 'restart';
    try {
      // Remove listeners firstly to avoid focus another card in closing process
      closeSettings();
      cacheOfCard.forEach(card => card.removeWindowListenersExceptClosedEvent());
      cacheOfCard.forEach(card => card.window.webContents.send('card-close'));
    } catch (error) {
      console.error(error);
    }
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
          debounceTime: 0,
        })
        .then(() => {
          if (this._sync && this._settings.sync.syncAfterChanges) {
            this._sync.trySync();
          }
        })
        .catch(err => reject(err));
    }).catch((err: Error) => console.log(err.message + ', ' + noteProp._id));
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
        .then(() => {
          if (this._sync && this._settings.sync.syncAfterChanges) {
            this._sync.trySync();
          }
        })
        .catch(err => reject(err));
    }).catch((err: Error) => console.log(err.message + ', ' + noteId + '/prop'));
    return (task as unknown) as TaskMetadata;
  };

  private _createCardBodyDoc = async (
    cardBody: CardBody,
    waitCreation = false
  ): Promise<TaskMetadata> => {
    console.debug(`# Creating card body doc: ${cardBody._id}`);
    if (waitCreation) {
      // Sync
      let task: TaskMetadata;
      await this._cardCollection
        .insert(cardBody, {
          enqueueCallback: (taskMetadata: TaskMetadata) => {
            task = taskMetadata;
          },
        })
        .then(() => {
          if (this._sync && this._settings.sync.syncAfterChanges) {
            this._sync.trySync();
          }
        })
        .catch((err: Error) => console.log(`Error in createCardBodyDoc: ${err.message}`));
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
        .then(() => {
          if (this._sync && this._settings.sync.syncAfterChanges) {
            this._sync.trySync();
          }
        })
        .catch(err => reject(err));
    }).catch((err: Error) => console.log(`Error in createCardBodyDoc: ${err.message}`));
    return (task as unknown) as TaskMetadata;
  };

  private _createCardSketchDoc = async (
    cardSketch: CardSketch,
    waitCreation = false
  ): Promise<TaskMetadata> => {
    console.debug(`# Creating card sketch doc: ${cardSketch._id}`);
    if (waitCreation) {
      // Sync
      let task: TaskMetadata;
      await this._noteCollection
        .insert(cardSketch, {
          enqueueCallback: (taskMetadata: TaskMetadata) => {
            task = taskMetadata;
          },
        })
        .then(() => {
          if (this._sync && this._settings.sync.syncAfterChanges) {
            this._sync.trySync();
          }
        })
        .catch((err: Error) => console.log(`Error in createCardSketchDoc: ${err.message}`));
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
        .then(() => {
          if (this._sync && this._settings.sync.syncAfterChanges) {
            this._sync.trySync();
          }
        })
        .catch(err => reject(err));
    }).catch((err: Error) => console.log(`Error in createCardSketchDoc: ${err.message}`));
    return (task as unknown) as TaskMetadata;
  };

  private _updateCardBodyDoc = async (cardBody: CardBody): Promise<TaskMetadata> => {
    console.debug(`# Updating card body doc: ${cardBody._id}`);
    const task = await new Promise((resolve, reject) => {
      this._cardCollection
        .update(cardBody, {
          enqueueCallback: (taskMetadata: TaskMetadata) => {
            resolve(taskMetadata);
          },
        })
        .then(() => {
          if (this._sync && this._settings.sync.syncAfterChanges) {
            this._sync.trySync();
          }
        })
        .catch(err => {
          // reject(err); // Cannot reject after enqueueCallback invokes. Use throw.
          if (err instanceof Err.TaskCancelError) {
            // console.log('task debounced');
          }
          else {
            throw err;
          }
        });
    }).catch((err: Error) => {
      console.log(`Error in updateCardBodyDoc: ${err.message}`);
      return undefined;
    });
    return (task as unknown) as TaskMetadata;
  };

  private _updateCardSketchDoc = async (cardSketch: CardSketch): Promise<TaskMetadata> => {
    console.debug(`# Updating card sketch doc: ${cardSketch._id}`);
    const task = await new Promise((resolve, reject) => {
      this._noteCollection
        .update(cardSketch, {
          enqueueCallback: (taskMetadata: TaskMetadata) => {
            resolve(taskMetadata);
          },
        })
        .then(() => {
          if (this._sync && this._settings.sync.syncAfterChanges) {
            this._sync.trySync();
          }
        })
        .catch(err => {
          // reject(err); // Cannot reject after enqueueCallback invokes. Use throw.
          if (err instanceof Err.TaskCancelError) {
            // console.log('task debounced');
          }
          else {
            throw err;
          }
        });
    }).catch((err: Error) => {
      console.log(`Error in updateCardSketchDoc: ${err.message}`);
      return undefined;
    });
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
        .then(() => {
          if (this._sync && this._settings.sync.syncAfterChanges) {
            this._sync.trySync();
          }
        })
        .catch(err => reject(err));
    }).catch((err: Error) => console.log(`Error in deletingCardBody: ${err.message}`));
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
        .then(() => {
          if (this._sync && this._settings.sync.syncAfterChanges) {
            this._sync.trySync();
          }
        })
        .catch(err => reject(err));
    }).catch((err: Error) => console.log(`Error in deletingCardBody: ${err.message}`));
    return (task as unknown) as TaskMetadata;
  };

  createSnapshot = async (snap: Snapshot): Promise<void> => {
    await this._snapshotCollection.put(snap);
  };
}

export const note = new Note();
