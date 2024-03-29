/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */

import path from 'path';
import os from 'os';
import { app } from 'electron';
import { notebookDbName } from './const';
import { Messages } from './i18n';

export const dataDirName = 'petasti_data';
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
let myOS: 'win32' | 'darwin' | 'linux' = 'win32';
if (process.platform === 'win32') {
  myOS = 'win32';
}
else if (process.platform === 'darwin') {
  myOS = 'darwin';
}
else {
  myOS = 'linux';
}
let defaultDataDirByOS = path.join(__dirname, `../../../../../../${dataDirName}`);
if (myOS !== 'win32') {
  defaultDataDirByOS = path.join(os.homedir(), dataDirName);
}
export const defaultDataDir = app.isPackaged
  ? defaultDataDirByOS
  : path.join(__dirname, `../../${dataDirName}`);
// export const defaultDataDir = 'C:\\Users\\kubota\\AppData\\Local\\petasti_data';

export const defaultLogDir = defaultDataDir + '/logs/';

export const defaultIndexDir = defaultDataDir + '/indexes/';

export const soundSrcDir = path.join(__dirname, `../../sounds_main/`);
export const defaultSoundDir = defaultDataDir + '/sounds/';

/**
 * Setting Dialog
 */
/**
 * Temporal State
 */
export type InfoState = {
  messages: Messages; // It is set and updated when 'settings.language' is changed.
  appinfo: AppInfo;
};

export type AppInfo = {
  name: string;
  version: string;
  iconDataURL: string;
};

/**
 * Persistent State
 */

export type SettingsState = {
  _id: string;
  version: string;
  language: string;
  dataStorePath: string;
  currentNoteId: string;
  currentNotebookName: string;
  saveZOrder: boolean;
  sync: {
    enabled: boolean;
    remoteUrl: string;
    connection: {
      type: 'github';
      personalAccessToken: string;
      private: boolean;
      engine: string;
    };
    interval: number;
    syncAfterChanges: boolean;
  };
};

export type SettingsDialogState = {
  info: InfoState;
  settings: SettingsState;
};

export const initialSettingsState: SettingsState = {
  _id: 'settings',
  version: '0.1',
  language: '',
  dataStorePath: defaultDataDir,
  currentNoteId: '',
  currentNotebookName: notebookDbName,
  saveZOrder: false,
  sync: {
    enabled: false,
    remoteUrl: '',
    connection: {
      type: 'github',
      personalAccessToken: '',
      private: true,
      engine: 'nodegit',
    },
    interval: 30000,
    syncAfterChanges: true,
  },
};

export type StoragePutAction = {
  type: 'storage-put';
  payload: { type: string; path: string };
};

export type LanguagePutAction = {
  type: 'language-put';
  payload: string;
};

export type PersistentSettingsAction = StoragePutAction | LanguagePutAction;

export type MessagesPutAction = {
  type: 'messages-put';
  payload: Messages;
};

export type AppPutAction = {
  type: 'app-put';
  payload: {
    name: string;
    version: string;
    iconDataURL: string;
  };
};

export type TemporalSettingsAction = MessagesPutAction | AppPutAction;

export type SettingsDialogAction = PersistentSettingsAction | TemporalSettingsAction;
