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
import { CardProp } from '../modules_common/cardprop';
import { getIdFromUrl } from '../modules_common/avatar_url_utils';
import { generateId, getCurrentDateAndTime } from '../modules_common/utils';
import { NoteProp } from '../modules_common/schema_workspace';
import { Avatar, Geometry2D, GeometryXY } from '../modules_common/schema_avatar';
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
  English,
  JAPANESE,
  MessageLabel,
  Messages,
} from '../modules_common/i18n';
import { scheme, settingsDbName } from '../modules_common/const';

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
   * Store
   */
  private _notePropMap: { [_id: string]: NoteProp } = {};
  private _currentAvatarMap: { [url: string]: Avatar } = {};
  get currentAvatarMap (): { [url: string]: Avatar } {
    return this._currentAvatarMap;
  }

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
   * I18n
   */
  private _translations = translate(ENGLISH).supporting('ja', Japanese);
  get translations (): Translator<Messages> {
    return this._translations;
  }

  /**
   * loadNoteBook
   */
  // eslint-disable-next-line complexity
  loadNotebook = async () => {
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
        dbName: settingsDbName,
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
      return;
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

    // Create all collections by one line
    this._cardCollection = this._bookDB.collection('card');
    this._noteCollection = this._bookDB.collection('note');

    // Load note properties
    const noteDirList = await this._noteCollection.getCollections();
    for (const noteDir of noteDirList) {
      // eslint-disable-next-line no-await-in-loop
      const prop: NoteProp = (await noteDir.get('prop')) as NoteProp;
      const pathArr = noteDir.collectionPath.split('/'); // collectionPath is note/nXXXXXX/
      prop._id = pathArr[1]; // Set note id instead of 'prop'.
      this._notePropMap[prop._id] = prop;
    }

    await this.loadCurrentNote();

    // setSyncEvents();
  };

  getNotePropList = (): NoteProp[] => {
    return Object.values(this._notePropMap);
  };

  getCurrentNoteProp = () => {
    return this._notePropMap[this._settings.currentNoteId];
  };

  loadCurrentNote = async () => {
    // Create note if not exist.

    let createNoteFlag = false;
    if (Object.keys(this._notePropMap).length === 0) {
      createNoteFlag = true;
    }
    else if (
      this._settings.currentNoteId === undefined ||
      this._settings.currentNoteId === ''
    ) {
      const sortedNotePropList = Object.keys(this._notePropMap).sort((a, b) => {
        if (this._notePropMap[a].name > this._notePropMap[b].name) return 1;
        else if (this._notePropMap[a].name < this._notePropMap[b].name) return -1;
        return 0;
      });
      this._settings.currentNoteId = sortedNotePropList[0];
      await this._settingsDB.put(this._settings);
    }
    else if (this._notePropMap[this._settings.currentNoteId] === undefined) {
      createNoteFlag = true;
    }

    if (createNoteFlag) {
      const currentNoteProp = await this.createNote();
      // eslint-disable-next-line require-atomic-updates
      this._settings.currentNoteId = currentNoteProp._id;
      await this._settingsDB.put(this._settings);
    }

    console.log('# currentNoteId: ' + this._settings.currentNoteId);

    await this.loadCurrentAvatars();
  };

  createNote = async (name?: string): Promise<NoteProp> => {
    if (!name) {
      name = MESSAGE(
        'workspaceName',
        (Object.keys(this._notePropMap).length + 1).toString()
      );
    }
    const _id = 'w' + nanoid();
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

  // ! Operations for avatars

  /**
   * Avatar
   */
  loadCurrentAvatars = async (): Promise<void> => {
    const avatarDocs = await this._noteCollection.find({
      prefix: this._settings.currentNoteId + '/c',
    });
    for (const avatarDoc of avatarDocs) {
      const url = `${scheme}://local/${avatarDoc._id}`;
      const cardId = getIdFromUrl(url);
      // eslint-disable-next-line no-await-in-loop
      let cardDoc = await this._cardCollection.get(cardId);
      if (cardDoc === undefined) {
        const current = getCurrentDateAndTime();
        cardDoc = {
          _body: '',
          date: {
            createDate: current,
            modifiedDate: current,
          },
        };
      }
      const avatar: Avatar = {
        url,
        data: cardDoc._body,
        geometry: avatarDoc.geometry,
        style: avatarDoc.style,
        condition: avatarDoc.condition,
        date: {
          createdDate: cardDoc.date,
          modifiedDate: cardDoc.date,
        },
      };
      this._currentAvatarMap[url] = avatar;
    }
  };

  addNewAvatar = () => {
    /*
    const card = new Card('New');
    await card.loadOrCreateCardData().catch(e => {
      throw e;
    });
    const avatarLocs = Object.keys(card.prop.avatars);
    // eslint-disable-next-line require-atomic-updates
    avatarIdArray = [];
    avatarLocs.forEach(loc => {
      const _url = loc + card.prop.id;
      avatarIdArray.push(_url);
      getCurrentWorkspace()!.avatars.push(_url);
      CardIO.addAvatarUrl(getCurrentWorkspaceId(), _url);
    });

    cards.set(card.prop.id, card);
    await CardIO.updateOrCreateCardData(card.prop).catch((e: Error) => {
      console.error(e.message);
    });
    */
  };

  addAvatarUrl = async (workspaceId: string, avatarUrl: string) => {
    /*
  const wsObj: { _id: string; _rev: string } & Workspace = {
    _id: workspaceId,
    _rev: '',
    name: '',
    avatars: [avatarUrl],
  };
  await workspaceDB
    .get(workspaceId)
    .then(oldWS => {
      // Update existing card
      const { name, avatars } = (oldWS as unknown) as Workspace;
      wsObj._rev = oldWS._rev;
      wsObj.name = name;
      wsObj.avatars.push(...avatars);
    })
    .catch(e => {
      throw new Error(`Error in addAvatarUrl: ${e}`);
    });

  return workspaceDB
    .put(wsObj)
    .then(res => {
      console.debug(`Workspace saved: ${res.id}`);
    })
    .catch(e => {
      throw new Error(`Error in addAvatarUrl: ${e}`);
    });
    */
  };

  deleteAvatarUrl = async (workspaceId: string, avatarUrl: string) => {
    /*
  const wsObj: { _id: string; _rev: string } & Workspace = {
    _id: workspaceId,
    _rev: '',
    name: '',
    avatars: [],
  };
  const oldWS = await workspaceDB.get(workspaceId).catch(e => {
    throw new Error(`Error in deleteAvatarUrl get: ${e}`);
  });

  // Update existing card
  const { name, avatars } = (oldWS as unknown) as Workspace;
  wsObj._rev = oldWS._rev;
  wsObj.name = name;
  wsObj.avatars = avatars.filter(url => url !== avatarUrl);

  await workspaceDB.put(wsObj).catch(e => {
    throw new Error(`Error in deleteAvatarUrl put: ${e}`);
  });

  console.debug(`Delete avatar: ${avatarUrl}`);
*/
  };

  getCardIdList = (): Promise<string[]> => {
    // returns all card ids.

    return Promise.resolve([]);
    /*
  return new Promise((resolve, reject) => {
    cardDB
      .allDocs()
      .then(res => {
        resolve(res.rows.map(row => row.id));
      })
      .catch(err => {
        reject(err);
      });
  });
  */
  };

  deleteCardData = (id: string): Promise<string> => {
    // for debug
    // await sleep(60000);

    return Promise.resolve('');
    /*
  const card = await cardDB.get(id);
  await cardDB.remove(card).catch(e => {
    throw new Error(`Error in deleteCardData: ${e}`);
  });
  return id;
  */
  };

  getCardProp = (id: string): Promise<CardProp> => {
    // for debug
    // await sleep(60000);

    return Promise.resolve(new CardProp());
    /*
  return new Promise((resolve, reject) => {
    cardDB
      .get(id)
      .then(doc => {
        const propsRequired: CardPropSerializable = new CardProp('').toObject();
        // Check versions and compatibility
        let isFirstVersion = false;
        if (!Object.prototype.hasOwnProperty.call(doc, 'version')) {
          isFirstVersion = true;
        }

        if (isFirstVersion) {
          // The first version has no version property.
          propsRequired.version = '1.0';

          const { x, y, z, width, height } = (doc as unknown) as Geometry;
          const geometry: Geometry = { x, y, z, width, height };

          const {
            uiColor,
            backgroundColor,
            opacity,
            zoom,
          } = (doc as unknown) as CardStyle;
          const style: CardStyle = { uiColor, backgroundColor, opacity, zoom };

          const condition: CardCondition = {
            locked: false,
          };

          const { createdDate, modifiedDate } = (doc as unknown) as bookDate;
          const date: bookDate = { createdDate, modifiedDate };

          propsRequired.avatars[getCurrentWorkspaceUrl()] = new TransformableFeature(
            geometry,
            style,
            condition,
            date
          );
        }

        // Checking properties retrieved from database
        for (const key in propsRequired) {
          if (key === 'id') {
            // skip
            // pouchDB does not have id but has _id.
          }
          // Don't use doc.hasOwnProperty(key)
          // See eslint no-prototype-builtins
          else if (!Object.prototype.hasOwnProperty.call(doc, key)) {
            console.warn(`db entry id "${id}" lacks "${key}"`);
          }
          else {
            // Type of doc cannot be resolved by @types/pouchdb-core
            // @ts-ignore
            propsRequired[key] = doc[key];
          }
        }

        const prop = new CardProp(id);
        prop.data = propsRequired.data;
        prop.avatars = propsRequired.avatars;
        console.dir(prop.avatars);
        if (isFirstVersion) {
          this.updateOrCreateCardData(prop);
        }

        resolve(prop);
      })
      .catch(e => {
        reject(e);
      });
  });
*/
  };

  updateOrCreateCardData = (prop: CardProp): Promise<string> => {
    return Promise.resolve('');
    /*
  console.debug('Saving card...: ' + JSON.stringify(prop.toObject()));
  // In PouchDB, _id must be used instead of id in document.
  // Convert class to Object to serialize.
  const propObj = Object.assign({ _id: prop.id, _rev: '' }, prop.toObject());
  delete propObj.id;

  // for debug
  // await sleep(60000);

  await cardDB
    .get(prop.id)
    .then(oldCard => {
      // Update existing card
      propObj._rev = oldCard._rev;
    })
    .catch(() => {
      // Create new card
    });

  return cardDB
    .put(propObj)
    .then(res => {
      console.debug(`Saved: ${res.id}`);
      return res.id;
    })
    .catch(e => {
      throw new Error(`Error in updateOrCreatebookDate: ${e.message}`);
    });
    */
  };

  avatarUpdater = (action: PersistentStoreAction, reducer: (avatar: Avatar) => Avatar) => {
    const url: string = action.payload.url;
    /*
  const docRx: RxDocument = await rxdb.avatar.findOne(url).exec();
  if (docRx) {
    const avatarClone: Avatar = (docRx.toJSON() as unknown) as Avatar;
    const newAvatar: AvatarWithSkipForward = reducer(avatarClone) as AvatarWithSkipForward;
    newAvatar.skipForward = action.skipForward ?? false;
    await docRx.atomicPatch(newAvatar).catch(e => console.error(e));
  }
  else {
    console.error(`Error: ${url} does not exist in DB`);
  }
  */
  };

  avatarPositionUpdater = async (action: AvatarPositionUpdateAction) => {
    const updatedGeometry: GeometryXY = action.payload.geometry;
    await this.avatarUpdater(action, (avatar: Avatar) => {
      avatar.geometry.x = updatedGeometry.x ?? avatar.geometry.x;
      avatar.geometry.y = updatedGeometry.y ?? avatar.geometry.y;
      return avatar;
    });
  };

  avatarSizeUpdater = async (action: AvatarSizeUpdateAction) => {
    const updatedGeometry: Geometry2D = action.payload.geometry;
    await this.avatarUpdater(action, (avatar: Avatar) => {
      avatar.geometry.x = updatedGeometry.x ?? avatar.geometry.x;
      avatar.geometry.y = updatedGeometry.y ?? avatar.geometry.y;
      avatar.geometry.width = updatedGeometry.width ?? avatar.geometry.width;
      avatar.geometry.height = updatedGeometry.height ?? avatar.geometry.height;
      return avatar;
    });
  };

  avatarDepthUpdater = async (action: AvatarDepthUpdateAction) => {
    const updatedZ: number = action.payload.z;
    await this.avatarUpdater(action, (avatar: Avatar) => {
      avatar.geometry.z = updatedZ ?? avatar.geometry.z;
      return avatar;
    });
  };

  storeUpdater = async (action: PersistentStoreAction) => {
    switch (action.type) {
      case 'avatar-position-update': {
        await this.avatarPositionUpdater(action);
        break;
      }
      case 'avatar-size-update': {
        await this.avatarSizeUpdater(action);
        break;
      }
      case 'avatar-depth-update': {
        await this.avatarDepthUpdater(action);
        break;
      }
      default:
        break;
    }
  };

  closeDB = async () => {
    if (this._settingsDB !== undefined) {
      await this._settingsDB.close();
    }
    if (!this._bookDB) {
      return Promise.resolve();
    }
    return this._bookDB.close();
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
