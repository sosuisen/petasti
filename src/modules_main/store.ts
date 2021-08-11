/* eslint-disable dot-notation */
/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import path from 'path';
import { nanoid } from 'nanoid';

import { app, dialog, ipcMain, nativeImage } from 'electron';
import {
  Collection,
  DatabaseOptions,
  GitDocumentDB,
  RemoteOptions,
  Sync,
} from 'git-documentdb';
import { selectPreferredLanguage, translate } from 'typed-intl';
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
  dataDirName,
  defaultDataDir,
  InfoState,
  initialSettingsState,
  SettingsState,
} from '../modules_common/store.types';
import {
  availableLanguages,
  defaultLanguage,
  English,
  Japanese,
  MessageLabel,
} from '../modules_common/i18n';
import { scheme, settingsDbName } from '../modules_common/const';

/**
 * GitDocumentDB
 */
let bookDB: GitDocumentDB;
let settingsDB: GitDocumentDB;
let noteCollection: Collection;
let cardCollection: Collection;

/**
 * Sync
 */
const remoteUrl = '';
let sync: Sync | undefined;
let remoteOptions: RemoteOptions;
let settings: SettingsState = initialSettingsState;

export const getSettings = () => {
  return settings;
};

/**
 * Store
 */
export const notePropMap: { [_id: string]: NoteProp } = {};
export const currentAvatarMap: { [url: string]: Avatar } = {};

export const info: InfoState = {
  messages: English,
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

/**
 * I18n
 */
const translations = translate(English).supporting('ja', Japanese);

/**
 * loadNoteBook
 */
// eslint-disable-next-line complexity
export const loadNotebook = async () => {
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
  info.messages = translations.messages();

  // Open databases
  try {
    settingsDB = new GitDocumentDB({
      localDir: defaultDataDir,
      dbName: settingsDbName,
    });
    await settingsDB.open();

    const loadedSettings = ((await settingsDB.get('settings')) as unknown) as SettingsState;
    if (loadedSettings === undefined) {
      await settingsDB.put(settings);
    }
    else {
      settings = loadedSettings;
    }

    const bookDbOption: DatabaseOptions = {
      localDir: settings.dataStorePath,
      dbName: settings.currentNotebookName,
      schema: {
        json: {
          plainTextProperties: {
            name: true,
          },
        },
      },
    };

    bookDB = new GitDocumentDB(bookDbOption);

    const openResult = await bookDB.open();
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
      bookDB.author = author;
      // eslint-disable-next-line require-atomic-updates
      bookDB.committer = committer;
      bookDB.saveAuthor();
    }
    else {
      bookDB.loadAuthor();
      // eslint-disable-next-line require-atomic-updates
      bookDB.committer = bookDB.author;
    }

    if (settings.sync.remoteUrl && settings.sync.connection.personalAccessToken) {
      remoteOptions = {
        remoteUrl: settings.sync.remoteUrl,
        connection: settings.sync.connection,
        interval: settings.sync.interval,
        conflictResolutionStrategy: 'ours-diff',
        live: true,
      };
    }
  } catch (err) {
    showErrorDialog('databaseCreateError', err.message);
    console.log(err);
    app.exit();
  }

  if (!settingsDB || !bookDB) {
    return;
  }

  if (remoteOptions) {
    sync = await bookDB.sync(remoteOptions).catch(err => {
      showErrorDialog('syncError', err.message);
      return undefined;
    });
  }

  if (settings.language === '') {
    // eslint-disable-next-line require-atomic-updates
    settings.language = preferredLanguage;
  }

  /**
   * Set i18n from settings
   */
  selectPreferredLanguage(availableLanguages, [settings.language, defaultLanguage]);
  info.messages = translations.messages();

  // Create all collections by one line
  cardCollection = bookDB.collection('card');
  noteCollection = bookDB.collection('note');

  // Load note properties
  const noteDirList = await noteCollection.getCollections();
  for (const noteDir of noteDirList) {
    // eslint-disable-next-line no-await-in-loop
    const prop: NoteProp = (await noteDir.get('prop')) as NoteProp;
    prop._id = noteDir.collectionPath; // Set note id instead of 'prop'.
    notePropMap[prop._id] = prop;
  }

  await loadCurrentNote();

  // setSyncEvents();
};

export const getNotePropList = (): NoteProp[] => {
  return Object.values(notePropMap);
};

export const getCurrentNoteProp = () => {
  return notePropMap[settings.currentNoteId];
};

export const loadCurrentNote = async () => {
  // Create note if not exist.

  let createNoteFlag = false;
  if (Object.keys(notePropMap).length === 0) {
    createNoteFlag = true;
  }
  else if (settings.currentNoteId === undefined || settings.currentNoteId === '') {
    const sortedNotePropList = Object.keys(notePropMap).sort((a, b) => {
      if (notePropMap[a].name > notePropMap[b].name) return 1;
      else if (notePropMap[a].name < notePropMap[b].name) return -1;
      return 0;
    });
    settings.currentNoteId = sortedNotePropList[0];
    await settingsDB.put(settings);
  }
  else if (notePropMap[settings.currentNoteId] === undefined) {
    createNoteFlag = true;
  }

  if (createNoteFlag) {
    const currentNoteProp = await createNote();
    // eslint-disable-next-line require-atomic-updates
    settings.currentNoteId = currentNoteProp._id;
    await settingsDB.put(settings);
  }

  console.log('# currentNoteId: ' + settings.currentNoteId);

  await loadCurrentAvatars();
};

const createNote = async (name?: string): Promise<NoteProp> => {
  if (!name) {
    name = MESSAGE('workspaceName', (Object.keys(notePropMap).length + 1).toString());
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
  await noteCollection.put(newNote);

  return newNote;
};

export const updateWorkspace = async (workspaceId: string, note: NoteProp) => {
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

export const deleteWorkspace = async (workspaceId: string) => {
  /*
  const workspace = await workspaceDB.get(workspaceId);
  await workspaceDB.remove(workspace).catch(e => {
    throw new Error(`Error in deleteWorkspace: ${e}`);
  });
  */
};

export const updateWorkspaceStatus = async () => {
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
const loadCurrentAvatars = async (): Promise<void> => {
  const avatarDocs = await bookDB.find({
    prefix: settings.currentNoteId + '/c',
  });
  for (const avatarDoc of avatarDocs) {
    const url = `${scheme}://local/${avatarDoc._id}`;
    const cardId = getIdFromUrl(url);
    // eslint-disable-next-line no-await-in-loop
    let cardDoc = await cardCollection.get(cardId);
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
    currentAvatarMap[url] = avatar;
  }
};

const addNewAvatar = () => {
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

export const addAvatarUrl = async (workspaceId: string, avatarUrl: string) => {
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

export const deleteAvatarUrl = async (workspaceId: string, avatarUrl: string) => {
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

const getCardIdList = (): Promise<string[]> => {
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

export const deleteCardData = (id: string): Promise<string> => {
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

export const getCardProp = (id: string): Promise<CardProp> => {
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

export const updateOrCreateCardData = (prop: CardProp): Promise<string> => {
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

const avatarUpdater = (
  action: PersistentStoreAction,
  reducer: (avatar: Avatar) => Avatar
) => {
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

const avatarPositionUpdater = async (action: AvatarPositionUpdateAction) => {
  const updatedGeometry: GeometryXY = action.payload.geometry;
  await avatarUpdater(action, (avatar: Avatar) => {
    avatar.geometry.x = updatedGeometry.x ?? avatar.geometry.x;
    avatar.geometry.y = updatedGeometry.y ?? avatar.geometry.y;
    return avatar;
  });
};

const avatarSizeUpdater = async (action: AvatarSizeUpdateAction) => {
  const updatedGeometry: Geometry2D = action.payload.geometry;
  await avatarUpdater(action, (avatar: Avatar) => {
    avatar.geometry.x = updatedGeometry.x ?? avatar.geometry.x;
    avatar.geometry.y = updatedGeometry.y ?? avatar.geometry.y;
    avatar.geometry.width = updatedGeometry.width ?? avatar.geometry.width;
    avatar.geometry.height = updatedGeometry.height ?? avatar.geometry.height;
    return avatar;
  });
};

const avatarDepthUpdater = async (action: AvatarDepthUpdateAction) => {
  const updatedZ: number = action.payload.z;
  await avatarUpdater(action, (avatar: Avatar) => {
    avatar.geometry.z = updatedZ ?? avatar.geometry.z;
    return avatar;
  });
};

const storeUpdater = async (action: PersistentStoreAction) => {
  switch (action.type) {
    case 'avatar-position-update': {
      await avatarPositionUpdater(action);
      break;
    }
    case 'avatar-size-update': {
      await avatarSizeUpdater(action);
      break;
    }
    case 'avatar-depth-update': {
      await avatarDepthUpdater(action);
      break;
    }
    default:
      break;
  }
};

ipcMain.handle('persistent-store-dispatch', async (ev, action: PersistentStoreAction) => {
  console.debug(`Call storeUpdater() from Renderer process: ${action.type}`);
  await storeUpdater(action).catch(e => console.debug(e));
});

emitter.on('persistent-store-dispatch', async (action: PersistentStoreAction) => {
  console.debug(`Call storeUpdater() from Main process: ${action.type}`);
  await storeUpdater(action).catch(e => console.debug(e));
});

const showErrorDialog = (label: MessageLabel, msg: string) => {
  dialog.showMessageBoxSync({
    type: 'error',
    buttons: ['OK'],
    message: MESSAGE(label) + '(' + msg + ')',
  });
};

// Utility for i18n
export const MESSAGE = (label: MessageLabel, ...args: string[]) => {
  let message: string = info.messages[label];
  if (args) {
    args.forEach((replacement, index) => {
      const variable = '$' + (index + 1); // $1, $2, ...
      message = message.replace(variable, replacement);
    });
  }
  return message;
};

export const closeDB = async () => {
  if (settingsDB !== undefined) {
    await settingsDB.close();
  }
  if (!bookDB) {
    return Promise.resolve();
  }
  return bookDB.close();
};
