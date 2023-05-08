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
};

export type SearchResult = {
  type: 'note' | 'card';
  text: string;
};

export interface SearchResultShowAction {
  type: 'search-result-show';
  payload: SearchResult[];
}

export type DashboardState = {
  info: InfoState;
  searchResult: SearchResultState;
};

export type TemporalDashboardAction =
  | MessagesPutAction
  | AppPutAction
  | SearchResultShowAction;

export type DashboardAction = DashboardInitAction | TemporalDashboardAction;
