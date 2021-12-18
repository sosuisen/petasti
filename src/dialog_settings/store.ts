/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { applyMiddleware, combineReducers, createStore } from 'redux';
import thunk, { ThunkDispatch, ThunkMiddleware } from 'redux-thunk';
import { ENGLISH } from '../modules_common/i18n';
import {
  InfoState,
  SettingsDialogAction,
  SettingsDialogState,
  SettingsState,
} from '../modules_common/store.types';
import { InfoAction, SettingsAction } from './action';

const infoReducer = (
  // eslint-disable-next-line default-param-last
  state: InfoState = {
    messages: ENGLISH,
    appinfo: {
      name: '',
      version: '',
      iconDataURL: '',
    },
  },
  action: InfoAction
) => {
  switch (action.type) {
    case 'info-init':
      return JSON.parse(JSON.stringify(action.payload));
    default:
      return state;
  }
};

const settingsReducer = (
  // eslint-disable-next-line default-param-last
  state: SettingsState = {
    _id: 'settings',
    language: 'en',
    dataStorePath: '',
    currentNoteId: '',
    currentNotebookName: '',
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
    version: '0.1',
  },
  action: SettingsAction
) => {
  switch (action.type) {
    case 'settings-init':
      return JSON.parse(JSON.stringify(action.payload));
    case 'settings-language-update': {
      const newState = JSON.parse(JSON.stringify(state));
      newState.language = action.payload;
      return newState;
    }
    case 'settings-sync-enabled-update': {
      const newState = JSON.parse(JSON.stringify(state));
      newState.sync.enabled = action.payload;
      return newState;
    }
    case 'settings-sync-remote-url-update': {
      const newState = JSON.parse(JSON.stringify(state));
      newState.sync.remote_url = action.payload;
      return newState;
    }
    case 'settings-sync-personal-access-token-update': {
      const newState = JSON.parse(JSON.stringify(state));
      newState.sync.connection.personal_access_token = action.payload;
      return newState;
    }
    case 'settings-sync-interval-update': {
      const newState = JSON.parse(JSON.stringify(state));
      newState.sync.interval = action.payload;
      return newState;
    }
    default:
      return state;
  }
};

export const settingsDialogReducer = combineReducers({
  info: infoReducer,
  settings: settingsReducer,
});

type IAppDispatch = ThunkDispatch<SettingsDialogState, any, SettingsDialogAction>;

export const settingsDialogStore = createStore(
  settingsDialogReducer,
  applyMiddleware<IAppDispatch, any>(
    thunk as ThunkMiddleware<IAppDispatch, SettingsDialogAction, any>
  )
);
