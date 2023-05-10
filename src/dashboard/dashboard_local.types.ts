/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */

import { JsonDoc } from 'git-documentdb';
import { AppPutAction, InfoState, MessagesPutAction } from '../modules_common/store.types';

/**
 * SearchResultNoteAndCardState
 */
export type SearchResultNoteAndCardState = {
  list: SearchResult[];
  selected: number;
};

export interface SearchResultNoteAndCardAction {
  type: 'search-result-note-and-card';
  payload: SearchResult[];
}

export interface SearchResultSelectNoteAndCardAction {
  type: 'search-result-select-note-and-card';
  payload: number;
}

export type SearchResultNoteAndCardActions =
  | SearchResultNoteAndCardAction
  | SearchResultSelectNoteAndCardAction;

/**
 * SearchResultNoteState
 */
export type SearchResultNoteState = {
  list: SearchResult[];
  selected: number;
  prevSelected: number;
};

export interface SearchResultNoteAction {
  type: 'search-result-note';
  payload: {
    list: SearchResult[];
    selected: number;
  };
}

export interface SearchResultSelectNoteAction {
  type: 'search-result-select-note';
  payload: number;
}

export type SearchResultNoteActions = SearchResultNoteAction | SearchResultSelectNoteAction;

/**
 * SearchResult Common
 */
export type SearchResult = {
  type: 'note' | 'card';
  text: string;
  url: string;
};

export type SearchResultAction = SearchResultNoteAndCardActions | SearchResultNoteActions;

/**
 * SelectedCardState
 */
export type CardReference = {
  noteName: string;
  url: string;
};

export type SelectedCardState = {
  card: JsonDoc;
  refs: CardReference[];
};

export interface SelectedCardSetAction {
  type: 'set-selected-card';
  payload: JsonDoc;
}
export interface SelectedCardReferenceSetAction {
  type: 'set-selected-card-reference';
  payload: string[];
}

export type SelectedCardAction = SelectedCardSetAction | SelectedCardReferenceSetAction;

/**
 * DashboardPageState
 */
export type DashboardChangePageAction = {
  type: 'dashboard-change-page';
  payload: string;
};

export type DashboardPageState = {
  activeDashboardName: string;
  previousActiveDashboardName: string;
};

/**
 * InfoState
 */
export interface InfoInitAction {
  type: 'info-init';
  payload: InfoState;
}

export type InfoAction = InfoInitAction;

/**
 * DashboardState
 */
export interface DashboardInitAction {
  type: 'dashboard-init';
  payload: DashboardState;
}

export type DashboardState = {
  info: InfoState;
  searchResultNoteAndCard: SearchResultNoteAndCardState;
  searchResultNote: SearchResultNoteState;
  selectedCard: SelectedCardState;
  page: DashboardPageState;
};

export type DashboardAction =
  | DashboardInitAction
  | MessagesPutAction
  | AppPutAction
  | SearchResultAction
  | SelectedCardAction
  | DashboardChangePageAction;
