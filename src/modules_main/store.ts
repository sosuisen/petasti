/* eslint-disable dot-notation */
/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import path from 'path';
import { nanoid } from 'nanoid';

import { app, dialog, ipcMain } from 'electron';
import {
  Collection,
  DatabaseOptions,
  GitDocumentDB,
  RemoteOptions,
  Sync,
} from 'git-documentdb';
import { CardProp } from '../modules_common/cardprop';
import { MESSAGE } from './store_settings';
import { getIdFromUrl } from '../modules_common/avatar_url_utils';
import { generateId, getCurrentDateAndTime } from '../modules_common/utils';
import { NoteProp } from '../modules_common/schema_workspace';
import { Avatar, Geometry2D, GeometryXY } from '../modules_common/schema_avatar';
import { avatarWindows, createAvatarWindows, setZIndexOfTopAvatar } from './avatar_window';
import {
  AvatarDepthUpdateAction,
  AvatarPositionUpdateAction,
  AvatarSizeUpdateAction,
  PersistentStoreAction,
} from '../modules_common/actions';
import { emitter } from './event';
import { dataDirName, SettingsState2 } from '../modules_common/store_settings.types';
import { MessageLabel } from '../modules_common/i18n';
import { scheme } from '../modules_common/const';

/**
 * Default data directory
 *
 * settingsDB is created in defaultDataDir.
 * inventoryDB is created in settings.dataStorePath. (Default is defaultDataDir.)
 *
 * - '../../../../../../inventory_manager_data' is default path when using asar created by squirrels.windows.
 * - './inventory_manager_data' is default path when starting from command line (npm start).
 * - They can be distinguished by using app.isPackaged
 *
 * TODO: Default path for Mac / Linux is needed.
 */
const defaultDataDir = app.isPackaged
  ? path.join(__dirname, `../../../../../${dataDirName}`)
  : path.join(__dirname, `../${dataDirName}`);

let bookDB: GitDocumentDB;
let settingsDB: GitDocumentDB;
let noteCollection: Collection;
let cardCollection: Collection;

export const notePropMap: { [_id: string]: NoteProp } = {};
export const currentAvatarMap: { [url: string]: Avatar } = {};

/**
 * GitDocumentDB
 */
const notebookDbName = 'book001';
const settingsDbName = 'local_settings';
const WORKSPACE_VERSION = 0;

/**
 * Sync
 */
const remoteUrl = '';
let sync: Sync;
let remoteOptions: RemoteOptions;
let settings: SettingsState2 = {
  _id: 'settings',
  language: '',
  dataStorePath: defaultDataDir,
  currentNoteId: '',
  currentNotebookName: notebookDbName,
  sync: {
    remoteUrl: '',
    connection: {
      type: 'github',
      personalAccessToken: '',
      private: true,
    },
    interval: 30000,
  },
};

export const openDB = async () => {
  // Open databases
  try {
    settingsDB = new GitDocumentDB({
      localDir: defaultDataDir,
      dbName: settingsDbName,
    });
    await settingsDB.open();

    const loadedSettings = ((await settingsDB.get(
      'settings'
    )) as unknown) as SettingsState2;
    if (loadedSettings === undefined) {
      await settingsDB.put(settings);
    }
    else {
      settings = loadedSettings;
    }

    const dbOption: DatabaseOptions = {
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

    bookDB = new GitDocumentDB(dbOption);

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
  } catch (err) {
    showErrorDialog('databaseCreateError', err.message);
    console.log(err);
    app.exit();
  }

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
};

export const closeDB = () => {
  if (!bookDB) {
    return Promise.resolve();
  }
  return bookDB.close();
};

export const prepareDbSync = () => {
  // sync
  console.log('DatabaseService: sync');
  /*
  if (settings.sync.remoteUrl && settings.sync.connection.personalAccessToken) {
    remoteOptions = {
      remoteUrl: settings.sync.remoteUrl,
      connection: settings.sync.connection,
      interval: settings.sync.interval,
      conflictResolutionStrategy: 'ours-diff',
      live: true,
    };
  }
  sync = await bookDB.sync(remoteOptions);
*/
  /**
   * Forwarding Observer
   */
  /*
    cardCollection.onSyncEvent(sync, 'localChange', (changedFiles: ChangedFile[]) => {
      const avatar: Avatar = (changeEvent.documentData as unknown) as Avatar;
      avatarWindows.get(avatar.url)!.reactiveForwarder({
        state: avatar,
      });
    });
    
    noteCollection.onSyncEvent(sync, 'localChange', (changedFiles: ChangedFile[]) => {
      const avatar: Avatar = (changeEvent.documentData as unknown) as Avatar;
      avatarWindows.get(avatar.url)!.reactiveForwarder({
        state: avatar,
      });
    });
    */
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

  await createAvatarWindows(Object.values(currentAvatarMap));

  const backToFront = Object.values(currentAvatarMap).sort((a, b) => {
    if (a.geometry.z < b.geometry.z) {
      return -1;
    }
    else if (a.geometry.z > b.geometry.z) {
      return 1;
    }
    return 0;
  });

  let zIndexOfTopAvatar = 0;
  backToFront.forEach(avatar => {
    const avatarWin = avatarWindows.get(avatar.url);
    if (avatarWin && !avatarWin.window.isDestroyed()) {
      avatarWin.window.moveTop();
      zIndexOfTopAvatar = avatar.geometry.z;
    }
  });
  setZIndexOfTopAvatar(zIndexOfTopAvatar);

  const size = Object.keys(currentAvatarMap).length;
  console.debug(`Completed to load ${size} cards`);

  if (size === 0) {
    addNewAvatar();
    console.debug(`Added initial card`);
  }
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
export const loadCurrentAvatars = async (): Promise<void> => {
  const avatarDocs = await bookDB.find({
    prefix: settings.currentNoteId + '/c',
  });
  for (const avatarDoc of avatarDocs) {
    const url = `${scheme}://local/${avatarDoc._id}`;
    const cardId = getIdFromUrl(url);
    // eslint-disable-next-line no-await-in-loop
    const cardDoc = await cardCollection.get(cardId);
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

export const exportJSON = (filepath: string) => {
  /*
  const cardIdMap: Record<string, string> = {};
  const cardObj = (await cardDB.allDocs({ include_docs: true })).rows.reduce(
    (obj, row) => {
      const newID = 'c' + nanoid();
      cardIdMap[row.id] = newID;
      obj[newID] = row.doc;
      delete obj[newID]._id;
      delete obj[newID]._rev;
      return obj;
    },
    {} as { [id: string]: any }
  );

  const workspaceObj: Record<string, any> = {};
  workspaceObj.version = 0;
  workspaceObj.spaces = (await workspaceDB.allDocs({ include_docs: true })).rows
    .filter(row => row.id !== 'currentId')
    .map(row => {
      const doc = (row.doc as unknown) as Record<
        string,
        string | string[] | number | Record<string, string>
      >;
      const newID = 'w' + nanoid();
      doc.id = newID;
      delete doc._id;
      delete doc._rev;

      const current = getCurrentDateAndTime();
      doc.date = {
        createdDate: current,
        modifiedDate: current,
      };
      doc.version = 0;

      if (row.doc) {
        const avatars = doc.avatars as string[];
        if (avatars) {
          const newAvatarArray = avatars.map(url => {
            const cardId = cardIdMap[getIdFromUrl(url)];

            const oldLocation = getLocationFromUrl(url);
            const newURL = `rxdesktop://local/ws/${newID}/${cardId}/${nanoid(5)}`;

            // @ts-ignore
            const newAvatar = cardObj[cardId].avatars[oldLocation];
            newAvatar.url = newURL;
            return newAvatar;
          });
          doc.avatars = newAvatarArray;
        }
      }
      return doc;
    });

  for (const id in cardObj) {
    cardObj[id].user = 'local';
    cardObj[id].version = 0;
    const current = getCurrentDateAndTime();
    cardObj[id].date = {
      createdDate: current,
      modifiedDate: current,
    };
    for (const url in cardObj[id].avatars) {
      cardObj[id].date = cardObj[id].avatars[url].date;
    }
    cardObj[id].type = 'text/html';
    delete cardObj[id].avatars;
  }

  const newCardObj: Record<string, any> = {};
  newCardObj.version = 0;

  const cardArray = [];
  for (const id in cardObj) {
    cardObj[id].id = id;
    cardArray.push(cardObj[id]);
  }
  newCardObj.cards = cardArray;

  const dataObj = {
    workspace: workspaceObj,
    card: newCardObj,
  };
  fs.writeJSON(filepath, dataObj, { spaces: 2 });
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
