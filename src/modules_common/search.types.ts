import { JsonDoc } from 'git-documentdb';
import { AppPutAction, InfoState, MessagesPutAction } from './store.types';

/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
export interface DashboardInitAction {
  type: 'dashboard-init';
  payload: DashboardState;
}

export type SearchResultNoteAndCardState = {
  list: SearchResult[];
  selected: number;
};

export type SearchResultNoteState = {
  list: SearchResult[];
  selected: number;
};

export type SearchResult = {
  type: 'note' | 'card';
  text: string;
  url: string;
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

export interface SearchResultNoteAction {
  type: 'search-result-note';
  payload: SearchResult[];
}

export interface SearchResultSelectNoteAction {
  type: 'search-result-select-note';
  payload: number;
}

export type SearchResultNoteActions = SearchResultNoteAction | SearchResultSelectNoteAction;

export type SearchResultAction = SearchResultNoteAndCardActions | SearchResultNoteActions;

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

export type DashboardState = {
  info: InfoState;
  searchResultNoteAndCard: SearchResultNoteAndCardState;
  searchResultNote: SearchResultNoteState;
  selectedCard: SelectedCardState;
};

export type TemporalDashboardAction =
  | MessagesPutAction
  | AppPutAction
  | SearchResultAction
  | SelectedCardAction;

export type DashboardAction = DashboardInitAction | TemporalDashboardAction;
