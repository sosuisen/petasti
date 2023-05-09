/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import { applyMiddleware, combineReducers, createStore } from 'redux';
import thunk, { ThunkDispatch, ThunkMiddleware } from 'redux-thunk';
import { InfoState } from '../modules_common/store.types';
import { InfoAction } from './action';
import { ENGLISH } from '../modules_common/i18n';
import {
  DashboardAction,
  DashboardState,
  SearchResultShowAction,
  SearchResultState,
} from '../modules_common/search.types';

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

const searchResultReducer = (
  // eslint-disable-next-line default-param-last
  state: SearchResultState = {
    list: [],
    selected: -1,
  },
  action: SearchResultShowAction
) => {
  switch (action.type) {
    case 'search-result-show':
      return {
        list: JSON.parse(JSON.stringify(action.payload)),
        selected: -1,
      };
    default:
      return state;
  }
};

export const dashboardReducer = combineReducers({
  info: infoReducer,
  searchResult: searchResultReducer,
});

type IAppDispatch = ThunkDispatch<DashboardState, any, DashboardAction>;

export const dashboardStore = createStore(
  dashboardReducer,
  applyMiddleware<IAppDispatch, any>(
    thunk as ThunkMiddleware<IAppDispatch, DashboardAction, any>
  )
);
