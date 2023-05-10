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
  SearchResultAction,
  SearchResultNoteActions,
  SearchResultNoteAndCardActions,
  SearchResultNoteAndCardState,
  SearchResultNoteState,
  SelectedCardAction,
  SelectedCardState,
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

const searchResultNoteAndCardReducer = (
  // eslint-disable-next-line default-param-last
  state: SearchResultNoteAndCardState = {
    list: [],
    selected: -1,
  },
  action: SearchResultNoteAndCardActions
) => {
  switch (action.type) {
    case 'search-result-note-and-card':
      return {
        list: JSON.parse(JSON.stringify(action.payload)),
        selected: -1,
      };
    case 'search-result-select-note-and-card': {
      const newState = JSON.parse(JSON.stringify(state));
      newState.selected = action.payload;
      return newState;
    }
    default:
      return state;
  }
};

const searchResultNoteReducer = (
  // eslint-disable-next-line default-param-last
  state: SearchResultNoteState = {
    list: [],
    selected: -1,
    prevSelected: -1,
  },
  action: SearchResultNoteActions
) => {
  switch (action.type) {
    case 'search-result-note':
      return {
        list: JSON.parse(JSON.stringify(action.payload.list)),
        selected: action.payload.selected,
        prevSelected: state.prevSelected,
      };
    case 'search-result-select-note': {
      const newState = JSON.parse(JSON.stringify(state));
      newState.selected = action.payload;
      newState.prevSelected = state.selected;
      return newState;
    }
    default:
      return state;
  }
};

const selectedCardReducer = (
  // eslint-disable-next-line default-param-last
  state: SelectedCardState = {
    card: {},
    refs: [],
  },
  action: SelectedCardAction
) => {
  // eslint-disable-next-line default-case
  switch (action.type) {
    case 'set-selected-card':
      return {
        card: JSON.parse(JSON.stringify(action.payload)),
        refs: [],
      };
    case 'set-selected-card-reference':
      return {
        card: JSON.parse(JSON.stringify(state.card)),
        refs: JSON.parse(JSON.stringify(action.payload)),
      };
    default:
      return state;
  }
};

export const dashboardReducer = combineReducers({
  info: infoReducer,
  searchResultNoteAndCard: searchResultNoteAndCardReducer,
  searchResultNote: searchResultNoteReducer,
  selectedCard: selectedCardReducer,
});

type IAppDispatch = ThunkDispatch<DashboardState, any, DashboardAction>;

export const dashboardStore = createStore(
  dashboardReducer,
  applyMiddleware<IAppDispatch, any>(
    thunk as ThunkMiddleware<IAppDispatch, DashboardAction, any>
  )
);
