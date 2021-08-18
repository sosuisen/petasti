/* eslint-disable dot-notation */
/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import path from 'path';
import { nanoid } from 'nanoid';

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
import { getIdFromUrl } from '../modules_common/avatar_url_utils';
import { generateId, getCurrentDateAndTime } from '../modules_common/utils';
import { CardProp, Geometry2D, GeometryXY, NoteProp } from '../modules_common/types';
import {
  AvatarDepthUpdateAction,
  AvatarPositionUpdateAction,
  AvatarSizeUpdateAction,
  PersistentStoreAction,
} from '../modules_common/actions';
import { emitter } from './event';
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
import { APP_SCHEME, SETTINGS_DB_NAME } from '../modules_common/const';

export const generateNewNoteId = () => {
  const ulid = monotonicFactory();
  return 'n' + ulid(Date.now());
};

class MainStore {
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
      const sortedNotePropList = [...this._notePropMap.keys()].sort((a, b) => {
        if (this._notePropMap.get(a)!.name > this._notePropMap.get(b)!.name) return 1;
        else if (this._notePropMap.get(a)!.name < this._notePropMap.get(b)!.name) return -1;
        return 0;
      });
      this._settings.currentNoteId = sortedNotePropList[0];
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
    }

    console.log('# currentNoteId: ' + this._settings.currentNoteId);

    return await this.loadCurrentCards();
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
    await this._noteCollection.put(newNote);

    return newNote;
  };

  updateWorkspace = async (workspaceId: string, note: NoteProp) => {
    /*
  const wsObj: { _id: string; _rev: string } & Workspace = {
    _id: workspaceId,
    _rev: '',
    ...workspace,
  };
  await workspaceDB
    .get(workspaceId)
    .then(oldWS => {
      // Update existing card
      wsObj._rev = oldWS._rev;
    })
    .catch(e => {
      throw new Error(`Error in updateWorkspace: ${e.message}`);
    });

  return workspaceDB
    .put(wsObj)
    .then(res => {
      console.debug(`Workspace saved: ${res.id}`);
    })
    .catch(e => {
      throw new Error(`Error in updateWorkspace: ${e.message}`);
    });
  */
  };

  deleteWorkspace = async (workspaceId: string) => {
    /*
  const workspace = await workspaceDB.get(workspaceId);
  await workspaceDB.remove(workspace).catch(e => {
    throw new Error(`Error in deleteWorkspace: ${e}`);
  });
  */
  };

  updateWorkspaceStatus = async () => {
    /*
  const currentId = await workspaceDB.get('currentId').catch(() => undefined);
  let currentIdRev = '';
  if (currentId) {
    currentIdRev = currentId._rev;
  }
  workspaceDB.put({
    _id: 'currentId',
    _rev: currentIdRev,
    currentId: getCurrentWorkspaceId(),
  });
*/
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
      const cardId = getIdFromUrl(url);
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
          createdDate: cardBodyDoc.date,
          modifiedDate: cardBodyDoc.date,
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
}

export const mainStore = new MainStore();

const showErrorDialog = (label: MessageLabel, msg: string) => {
  dialog.showMessageBoxSync({
    type: 'error',
    buttons: ['OK'],
    message: MESSAGE(label) + '(' + msg + ')',
  });
};

// Utility for i18n
export const MESSAGE = (label: MessageLabel, ...args: string[]) => {
  let message: string = mainStore.info.messages[label];
  if (args) {
    args.forEach((replacement, index) => {
      const variable = '$' + (index + 1); // $1, $2, ...
      message = message.replace(variable, replacement);
    });
  }
  return message;
};