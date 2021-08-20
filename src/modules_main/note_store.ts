/* eslint-disable dot-notation */
/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import path from 'path';

import { app, dialog, nativeImage } from 'electron';
import {
  Collection,
  DatabaseOptions,
  GitDocumentDB,
  RemoteOptions,
  Sync,
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
import { CardDoc, CardProp, NoteProp, SketchDoc } from '../modules_common/types';
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
  MessageLabel,
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

export const generateNewNoteId = () => {
  const ulid = monotonicFactory();
  return 'n' + ulid(Date.now());
};

class NoteStore {
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
  private _cardCollection!: Collection;

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
  private _notePropMap: Map<string, NoteProp> = new Map();
  get notePropMap (): Map<string, NoteProp> {
    return this._notePropMap;
  }

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
        schema: {
          json: {
            plainTextProperties: {
              name: true,
            },
          },
        },
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

      if (
        this._settings.sync.remoteUrl &&
        this._settings.sync.connection.personalAccessToken
      ) {
        this._remoteOptions = {
          remoteUrl: this._settings.sync.remoteUrl,
          connection: this._settings.sync.connection,
          interval: this._settings.sync.interval,
          conflictResolutionStrategy: 'ours-diff',
          live: true,
        };
      }
    } catch (err) {
      showErrorDialog('databaseCreateError', err.message);
      console.log(err);
      app.exit();
    }

    if (!this._settingsDB || !this._bookDB) {
      return [];
    }

    if (this._remoteOptions) {
      this._sync = await this._bookDB.sync(this._remoteOptions).catch(err => {
        showErrorDialog('syncError', err.message);
        return undefined;
      });
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

    // Create collections
    this._cardCollection = this._bookDB.collection('card');
    this._noteCollection = this._bookDB.collection('note');

    // Load note properties
    const noteDirList = await this._noteCollection.getCollections();
    for (const noteDir of noteDirList) {
      // eslint-disable-next-line no-await-in-loop
      const prop: NoteProp = (await noteDir.get('prop')) as NoteProp;
      const pathArr = noteDir.collectionPath.split('/'); // collectionPath is note/nXXXXXX/
      prop._id = pathArr[1]; // Set note id instead of 'prop'.
      this._notePropMap.set(prop._id, prop);
    }

    return await this.loadCurrentNote();

    // setSyncEvents();
  };

  getSortedNoteIdList = (): string[] => {
    const sortedNoteIdList = [...this._notePropMap.keys()].sort((a, b) => {
      if (this._notePropMap.get(a)!.name > this._notePropMap.get(b)!.name) return 1;
      else if (this._notePropMap.get(a)!.name < this._notePropMap.get(b)!.name) return -1;
      return 0;
    });
    return sortedNoteIdList;
  };

  loadCurrentNote = async (): Promise<CardProp[]> => {
    // Create note if not exist.

    let createNoteFlag = false;
    if (this._notePropMap.size === 0) {
      createNoteFlag = true;
    }
    else if (
      this._settings.currentNoteId === undefined ||
      this._settings.currentNoteId === ''
    ) {
      this._settings.currentNoteId = this.getSortedNoteIdList()[0];
      await this._settingsDB.put(this._settings);
    }
    else if (this._notePropMap.get(this._settings.currentNoteId) === undefined) {
      createNoteFlag = true;
    }

    if (createNoteFlag) {
      const currentNoteProp = await this.createNote();
      // eslint-disable-next-line require-atomic-updates
      this._settings.currentNoteId = currentNoteProp._id;
      await this._settingsDB.put(this._settings);

      const firstCardProp: CardProp = {
        version: CARD_VERSION,
        url: `${APP_SCHEME}://local/${currentNoteProp._id}/${generateNewCardId()}`,
        type: 'text/html',
        user: 'local',
        geometry: DEFAULT_CARD_GEOMETRY,
        style: DEFAULT_CARD_STYLE,
        condition: DEFAULT_CARD_CONDITION,
        date: {
          createdDate: getCurrentDateAndTime(),
          modifiedDate: getCurrentDateAndTime(),
        },
        _body: '',
      };

      // Async
      this.updateCardDoc(firstCardProp);
      this.updateSketchDoc(firstCardProp);
      return [firstCardProp];
    }
    console.log('# currentNoteId: ' + this._settings.currentNoteId);
    return await this.loadCurrentCards();
  };

  deleteNoteDoc = async (noteId: string) => {
    await this._noteCollection.delete(noteId + '/prop');
  };

  updateNoteDoc = async (noteProp: NoteProp) => {
    await this._noteCollection.put(noteProp._id + '/prop', noteProp);
  };

  createNote = async (name?: string): Promise<NoteProp> => {
    if (!name) {
      name = MESSAGE('noteName', (this._notePropMap.size + 1).toString());
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
    await this.updateNoteDoc(newNote);

    this._notePropMap.set(newNote._id, newNote);

    return newNote;
  };

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

  // ! Operations for cards
  /**
   * Card
   */
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

  closeDB = async () => {
    if (this._settingsDB !== undefined) {
      await this._settingsDB.close();
    }
    if (!this._bookDB !== undefined) {
      return this._bookDB.close();
    }
    return Promise.resolve();
  };

  updateCardDoc = async (prop: CardProp): Promise<void> => {
    console.debug(`# Saving card doc: ${prop.url}`);
    const cardId = getCardIdFromUrl(prop.url);
    const cardDoc: CardDoc = {
      version: prop.version,
      type: prop.type,
      user: prop.user,
      date: prop.date,
      _body: prop._body,
      _id: cardId,
    };
    await this._cardCollection.put(cardDoc).catch(e => {
      throw new Error(`Error in updateCardDoc: ${e.message}`);
    });
  };

  updateSketchDoc = async (prop: CardProp): Promise<void> => {
    console.debug(`# Saving sketch doc: ${prop.url}`);
    const cardId = getCardIdFromUrl(prop.url);
    const noteCardDoc: SketchDoc = {
      geometry: prop.geometry,
      style: prop.style,
      condition: prop.condition,
      _id: getNoteIdFromUrl(prop.url) + '/' + cardId,
    };
    await this._noteCollection.put(noteCardDoc).catch(e => {
      throw new Error(`Error in updateSketchDoc: ${e.message}`);
    });
    const noteId = getNoteIdFromUrl(prop.url);
    const noteProp = this._notePropMap.get(noteId);
    if (noteProp !== undefined) {
      noteProp.date.modifiedDate = getCurrentDateAndTime();
      await this.updateNoteDoc(noteProp);
    }
    else {
      throw new Error(`Error in updateSketchDoc: note ${noteId} does not exist.`);
    }
  };

  deleteCardDoc = async (url: string) => {
    console.debug(`# Deleting card doc: ${url}`);
    await this._cardCollection.delete(getCardIdFromUrl(url)).catch(e => {
      throw new Error(`Error in deletingCardDoc: ${e.message}`);
    });
  };

  deleteSketchDoc = async (url: string) => {
    console.debug(`# Deleting sketch doc: ${url}`);
    await this._noteCollection
      .delete(getNoteIdFromUrl(url) + '/' + getCardIdFromUrl(url))
      .catch(e => {
        throw new Error(`Error in deletingSketchDoc: ${e.message}`);
      });

    const noteId = getNoteIdFromUrl(url);
    const noteProp = this._notePropMap.get(noteId);
    if (noteProp !== undefined) {
      noteProp.date.modifiedDate = getCurrentDateAndTime();
      await this.updateNoteDoc(noteProp);
    }
    else {
      throw new Error(`Error in deleteSketchDoc: note ${noteId} does not exist.`);
    }
  };
}

export const noteStore = new NoteStore();

const showErrorDialog = (label: MessageLabel, msg: string) => {
  dialog.showMessageBoxSync({
    type: 'error',
    buttons: ['OK'],
    message: MESSAGE(label) + '(' + msg + ')',
  });
};

// Utility for i18n
export const MESSAGE = (label: MessageLabel, ...args: string[]) => {
  let message: string = noteStore.info.messages[label];
  if (args) {
    args.forEach((replacement, index) => {
      const variable = '$' + (index + 1); // $1, $2, ...
      message = message.replace(variable, replacement);
    });
  }
  return message;
};
