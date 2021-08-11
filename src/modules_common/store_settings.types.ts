/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */

import { English, Messages } from './i18n';

export const cardDirName = 'tree_stickies_data';

/**
 * Redux State
 * ! A key of the PersistentSettingsState (that is deserialized data) must be same as
 * ! a key of the electron-store (that is serialized data)
 */

export interface PersistentSettingsState {
  storage: {
    type: string;
    path: string;
  };
  navigationAllowedURLs: string[];
  language: string;
}

export interface TemporalSettingsState {
  messages: Messages; // It is set and updated when 'settings.language' is changed.
  app: {
    name: string;
    version: string;
    iconDataURL: string;
  };
}

export interface SettingsState {
  persistent: PersistentSettingsState; // serialized to storage
  temporal: TemporalSettingsState; // not serialized
}
export type PersistentSettingsStateKeys = keyof PersistentSettingsState;

/**
 * Redux Actions
 * ! 'type' for PersistentSettingsAction must be key of serialized data + '-put/-delete'
 */

export type StoragePutAction = {
  type: 'storage-put';
  payload: { type: string; path: string };
};

export type LanguagePutAction = {
  type: 'language-put';
  payload: string;
};

export type NavigationAllowedURLsPutAction = {
  type: 'navigationAllowedURLs-put';
  payload: string | string[];
};

export type NavigationAllowedURLsDeleteAction = {
  type: 'navigationAllowedURLs-delete';
  payload: string | string[];
};

export type PersistentSettingsAction =
  | StoragePutAction
  | LanguagePutAction
  | NavigationAllowedURLsPutAction
  | NavigationAllowedURLsDeleteAction;

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

export const initialPersistentSettingsState: PersistentSettingsState = {
  storage: {
    type: '',
    path: '',
  },
  navigationAllowedURLs: [],
  language: '',
};

export const initialTemporalSettingsState: TemporalSettingsState = {
  messages: English,
  app: {
    name: '',
    version: '',
    iconDataURL: '',
  },
};

export const initialSettingsState: SettingsState = {
  persistent: initialPersistentSettingsState,
  temporal: initialTemporalSettingsState,
};
