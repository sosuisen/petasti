/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import path from 'path';
import { app } from 'electron';
import { notebookDbName } from './const';
import { Messages } from './i18n';

export const dataDirName = 'tree_stickies_data';
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
export const defaultDataDir = app.isPackaged
  ? path.join(__dirname, `../../../../../../${dataDirName}`)
  : path.join(__dirname, `../../${dataDirName}`);

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
  language: string;
  dataStorePath: string;
  currentNoteId: string;
  currentNotebookName: string;
  sync: {
    enabled: boolean;
    remoteUrl: string;
    connection: {
      type: 'github';
      personalAccessToken: string;
      private: boolean;
    };
    interval: number;
  };
};

export type SettingsDialogState = {
  info: InfoState;
  settings: SettingsState;
};

export const initialSettingsState: SettingsState = {
  _id: 'settings',
  language: '',
  dataStorePath: defaultDataDir,
  currentNoteId: '',
  currentNotebookName: notebookDbName,
  sync: {
    enabled: false,
    remoteUrl: '',
    connection: {
      type: 'github',
      personalAccessToken: '',
      private: true,
    },
    interval: 30000,
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
