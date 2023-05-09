import { AppPutAction, InfoState, MessagesPutAction } from './store.types';

/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
export interface DashboardInitAction {
  type: 'dashboard-init';
  payload: DashboardState;
}

export type SearchResultState = {
  list: SearchResult[];
  selected: number;
};

export type SearchResult = {
  type: 'note' | 'card';
  text: string;
};

export interface SearchResultShowAction {
  type: 'search-result-show';
  payload: SearchResult[];
}

export interface SearchResultSelectAction {
  type: 'search-result-select';
  payload: number;
}

export type SearchResultAction = SearchResultShowAction | SearchResultSelectAction;

export type DashboardState = {
  info: InfoState;
  searchResult: SearchResultState;
};

export type TemporalDashboardAction = MessagesPutAction | AppPutAction | SearchResultAction;

export type DashboardAction = DashboardInitAction | TemporalDashboardAction;
