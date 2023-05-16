/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import { applyMiddleware, combineReducers, createStore } from 'redux';
import thunk, { ThunkDispatch, ThunkMiddleware } from 'redux-thunk';
import { InfoState } from '../modules_common/store.types';
import { ENGLISH } from '../modules_common/i18n';
import {
  DashboardAction,
  DashboardChangePageAction,
  DashboardPageState,
  DashboardSearchTextAction,
  DashboardSearchTextState,
  DashboardState,
  InfoAction,
  SearchResultNoteActions,
  SearchResultNoteAndCardActions,
  SearchResultNoteAndCardState,
  SearchResultNoteState,
  SelectedCardAction,
  SelectedCardState,
} from './dashboard_local.types';

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

const pageReducer = (
  // eslint-disable-next-line default-param-last
  state: DashboardPageState = {
    activeDashboardName: 'search',
    previousActiveDashboardName: '',
  },
  action: DashboardChangePageAction
) => {
  // eslint-disable-next-line default-case
  switch (action.type) {
    case 'dashboard-change-page':
      return {
        activeDashboardName: action.payload,
        previousActiveDashboardName: state.activeDashboardName,
      };
    default:
      return state;
  }
};

const searchTextReducer = (
  // eslint-disable-next-line default-param-last
  state: DashboardSearchTextState = {
    searchPageText: '',
    spacePageText: '',
  },
  action: DashboardSearchTextAction
) => {
  // eslint-disable-next-line default-case
  switch (action.type) {
    case 'dashboard-change-search-page-text':
      return {
        searchPageText: action.payload,
        spacePageText: state.spacePageText,
      };
    case 'dashboard-change-space-page-text':
      return {
        searchPageText: state.searchPageText,
        spacePageText: action.payload,
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
  page: pageReducer,
  searchText: searchTextReducer,
});

type IAppDispatch = ThunkDispatch<DashboardState, any, DashboardAction>;

export const dashboardStore = createStore(
  dashboardReducer,
  applyMiddleware<IAppDispatch, any>(
    thunk as ThunkMiddleware<IAppDispatch, DashboardAction, any>
  )
);
