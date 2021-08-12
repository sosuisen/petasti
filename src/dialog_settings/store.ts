/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import { applyMiddleware, combineReducers, createStore } from 'redux';
import thunk from 'redux-thunk';
import { English } from '../modules_common/i18n';
import { InfoState, SettingsState } from '../modules_common/store.types';
import { InfoAction, SettingsAction } from './action';

const infoReducer = (
  // eslint-disable-next-line default-param-last
  state: InfoState = {
    messages: English,
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
      remoteUrl: '',
      connection: {
        type: 'github',
        personalAccessToken: '',
        private: true,
      },
      interval: 30000,
    },
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

export const settingsDialogStore = createStore(
  settingsDialogReducer,
  applyMiddleware(thunk)
);
